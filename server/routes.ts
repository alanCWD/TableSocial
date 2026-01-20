import type { Express } from "express";
import { db } from "./db.js";
import { chefs, hosts, events, venues, aiIngestions, cachedAiEvents } from "../shared/schema.js";
import { eq, and, gte, desc, lt } from "drizzle-orm";
import { isAuthenticated } from "./replit_integrations/auth/index.js";
import { GoogleGenAI, Type } from "@google/genai";
import { generateSlug, generateEventJsonLd, generateChefJsonLd, generateHostJsonLd } from "./utils/slug.js";
import { persistAiDiscoveries } from "./services/aiIngestion.js";
import { searchInstagramHashtags, testInstagramConnection } from "./services/instagramDiscovery.js";

// Known closed venues that should be rejected (exact match on full name or word boundaries)
const CLOSED_VENUES = [
  "olo restaurant",
  "olo victoria",
];

// Known brand/product names that identify events (whisky brands, chef names, etc.)
const BRAND_TOKENS = [
  "highland park", "inchdairnie", "bearface", "macaloney", "macaloneys",
  "ito", "castro", "small gods", "galentine", "galentines",
  "noble brews", "wilderness series"
];

// Invalid titles that are likely parsing errors or website names
const INVALID_TITLE_PATTERNS = [
  /^[a-z0-9]+\.(com|ca|org|net|io)$/i,  // Just a domain name
  /^eventbrite/i,
  /^showpass/i,
  /^wanderlog/i,
  /^facebook/i,
  /^instagram/i,
  /^google/i,
  /^https?:\/\//i,  // URL as title
  /^www\./i,
];

// Words to remove when extracting signature tokens
const GENERIC_WORDS = [
  "dinner", "dinners", "pairing", "pairings", "whisky", "whiskey", "wine", "wines",
  "course", "courses", "experience", "experiences", "night", "evening",
  "long", "table", "tables", "sip", "dine", "dining", "toast", "celebration",
  "at", "the", "a", "an", "with", "for", "of", "&", "and", "x", "vs"
];

// Venue name tokens to remove from title comparisons
const VENUE_TOKENS = [
  "fathom", "vista", "hob", "hotel grand pacific", "fairmont", "empress",
  "chateau victoria", "restaurant", "fine foods"
];

/**
 * Extract signature tokens from a title for fuzzy matching
 * Returns: { brandToken, venueToken, normalizedCore }
 */
function extractEventSignature(title: string): { brandToken: string | null, venueToken: string | null, normalizedCore: string } {
  let normalized = title.toLowerCase()
    .replace(/&amp;/g, '&')
    .replace(/['']s/g, 's')  // "Macaloney's" -> "macaloneys"
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Normalize whisky/whiskey
  normalized = normalized.replace(/whiskey/g, 'whisky');
  
  // Find brand token
  let brandToken: string | null = null;
  for (const brand of BRAND_TOKENS) {
    if (normalized.includes(brand)) {
      brandToken = brand;
      break;
    }
  }
  
  // Find venue token
  let venueToken: string | null = null;
  for (const venue of VENUE_TOKENS) {
    if (normalized.includes(venue)) {
      venueToken = venue;
      break;
    }
  }
  
  // Remove generic words and venue tokens to get the core signature
  let words = normalized.split(' ');
  words = words.filter(w => 
    !GENERIC_WORDS.includes(w) && 
    !VENUE_TOKENS.includes(w) &&
    w.length > 1
  );
  
  const normalizedCore = words.join(' ');
  
  return { brandToken, venueToken, normalizedCore };
}

/**
 * Parse a date string and return a Date object
 */
function parseEventDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if two dates are within N days of each other
 */
function areDatesClose(date1: Date | null, date2: Date | null, maxDaysDiff: number = 1): boolean {
  if (!date1 || !date2) return false;
  const diffMs = Math.abs(date1.getTime() - date2.getTime());
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= maxDaysDiff;
}

/**
 * Score a source URL for authoritativeness (higher = more trusted)
 */
function scoreSourceUrl(url: string | null): number {
  if (!url) return 0;
  const urlLower = url.toLowerCase();
  
  // Ticketing platforms are most authoritative
  if (urlLower.includes('showpass.com')) return 100;
  if (urlLower.includes('eventbrite')) return 90;
  if (urlLower.includes('do250.com')) return 85;
  
  // Official venue/business sites
  if (urlLower.includes('hobfinefoods')) return 80;
  if (urlLower.includes('hotelgrandpacific')) return 80;
  if (urlLower.includes('fairmont')) return 80;
  
  // Tourism/directory sites
  if (urlLower.includes('tourismvictoria')) return 50;
  
  // Google grounding redirect URLs are least reliable
  if (urlLower.includes('vertexaisearch.cloud.google.com')) return 10;
  
  return 30;
}

/**
 * Check if venue is known to be closed
 * Uses word boundary matching to avoid false positives (e.g., "Apollo" matching "olo")
 */
function isClosedVenue(venueName: string | null): boolean {
  if (!venueName) return false;
  const normalized = venueName.toLowerCase().trim();
  
  // Check for exact match or word-boundary match
  return CLOSED_VENUES.some(closed => {
    // Exact match
    if (normalized === closed) return true;
    
    // Word boundary match: closed venue name appears as complete word(s)
    const pattern = new RegExp(`\\b${closed.replace(/\s+/g, '\\s+')}\\b`, 'i');
    return pattern.test(normalized);
  });
}

/**
 * Check if title is invalid (likely a parsing error)
 */
function isInvalidTitle(title: string | null): boolean {
  if (!title || title.trim().length < 5) return true;
  const trimmed = title.trim();
  return INVALID_TITLE_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Deduplicate and merge events with similar signatures
 * Returns unique events with best data from merged duplicates
 */
function deduplicateEvents(eventList: any[]): any[] {
  // First, filter out invalid titles
  const validEvents = eventList.filter(ev => !isInvalidTitle(ev.title));
  
  // Group events by brand first (to catch date variations within same brand)
  const brandGroups = new Map<string, any[]>();
  const unbrandedEvents: any[] = [];
  
  for (const ev of validEvents) {
    const signature = extractEventSignature(ev.title);
    const date = parseEventDate(ev.date);
    const eventWithMeta = { ...ev, _signature: signature, _date: date };
    
    if (signature.brandToken) {
      const brandKey = signature.brandToken;
      if (!brandGroups.has(brandKey)) {
        brandGroups.set(brandKey, []);
      }
      brandGroups.get(brandKey)!.push(eventWithMeta);
    } else {
      unbrandedEvents.push(eventWithMeta);
    }
  }
  
  const result: any[] = [];
  
  // Process branded events - group by exact date (same day only)
  // This preserves consecutive-night events from the same brand/venue
  for (const [brand, candidates] of brandGroups) {
    // Sub-group by exact date (same day only, no tolerance)
    const dateSubgroups: any[][] = [];
    
    for (const candidate of candidates) {
      let addedToGroup = false;
      for (const subgroup of dateSubgroups) {
        // Check if this candidate's date is exactly the same day
        if (areDatesClose(candidate._date, subgroup[0]._date, 0)) {
          subgroup.push(candidate);
          addedToGroup = true;
          break;
        }
      }
      if (!addedToGroup) {
        dateSubgroups.push([candidate]);
      }
    }
    
    // For each date subgroup, pick the best event
    for (const subgroup of dateSubgroups) {
      // Sort by source URL authoritativeness
      subgroup.sort((a, b) => scoreSourceUrl(b.sourceUrl) - scoreSourceUrl(a.sourceUrl));
      
      const best = subgroup[0];
      const allSources = subgroup
        .map(ev => ev.sourceUrl)
        .filter((url, idx, arr) => url && arr.indexOf(url) === idx);
      
      delete best._signature;
      delete best._date;
      best.allSourceUrls = allSources;
      
      result.push(best);
    }
  }
  
  // Process unbranded events - use normalized core + exact date
  const unbrandedGroups = new Map<string, any[]>();
  
  for (const ev of unbrandedEvents) {
    const dateKey = ev._date 
      ? `${ev._date.getMonth()}-${ev._date.getDate()}-${ev._date.getFullYear()}` 
      : 'unknown';
    const groupKey = ev._signature.normalizedCore.substring(0, 20) + `|${dateKey}`;
    
    if (!unbrandedGroups.has(groupKey)) {
      unbrandedGroups.set(groupKey, []);
    }
    unbrandedGroups.get(groupKey)!.push(ev);
  }
  
  for (const [key, candidates] of unbrandedGroups) {
    candidates.sort((a, b) => scoreSourceUrl(b.sourceUrl) - scoreSourceUrl(a.sourceUrl));
    
    const best = candidates[0];
    const allSources = candidates
      .map(ev => ev.sourceUrl)
      .filter((url, idx, arr) => url && arr.indexOf(url) === idx);
    
    delete best._signature;
    delete best._date;
    best.allSourceUrls = allSources;
    
    result.push(best);
  }
  
  return result;
}

export function registerApiRoutes(app: Express): void {
  app.get("/api/events", async (req, res) => {
    try {
      const location = req.query.location as string;
      const allEvents = await db
        .select()
        .from(events)
        .where(eq(events.status, "published"))
        .orderBy(desc(events.createdAt));
      
      const eventsWithRelations = await Promise.all(
        allEvents.map(async (event) => {
          const chef = event.chefId
            ? (await db.select().from(chefs).where(eq(chefs.id, event.chefId)))[0]
            : null;
          const venue = event.venueId
            ? (await db.select().from(venues).where(eq(venues.id, event.venueId)))[0]
            : null;
          return { ...event, chef, venue };
        })
      );
      
      res.json(eventsWithRelations);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.get("/api/chefs", async (req, res) => {
    try {
      const allChefs = await db.select().from(chefs).orderBy(desc(chefs.createdAt));
      res.json(allChefs);
    } catch (error) {
      console.error("Error fetching chefs:", error);
      res.status(500).json({ error: "Failed to fetch chefs" });
    }
  });

  app.get("/api/chefs/:id", async (req, res) => {
    try {
      const [chef] = await db.select().from(chefs).where(eq(chefs.id, req.params.id));
      if (!chef) {
        return res.status(404).json({ error: "Chef not found" });
      }
      res.json(chef);
    } catch (error) {
      console.error("Error fetching chef:", error);
      res.status(500).json({ error: "Failed to fetch chef" });
    }
  });

  app.get("/api/chef/:slug", async (req, res) => {
    try {
      const [chef] = await db.select().from(chefs).where(eq(chefs.slug, req.params.slug));
      if (!chef) {
        return res.status(404).json({ error: "Chef not found" });
      }
      const chefEvents = await db.select().from(events)
        .where(and(eq(events.chefId, chef.id), eq(events.status, "published")))
        .orderBy(desc(events.date));
      const jsonLd = generateChefJsonLd(chef);
      res.json({ ...chef, events: chefEvents, jsonLd });
    } catch (error) {
      console.error("Error fetching chef by slug:", error);
      res.status(500).json({ error: "Failed to fetch chef" });
    }
  });

  app.get("/api/event/:slug", async (req, res) => {
    try {
      const [event] = await db.select().from(events).where(eq(events.slug, req.params.slug));
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      const chef = event.chefId
        ? (await db.select().from(chefs).where(eq(chefs.id, event.chefId)))[0]
        : null;
      const venue = event.venueId
        ? (await db.select().from(venues).where(eq(venues.id, event.venueId)))[0]
        : null;
      const jsonLd = generateEventJsonLd({
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        price: event.price,
        imageUrl: event.imageUrl,
        venueName: venue?.name,
        venueAddress: venue?.fullAddress,
        chefName: chef?.name,
        sourceUrls: event.sourceUrls as string[] | null,
      });
      res.json({ ...event, chef, venue, jsonLd });
    } catch (error) {
      console.error("Error fetching event by slug:", error);
      res.status(500).json({ error: "Failed to fetch event" });
    }
  });

  app.post("/api/admin/chefs", isAuthenticated, async (req, res) => {
    try {
      const slug = req.body.slug || generateSlug(req.body.name);
      const [chef] = await db.insert(chefs).values({ ...req.body, slug }).returning();
      res.json(chef);
    } catch (error) {
      console.error("Error creating chef:", error);
      res.status(500).json({ error: "Failed to create chef" });
    }
  });

  app.put("/api/admin/chefs/:id", isAuthenticated, async (req, res) => {
    try {
      const updateData = { ...req.body, updatedAt: new Date() };
      if (updateData.publishedAt && typeof updateData.publishedAt === 'string') {
        updateData.publishedAt = new Date(updateData.publishedAt);
      }
      const [chef] = await db
        .update(chefs)
        .set(updateData)
        .where(eq(chefs.id, req.params.id))
        .returning();
      res.json(chef);
    } catch (error) {
      console.error("Error updating chef:", error);
      res.status(500).json({ error: "Failed to update chef" });
    }
  });

  app.delete("/api/admin/chefs/:id", isAuthenticated, async (req, res) => {
    try {
      await db.delete(chefs).where(eq(chefs.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting chef:", error);
      res.status(500).json({ error: "Failed to delete chef" });
    }
  });

  // Hosts (Drink Specialists) Routes
  app.get("/api/hosts", async (req, res) => {
    try {
      const allHosts = await db.select().from(hosts).orderBy(desc(hosts.createdAt));
      res.json(allHosts);
    } catch (error) {
      console.error("Error fetching hosts:", error);
      res.status(500).json({ error: "Failed to fetch hosts" });
    }
  });

  app.get("/api/hosts/:id", async (req, res) => {
    try {
      const [host] = await db.select().from(hosts).where(eq(hosts.id, req.params.id));
      if (!host) {
        return res.status(404).json({ error: "Host not found" });
      }
      res.json(host);
    } catch (error) {
      console.error("Error fetching host:", error);
      res.status(500).json({ error: "Failed to fetch host" });
    }
  });

  app.get("/api/host/:slug", async (req, res) => {
    try {
      const [host] = await db.select().from(hosts).where(eq(hosts.slug, req.params.slug));
      if (!host) {
        return res.status(404).json({ error: "Host not found" });
      }
      const hostEvents = await db.select().from(events)
        .where(and(eq(events.hostId, host.id), eq(events.status, "published")))
        .orderBy(desc(events.date));
      const jsonLd = generateHostJsonLd(host);
      res.json({ ...host, events: hostEvents, jsonLd });
    } catch (error) {
      console.error("Error fetching host by slug:", error);
      res.status(500).json({ error: "Failed to fetch host" });
    }
  });

  app.post("/api/admin/hosts", isAuthenticated, async (req, res) => {
    try {
      const slug = req.body.slug || generateSlug(req.body.name);
      const [host] = await db.insert(hosts).values({ ...req.body, slug }).returning();
      res.json(host);
    } catch (error) {
      console.error("Error creating host:", error);
      res.status(500).json({ error: "Failed to create host" });
    }
  });

  app.put("/api/admin/hosts/:id", isAuthenticated, async (req, res) => {
    try {
      const updateData = { ...req.body, updatedAt: new Date() };
      if (updateData.publishedAt && typeof updateData.publishedAt === 'string') {
        updateData.publishedAt = new Date(updateData.publishedAt);
      }
      const [host] = await db
        .update(hosts)
        .set(updateData)
        .where(eq(hosts.id, req.params.id))
        .returning();
      res.json(host);
    } catch (error) {
      console.error("Error updating host:", error);
      res.status(500).json({ error: "Failed to update host" });
    }
  });

  app.delete("/api/admin/hosts/:id", isAuthenticated, async (req, res) => {
    try {
      await db.delete(hosts).where(eq(hosts.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting host:", error);
      res.status(500).json({ error: "Failed to delete host" });
    }
  });

  app.get("/api/admin/hosts", isAuthenticated, async (req, res) => {
    try {
      const allHosts = await db.select().from(hosts).orderBy(desc(hosts.createdAt));
      res.json(allHosts);
    } catch (error) {
      console.error("Error fetching hosts:", error);
      res.status(500).json({ error: "Failed to fetch hosts" });
    }
  });

  app.post("/api/admin/venues", isAuthenticated, async (req, res) => {
    try {
      const slug = req.body.slug || generateSlug(req.body.name);
      const [venue] = await db.insert(venues).values({ ...req.body, slug }).returning();
      res.json(venue);
    } catch (error) {
      console.error("Error creating venue:", error);
      res.status(500).json({ error: "Failed to create venue" });
    }
  });

  app.put("/api/admin/venues/:id", isAuthenticated, async (req, res) => {
    try {
      const updateData = { ...req.body, updatedAt: new Date() };
      if (updateData.publishedAt && typeof updateData.publishedAt === 'string') {
        updateData.publishedAt = new Date(updateData.publishedAt);
      }
      const [venue] = await db
        .update(venues)
        .set(updateData)
        .where(eq(venues.id, req.params.id))
        .returning();
      res.json(venue);
    } catch (error) {
      console.error("Error updating venue:", error);
      res.status(500).json({ error: "Failed to update venue" });
    }
  });

  app.get("/api/admin/venues", isAuthenticated, async (req, res) => {
    try {
      const allVenues = await db.select().from(venues).orderBy(desc(venues.createdAt));
      res.json(allVenues);
    } catch (error) {
      console.error("Error fetching venues:", error);
      res.status(500).json({ error: "Failed to fetch venues" });
    }
  });

  app.post("/api/admin/events", isAuthenticated, async (req, res) => {
    try {
      const slug = req.body.slug || generateSlug(req.body.title, req.body.date);
      const [event] = await db.insert(events).values({ ...req.body, slug }).returning();
      res.json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  app.put("/api/admin/events/:id", isAuthenticated, async (req, res) => {
    try {
      const updateData = { ...req.body, updatedAt: new Date() };
      if (updateData.publishedAt && typeof updateData.publishedAt === 'string') {
        updateData.publishedAt = new Date(updateData.publishedAt);
      }
      const [event] = await db
        .update(events)
        .set(updateData)
        .where(eq(events.id, req.params.id))
        .returning();
      res.json(event);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ error: "Failed to update event" });
    }
  });

  app.delete("/api/admin/events/:id", isAuthenticated, async (req, res) => {
    try {
      await db.delete(events).where(eq(events.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ error: "Failed to delete event" });
    }
  });

  app.get("/api/admin/events", isAuthenticated, async (req, res) => {
    try {
      const allEvents = await db.select().from(events).orderBy(desc(events.createdAt));
      const eventsWithRelations = await Promise.all(
        allEvents.map(async (event) => {
          const chef = event.chefId
            ? (await db.select().from(chefs).where(eq(chefs.id, event.chefId)))[0]
            : null;
          const venue = event.venueId
            ? (await db.select().from(venues).where(eq(venues.id, event.venueId)))[0]
            : null;
          return { ...event, chef, venue };
        })
      );
      res.json(eventsWithRelations);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.get("/api/admin/ai-ingestions", isAuthenticated, async (req, res) => {
    try {
      const pendingIngestions = await db
        .select()
        .from(aiIngestions)
        .where(eq(aiIngestions.approved, false))
        .orderBy(desc(aiIngestions.retrievedAt));
      res.json(pendingIngestions);
    } catch (error) {
      console.error("Error fetching AI ingestions:", error);
      res.status(500).json({ error: "Failed to fetch AI ingestions" });
    }
  });

  app.post("/api/admin/ai-ingestions/:id/approve", isAuthenticated, async (req, res) => {
    try {
      const [ingestion] = await db
        .select()
        .from(aiIngestions)
        .where(eq(aiIngestions.id, req.params.id));
      
      if (!ingestion) {
        return res.status(404).json({ error: "Ingestion not found" });
      }

      const payload = ingestion.payload as any;
      
      let chefId = null;
      if (payload.chef) {
        const [newChef] = await db.insert(chefs).values({
          name: payload.chef.name,
          bio: payload.chef.bio,
          culinaryStyle: payload.chef.culinaryStyle,
          imageUrl: payload.chef.imageUrl,
          socialLinks: payload.chef.socialLinks,
          verified: false,
        }).returning();
        chefId = newChef.id;
      }

      let venueId = null;
      if (payload.venue) {
        const [newVenue] = await db.insert(venues).values({
          name: payload.venue.name,
          description: payload.venue.description,
          capacity: payload.venue.capacity,
          fullAddress: payload.venue.fullAddress,
          images: payload.venue.images || [],
          atmosphere: payload.venue.atmosphere || [],
        }).returning();
        venueId = newVenue.id;
      }

      const [event] = await db.insert(events).values({
        title: payload.title,
        category: payload.category,
        description: payload.description,
        date: payload.date,
        time: payload.time,
        price: payload.price,
        totalSeats: payload.totalSeats,
        availableSeats: payload.availableSeats,
        menuHighlights: payload.menuHighlights || [],
        imageUrl: payload.imageUrl,
        chefId,
        venueId,
        status: "published",
        origin: "ai",
        location: ingestion.locationQuery,
      }).returning();

      await db
        .update(aiIngestions)
        .set({ approved: true, eventId: event.id })
        .where(eq(aiIngestions.id, req.params.id));

      res.json({ success: true, event });
    } catch (error) {
      console.error("Error approving ingestion:", error);
      res.status(500).json({ error: "Failed to approve ingestion" });
    }
  });

  app.delete("/api/admin/ai-ingestions/:id", isAuthenticated, async (req, res) => {
    try {
      await db.delete(aiIngestions).where(eq(aiIngestions.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting ingestion:", error);
      res.status(500).json({ error: "Failed to delete ingestion" });
    }
  });

  // Test Instagram API connection
  app.get("/api/admin/instagram-test", isAuthenticated, async (req, res) => {
    try {
      const result = await testInstagramConnection();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get("/api/discover", async (req, res) => {
    try {
      const location = (req.query.location as string) || "Victoria, BC";
      const forceRecurate = req.query.force === "true";
      const normalizedLocation = location.toLowerCase().trim();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const CACHE_HOURS = 6;
      
      const searchCityLower = location.split(",")[0].trim().toLowerCase();
      
      const isEventInFuture = (dateStr: string | null | undefined): boolean => {
        if (!dateStr) return false;
        try {
          const eventDate = new Date(dateStr);
          eventDate.setHours(0, 0, 0, 0);
          return !isNaN(eventDate.getTime()) && eventDate >= today;
        } catch {
          return false;
        }
      };
      
      let eventsWithRelations: any[] = [];
      try {
        const dbEvents = await db
          .select()
          .from(events)
          .where(eq(events.status, "published"))
          .orderBy(desc(events.createdAt));
        
        // Filter events by location (city match) AND future date only
        const locationFilteredEvents = dbEvents.filter(event => {
          if (!event.location) return false;
          const eventCity = event.location.split(",")[0].trim().toLowerCase();
          const locationMatch = eventCity === searchCityLower || event.location.toLowerCase().includes(searchCityLower);
          return locationMatch && isEventInFuture(event.date);
        });
        
        eventsWithRelations = await Promise.all(
          locationFilteredEvents.map(async (event) => {
            const chef = event.chefId
              ? (await db.select().from(chefs).where(eq(chefs.id, event.chefId)))[0]
              : null;
            const venue = event.venueId
              ? (await db.select().from(venues).where(eq(venues.id, event.venueId)))[0]
              : null;
            const host = event.hostId
              ? (await db.select().from(hosts).where(eq(hosts.id, event.hostId)))[0]
              : null;
            return { ...event, chef, venue, host };
          })
        );
        
        console.log(`Found ${eventsWithRelations.length} future published events for ${searchCityLower}`);
      } catch (dbError) {
        console.error("Database error in discover:", dbError);
      }

      // Only skip AI discovery if we have enough events for THIS location (unless force recurate)
      if (!forceRecurate && eventsWithRelations.length >= 3) {
        const sortedEvents = eventsWithRelations.sort((a, b) => {
          try {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (isNaN(dateA.getTime())) return 1;
            if (isNaN(dateB.getTime())) return -1;
            return dateA.getTime() - dateB.getTime();
          } catch {
            return 0;
          }
        });
        return res.json({ events: sortedEvents, sources: [] });
      }

      let cachedEvents: any[] = [];
      try {
        cachedEvents = await db
          .select()
          .from(cachedAiEvents)
          .where(eq(cachedAiEvents.location, normalizedLocation));
        
        const futureOnlyCached = cachedEvents.filter(ev => {
          if (!ev.date) return false;
          try {
            const eventDate = new Date(ev.date);
            return !isNaN(eventDate.getTime()) && eventDate >= today;
          } catch { return true; }
        });
        cachedEvents = futureOnlyCached;
        console.log(`Found ${cachedEvents.length} cached events for ${location}`);
      } catch (cacheError) {
        console.error("Cache read error:", cacheError);
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({ events: eventsWithRelations, sources: [] });
      }

      try {
        const ai = new GoogleGenAI({ apiKey });
        const currentDateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        
        const searchCity = location.split(",")[0].trim();
        
        const prompt = `Today's date is ${currentDateStr}. Search the web for UPCOMING intimate dining experiences in ${location}.

SEARCH THESE TYPES OF SOURCES:
- Local catering companies with event pages (e.g., hobfinefoods.ca/long-table-events)
- Showpass, Eventbrite, Do250.com event listings for ${searchCity}
- Hotel restaurant event calendars (Hotel Grand Pacific, Fairmont Empress, Chateau Victoria)
- Winery and distillery dinner event pages
- Local chef and culinary pop-up Instagram/websites

WHAT TO FIND (prioritize these types):
- "Long Table Dinners" by named chefs like Chef Castro, Chef Rob
- Whisky dinners with named ambassadors (e.g., "InchDairnie Whisky Dinner")
- Wine pairing dinners with named sommeliers
- Chef's tables hosted by specific named chefs
- Pop-up dinners by named guest chefs
- Multi-course culinary experiences at hotels with named chefs

WHAT TO EXCLUDE:
- Large food festivals (over 50 attendees)
- Events with only generic hosts like "Guest Chefs" or "Various Restaurants"
- General restaurant promotions or "Dine Around" city-wide events
- Food tours or walking tours
- Events without specific dates
- Events NOT in ${searchCity} or its immediate area

CRITICAL REQUIREMENTS:
- Only events happening AFTER ${currentDateStr}
- Must have a SPECIFIC DATE (e.g., "January 16, 2026" - NOT "ongoing", "seasonal", or date ranges)
- Must be located IN or NEAR ${searchCity} (not in other cities)
- Must have a real venue with full street address
- Must have a verifiable source URL

IMPORTANT - DISTINGUISH BETWEEN CHEF AND HOST:
- "chefName" = the person COOKING the food (e.g., "Landon Crawford" who prepares the menu)
- "hostName" = the person PRESENTING/HOSTING (e.g., "Adam Ellesmere" whisky ambassador, "Scott Fraser" distillery rep)
- For whisky dinners: the chef cooks, the whisky ambassador hosts
- For wine dinners: the chef cooks, the sommelier hosts
- If same person does both, put their name in both fields

Return a JSON array of 3-5 FUTURE events. Each event object must have these fields:
{
  "title": "Event name",
  "description": "2-3 sentences about the experience",
  "date": "Month Day, Year",
  "time": "7:00 PM",
  "price": 150,
  "category": "Whisky Dinner",
  "sourceUrl": "https://example.com/event",
  "chefName": "First Last - the person COOKING (required)",
  "chefBio": "Brief background on the chef",
  "chefStyle": "Culinary specialty",
  "hostName": "First Last - the person PRESENTING (whisky ambassador, sommelier, etc.) or null if same as chef",
  "hostBio": "Brief background on the host/presenter",
  "hostRole": "Whisky Ambassador, Sommelier, Winemaker, etc.",
  "venueName": "Venue name only",
  "venueAddress": "123 Street, City, Province PostalCode",
  "venueCity": "${searchCity}",
  "venueDescription": "Brief venue description",
  "menuHighlights": ["Course 1", "Course 2", "Pairing notes"]
}

Important:
- chefName MUST be a real chef's name (first + last name) who is COOKING
- hostName is the presenter/ambassador (can be null if chef is also the host)
- venueCity MUST be "${searchCity}" or very nearby - exclude events in other cities
- Return valid JSON only, no markdown`;

        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        let rawText = response.text || "[]";
        console.log("Raw Gemini response text (first 2000 chars):", rawText.substring(0, 2000));
        
        const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          rawText = jsonMatch[1].trim();
        }
        
        rawText = rawText.replace(/[\x00-\x1F\x7F]/g, ' ');
        
        let aiEvents: any[] = [];
        try {
          aiEvents = JSON.parse(rawText);
        } catch (parseError) {
          console.log("Initial JSON parse failed, attempting to fix...", parseError);
          let fixedText = rawText
            .replace(/,\s*]/g, ']')
            .replace(/,\s*}/g, '}')
            .replace(/([^\\])\\([^"\\\/bfnrtu])/g, '$1\\\\$2');
          
          const lastBracket = fixedText.lastIndexOf(']');
          if (lastBracket > 0) {
            fixedText = fixedText.substring(0, lastBracket + 1);
          }
          
          try {
            aiEvents = JSON.parse(fixedText);
          } catch (secondError) {
            console.log("JSON parsing failed after fixes, returning empty array");
            aiEvents = [];
          }
        }
        
        const sources: { title: string; uri: string }[] = [];
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
          chunks.forEach((chunk: any) => {
            if (chunk.web) {
              sources.push({ title: chunk.web.title || "Reference", uri: chunk.web.uri });
            }
          });
        }

        console.log("Raw Gemini AI events:", JSON.stringify(aiEvents, null, 2));
        
        const validAiEvents = aiEvents.filter((ev: any) => {
          const hasTitle = ev.title && ev.title.trim() !== "";
          
          const genericNamePatterns = [
            "guest chef", "guest chefs", "various", "participating", 
            "feature bartender", "featured bartender", "feature chef", 
            "tbd", "to be announced", "multiple", "assorted",
            "local chef", "local chefs", "house chef", "executive chef team"
          ];
          
          const chefName = (ev.chefName || "").toLowerCase().trim();
          const isGenericChef = genericNamePatterns.some(pattern => chefName.includes(pattern)) ||
                                chefName === "" ||
                                !chefName.includes(" ");
          const hasNamedChef = !isGenericChef && chefName.length > 3;
          
          const hasRealVenue = ev.venueName && ev.venueName.trim() !== "" && 
                               ev.venueName.toLowerCase() !== "various" &&
                               ev.venueName.toLowerCase() !== "various restaurants";
          const hasVenueAddress = ev.venueAddress && ev.venueAddress.trim() !== "" && 
                                  ev.venueAddress.toLowerCase() !== "tbd" &&
                                  ev.venueAddress.toLowerCase() !== "various locations" &&
                                  ev.venueAddress.toLowerCase() !== "various addresses";
          const hasSourceUrl = ev.sourceUrl && ev.sourceUrl.trim() !== "";
          
          const venueCity = (ev.venueCity || "").toLowerCase().trim();
          const addressLower = (ev.venueAddress || "").toLowerCase();
          const isInSearchCity = venueCity.includes(searchCity.toLowerCase()) ||
                                 addressLower.includes(searchCity.toLowerCase());
          
          const invalidDatePatterns = [
            "varies", "various", "ongoing", "seasonal", "tbd", "to be announced",
            "coming soon", "weekly", "monthly", "daily", "every", "saturdays",
            "sundays", "mondays", "tuesdays", "wednesdays", "thursdays", "fridays"
          ];
          const dateLower = (ev.date || "").toLowerCase().trim();
          const hasSpecificDate = ev.date && ev.date.trim() !== "" &&
                                  !invalidDatePatterns.some(pattern => dateLower.includes(pattern)) &&
                                  /\d/.test(ev.date);
          
          let isFutureEvent = true;
          if (ev.date && ev.date.toLowerCase() !== "ongoing" && ev.date.toLowerCase() !== "coming soon") {
            try {
              const eventDate = new Date(ev.date);
              if (!isNaN(eventDate.getTime())) {
                isFutureEvent = eventDate >= today;
                if (!isFutureEvent) {
                  console.log(`Filtering out past event: "${ev.title}" - date: ${ev.date}`);
                }
              }
            } catch (e) {}
          }
          
          // Check if venue is known to be closed
          const venueIsClosed = isClosedVenue(ev.venueName);
          if (venueIsClosed) {
            console.log(`Filtering out AI event: "${ev.title}" - venue "${ev.venueName}" is known to be closed`);
            return false;
          }
          
          if (!hasTitle || !hasNamedChef || !hasRealVenue || !hasVenueAddress || !hasSourceUrl || !hasSpecificDate || !isInSearchCity) {
            console.log(`Filtering out AI event: "${ev.title}" - missing: chef=${!hasNamedChef}, venue=${!hasRealVenue}, address=${!hasVenueAddress}, source=${!hasSourceUrl}, date=${!hasSpecificDate}, location=${!isInSearchCity}`);
            return false;
          }
          return isFutureEvent;
        });
        
        console.log(`AI events after validation: ${validAiEvents.length} of ${aiEvents.length} passed`);

        const expiresAt = new Date(today.getTime() + CACHE_HOURS * 60 * 60 * 1000);
        
        for (const ev of validAiEvents) {
          try {
            await db.insert(cachedAiEvents).values({
              location: normalizedLocation,
              title: ev.title,
              description: ev.description || null,
              date: ev.date || null,
              time: ev.time || null,
              price: typeof ev.price === 'number' ? Math.round(ev.price) : null,
              category: ev.category || null,
              sourceUrl: ev.sourceUrl || null,
              chefName: ev.chefName || null,
              chefBio: ev.chefBio || null,
              chefStyle: ev.chefStyle || null,
              hostName: ev.hostName || null,
              hostBio: ev.hostBio || null,
              hostRole: ev.hostRole || null,
              venueName: ev.venueName || null,
              venueAddress: ev.venueAddress || null,
              venueCity: ev.venueCity || null,
              venueDescription: ev.venueDescription || null,
              menuHighlights: ev.menuHighlights || [],
              expiresAt,
            });
          } catch (cacheError) {
            console.error("Failed to cache AI event:", cacheError);
          }
        }
        
        if (validAiEvents.length > 0) {
          console.log(`Cached ${validAiEvents.length} AI events for ${location}, expires at ${expiresAt.toISOString()}`);
        }

        // Fetch all chefs from database to match images
        const allDbChefs = await db.select().from(chefs);
        
        // Helper function to find matching chef from database
        const findMatchingDbChef = (chefName: string) => {
          if (!chefName) return null;
          const normalized = chefName.toLowerCase().replace(/^chef\s+/i, '').trim();
          const firstName = normalized.split(' ')[0];
          
          // Exact match (ignoring "Chef" prefix)
          for (const chef of allDbChefs) {
            const dbNormalized = chef.name.toLowerCase().replace(/^chef\s+/i, '').trim();
            if (dbNormalized === normalized) return chef;
          }
          
          // First name match
          for (const chef of allDbChefs) {
            const dbNormalized = chef.name.toLowerCase().replace(/^chef\s+/i, '').trim();
            const dbFirstName = dbNormalized.split(' ')[0];
            if (dbFirstName === firstName && firstName.length >= 3) return chef;
          }
          
          return null;
        };

        const enhancedFreshEvents = validAiEvents.map((ev: any, i: number) => {
          const matchedChef = findMatchingDbChef(ev.chefName);
          return {
            id: `ai-event-${Date.now()}-${i}`,
            title: ev.title,
            description: ev.description || "",
            date: ev.date || "Coming Soon",
            time: ev.time || "7:00 PM",
            price: ev.price || 150,
            totalSeats: ev.totalSeats || 12,
            availableSeats: ev.availableSeats || 8,
            category: ev.category || "Private Dining",
            menuHighlights: ev.menuHighlights || [],
            imageUrl: ev.imageUrl || null,
            sourceUrl: ev.sourceUrl || null,
            isAiGenerated: true,
            chef: matchedChef ? {
              id: matchedChef.id,
              name: matchedChef.name,
              bio: matchedChef.bio || ev.chefBio || "",
              culinaryStyle: matchedChef.culinaryStyle || ev.chefStyle || "",
              imageUrl: matchedChef.imageUrl || null,
              verified: matchedChef.verified || false,
              pastEventsCount: matchedChef.pastEventsCount || 0,
              socialLinks: matchedChef.socialLinks || { instagram: null, website: null, twitter: null },
            } : {
              id: `ai-chef-${Date.now()}-${i}`,
              name: ev.chefName || "Featured Chef",
              bio: ev.chefBio || "",
              culinaryStyle: ev.chefStyle || "",
              imageUrl: null,
              verified: false,
              pastEventsCount: 0,
              socialLinks: { instagram: null, website: null, twitter: null },
            },
            host: ev.hostName ? {
              id: `ai-host-${Date.now()}-${i}`,
              name: ev.hostName,
              bio: ev.hostBio || "",
              role: ev.hostRole || "Host",
            } : null,
            venue: {
              id: `ai-venue-${Date.now()}-${i}`,
              name: ev.venueName,
              description: ev.venueDescription || "",
              fullAddress: ev.venueAddress || "",
              capacity: 20,
              images: [],
              atmosphere: [],
            },
          };
        });

        const enhancedCachedEvents = cachedEvents.map((ev: any, i: number) => {
          const matchedChef = findMatchingDbChef(ev.chefName);
          return {
            id: `cached-event-${ev.id || i}`,
            title: ev.title,
            description: ev.description || "",
            date: ev.date || "Coming Soon",
            time: ev.time || "7:00 PM",
            price: ev.price || 150,
            totalSeats: 12,
            availableSeats: 8,
            category: ev.category || "Private Dining",
            menuHighlights: ev.menuHighlights || [],
            imageUrl: null,
            sourceUrl: ev.sourceUrl || null,
            isAiGenerated: true,
            chef: matchedChef ? {
              id: matchedChef.id,
              name: matchedChef.name,
              bio: matchedChef.bio || ev.chefBio || "",
              culinaryStyle: matchedChef.culinaryStyle || ev.chefStyle || "",
              imageUrl: matchedChef.imageUrl || null,
              verified: matchedChef.verified || false,
              pastEventsCount: matchedChef.pastEventsCount || 0,
              socialLinks: matchedChef.socialLinks || { instagram: null, website: null, twitter: null },
            } : {
              id: `cached-chef-${ev.id || i}`,
              name: ev.chefName || "Featured Chef",
              bio: ev.chefBio || "",
              culinaryStyle: ev.chefStyle || "",
              imageUrl: null,
              verified: false,
              pastEventsCount: 0,
              socialLinks: { instagram: null, website: null, twitter: null },
            },
            host: ev.hostName ? {
              id: `cached-host-${ev.id || i}`,
              name: ev.hostName,
              bio: ev.hostBio || "",
              role: ev.hostRole || "Host",
            } : null,
            venue: {
              id: `cached-venue-${ev.id || i}`,
              name: ev.venueName || "Venue",
              description: ev.venueDescription || "",
              fullAddress: ev.venueAddress || "",
              capacity: 20,
              images: [],
              atmosphere: [],
            },
          };
        });

        // Filter out closed venues from cached events too
        const validCachedEvents = enhancedCachedEvents.filter((ev: any) => !isClosedVenue(ev.venue?.name));
        
        // Trigger Instagram discovery asynchronously (doesn't block response)
        // Results will be persisted to database for future requests
        searchInstagramHashtags(location).then(igEvents => {
          if (igEvents.length > 0) {
            console.log(`Instagram async discovery found ${igEvents.length} events, persisting...`);
            const igEventsForPersistence = igEvents.map((ev: any) => ({
              title: ev.title,
              description: ev.description,
              date: ev.date,
              time: ev.time,
              price: ev.price,
              category: ev.category,
              sourceUrl: ev.sourceUrl,
              chefName: ev.chefName,
              venueName: ev.venueName,
              venueAddress: ev.venueAddress,
              venueCity: ev.venueCity,
              menuHighlights: ev.menuHighlights,
            }));
            persistAiDiscoveries(igEventsForPersistence, location).catch(err => {
              console.error("Error persisting Instagram discoveries:", err);
            });
          }
        }).catch(err => {
          console.error("Instagram async discovery error:", err);
        });

        const allAiEvents = [...enhancedFreshEvents, ...validCachedEvents];
        
        // Use smart deduplication with brand/venue/date matching
        console.log(`Before smart deduplication: ${allAiEvents.length} AI events`);
        const uniqueAiEvents = deduplicateEvents(allAiEvents);
        console.log(`After smart deduplication: ${uniqueAiEvents.length} unique AI events`);

        // Auto-persist discovered chefs, venues, and events to database
        const aiEventsForPersistence = uniqueAiEvents.map((ev: any) => ({
          title: ev.title,
          description: ev.description,
          date: ev.date,
          time: ev.time,
          price: ev.price,
          category: ev.category,
          sourceUrl: ev.sourceUrl,
          chefName: ev.chef?.name,
          chefBio: ev.chef?.bio,
          chefStyle: ev.chef?.culinaryStyle,
          hostName: ev.host?.name,
          hostBio: ev.host?.bio,
          hostRole: ev.host?.role,
          venueName: ev.venue?.name,
          venueAddress: ev.venue?.fullAddress,
          venueCity: location,
          venueDescription: ev.venue?.description,
          menuHighlights: ev.menuHighlights,
        }));
        
        persistAiDiscoveries(aiEventsForPersistence, location).catch(err => {
          console.error("Error persisting AI discoveries:", err);
        });

        // Combine DB events with AI events, then deduplicate across all sources
        // DB events take priority (they are curated), so put them first
        const combinedEvents = [...eventsWithRelations, ...uniqueAiEvents];
        
        // Create a signature set from DB events to filter out AI duplicates
        const dbEventSignatures = new Set(
          eventsWithRelations.map(ev => {
            const title = (ev.title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            const date = ev.date || "";
            return `${title}-${date}`;
          })
        );
        
        // Filter AI events that duplicate DB events
        const filteredCombined = combinedEvents.filter((ev, index) => {
          // Always keep DB events (they come first)
          if (index < eventsWithRelations.length) return true;
          
          // For AI events, check if they duplicate a DB event
          const title = (ev.title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          const date = ev.date || "";
          const signature = `${title}-${date}`;
          return !dbEventSignatures.has(signature);
        });
        
        // Filter to only future events and sort chronologically
        const futureEvents = filteredCombined.filter(ev => isEventInFuture(ev.date));
        
        futureEvents.sort((a, b) => {
          try {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (isNaN(dateA.getTime())) return 1;
            if (isNaN(dateB.getTime())) return -1;
            return dateA.getTime() - dateB.getTime();
          } catch {
            return 0;
          }
        });
        
        res.json({ events: futureEvents, sources: [...new Set(sources.map(s => s.uri))].map(uri => sources.find(s => s.uri === uri)!) });
      } catch (aiError) {
        console.error("AI discovery error:", aiError);
        res.json({ events: eventsWithRelations, sources: [] });
      }
    } catch (error) {
      console.error("Error in discovery:", error);
      res.status(500).json({ error: "Failed to discover events" });
    }
  });
}
