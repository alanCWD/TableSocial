import type { Express } from "express";
import { db } from "./db.js";
import { chefs, hosts, events, venues, aiIngestions, cachedAiEvents } from "../shared/schema.js";
import { eq, and, gte, desc, lt, isNull, sql, ilike, or } from "drizzle-orm";
import { isAuthenticated } from "./replit_integrations/auth/index.js";
import { GoogleGenAI, Type } from "@google/genai";
import { generateSlug, generateEventJsonLd, generateChefJsonLd, generateHostJsonLd } from "./utils/slug.js";
import { persistAiDiscoveries } from "./services/aiIngestion.js";
import { searchInstagramHashtags, testInstagramConnection } from "./services/instagramDiscovery.js";

function levenshteinDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

const CLOSED_VENUES = [
  "olo restaurant",
  "olo victoria",
];

const VICTORIA_AREA_CITIES = [
  "victoria", "langford", "colwood", "esquimalt", "saanich",
  "oak bay", "sidney", "sooke", "metchosin", "view royal",
  "central saanich", "north saanich", "highlands", "brentwood bay",
];

function isHighAuthoritySource(url: string | null): boolean {
  if (!url) return false;
  const urlLower = url.toLowerCase();
  return urlLower.includes('eventbrite') ||
         urlLower.includes('showpass.com') ||
         urlLower.includes('do250.com');
}

function hasCulinaryBrandToken(title: string): boolean {
  if (!title) return false;
  const normalized = title.toLowerCase()
    .replace(/&amp;/g, '&')
    .replace(/['']s/g, 's')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return BRAND_TOKENS.some(brand => {
    const pattern = new RegExp(`\\b${brand.replace(/\s+/g, '\\s+')}\\b`);
    return pattern.test(normalized);
  });
}

const NON_CULINARY_KEYWORDS = [
  "baseball", "softball", "hockey", "soccer", "football", "basketball",
  "music bingo", "paint night", "trivia night", "karaoke",
  "concert", "live music", "live!", "comedy show", "stand-up",
  "fundraiser", "auction", "gala",
  "yoga", "fitness", "run ", "marathon", "5k", "10k",
  "highland games", "picklefest", "pickle fest",
  "craft fair", "market day", "swap meet",
  "open house", "wedding",
  "free spirit", "non-alc festival", "non-alcoholic festival",
  "happy hour", "kid cuisine crawl",
];

function isNonCulinaryEvent(title: string, category: string): boolean {
  const combined = `${title} ${category}`.toLowerCase()
    .replace(/&amp;/g, '&');
  return NON_CULINARY_KEYWORDS.some(kw => combined.includes(kw));
}

function isAddressInSearchRegion(address: string, venueCity: string, searchCity: string): boolean {
  const searchCityLower = searchCity.toLowerCase();
  const addressLower = (address || "").toLowerCase();
  const venueCityLower = (venueCity || "").toLowerCase();

  if (searchCityLower === "victoria") {
    const combinedText = `${addressLower} ${venueCityLower}`;

    const nonLocalIndicators = [
      "ontario", "niagara", "toronto", "ottawa", "hamilton", "london, on",
      "alberta", "calgary", "edmonton",
      "saskatchewan", "manitoba", "winnipeg",
      "quebec", "montreal", "nova scotia", "new brunswick",
      "united states", "usa", ", wa ", ", or ", ", ca ", ", co ",
      "steamboat", "seattle", "portland", "san francisco",
      "lake country", "sun peaks", "kamloops", "kelowna", "penticton",
      "vernon", "revelstoke", "whistler", "squamish",
      "nanaimo", "courtenay", "comox", "campbell river", "parksville",
      "qualicum", "port alberni", "tofino", "ucluelet", "duncan",
      "prince george", "cranbrook", "nelson", "trail",
      "vancouver, bc", "burnaby", "surrey", "richmond, bc", "coquitlam",
      "new westminster", "abbotsford", "chilliwack",
    ];
    if (nonLocalIndicators.some(ind => combinedText.includes(ind))) {
      return false;
    }

    const addressNotSpecified = addressLower.includes("not available") ||
                                 addressLower.includes("not provided") ||
                                 addressLower.includes("not found") ||
                                 addressLower.includes("not specified") ||
                                 addressLower.includes("check website") ||
                                 addressLower.includes("unknown");
    if (addressNotSpecified) {
      return VICTORIA_AREA_CITIES.some(c => venueCityLower.includes(c));
    }

    return VICTORIA_AREA_CITIES.some(c => combinedText.includes(c));
  }

  return venueCityLower.includes(searchCityLower) ||
         addressLower.includes(searchCityLower);
}

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

function canonicalCacheSignature(title: string | null, date: string | null): string {
  const t = (title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  let d = "";
  if (date) {
    try {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        d = parsed.toISOString().slice(0, 10);
      } else {
        d = date.toLowerCase().replace(/[^a-z0-9]/g, "");
      }
    } catch {
      d = date.toLowerCase().replace(/[^a-z0-9]/g, "");
    }
  }
  return `${t}-${d}`;
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
      const allChefs = await db.select().from(chefs).where(isNull(chefs.deletedAt)).orderBy(desc(chefs.createdAt));
      res.json(allChefs);
    } catch (error) {
      console.error("Error fetching chefs:", error);
      res.status(500).json({ error: "Failed to fetch chefs" });
    }
  });

  app.get("/api/chefs/:id", async (req, res) => {
    try {
      const [chef] = await db.select().from(chefs).where(and(eq(chefs.id, req.params.id), isNull(chefs.deletedAt)));
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
      const [chef] = await db.select().from(chefs).where(and(eq(chefs.slug, req.params.slug), isNull(chefs.deletedAt)));
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
      await db.update(chefs).set({ deletedAt: new Date() }).where(eq(chefs.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting chef:", error);
      res.status(500).json({ error: "Failed to delete chef" });
    }
  });

  // Hosts (Drink Specialists) Routes
  app.get("/api/hosts", async (req, res) => {
    try {
      const allHosts = await db.select().from(hosts).where(isNull(hosts.deletedAt)).orderBy(desc(hosts.createdAt));
      res.json(allHosts);
    } catch (error) {
      console.error("Error fetching hosts:", error);
      res.status(500).json({ error: "Failed to fetch hosts" });
    }
  });

  app.get("/api/hosts/:id", async (req, res) => {
    try {
      const [host] = await db.select().from(hosts).where(and(eq(hosts.id, req.params.id), isNull(hosts.deletedAt)));
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
      const [host] = await db.select().from(hosts).where(and(eq(hosts.slug, req.params.slug), isNull(hosts.deletedAt)));
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
      await db.update(hosts).set({ deletedAt: new Date() }).where(eq(hosts.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting host:", error);
      res.status(500).json({ error: "Failed to delete host" });
    }
  });

  app.get("/api/admin/hosts", isAuthenticated, async (req, res) => {
    try {
      const allHosts = await db.select().from(hosts).where(isNull(hosts.deletedAt)).orderBy(desc(hosts.createdAt));
      res.json(allHosts);
    } catch (error) {
      console.error("Error fetching hosts:", error);
      res.status(500).json({ error: "Failed to fetch hosts" });
    }
  });

  app.get("/api/admin/duplicates", isAuthenticated, async (req, res) => {
    try {
      const allChefs = await db.select().from(chefs).where(isNull(chefs.deletedAt));
      const allHosts = await db.select().from(hosts).where(isNull(hosts.deletedAt));

      const normalizeForCompare = (name: string) => name.toLowerCase().replace(/^(chef|chef de cuisine|executive chef|head chef)\s+/i, '').replace(/\s+/g, ' ').trim();

      const chefDuplicates: { group: typeof allChefs }[] = [];
      const visited = new Set<string>();
      for (let i = 0; i < allChefs.length; i++) {
        if (visited.has(allChefs[i].id)) continue;
        const norm = normalizeForCompare(allChefs[i].name);
        const group = [allChefs[i]];
        for (let j = i + 1; j < allChefs.length; j++) {
          if (visited.has(allChefs[j].id)) continue;
          const norm2 = normalizeForCompare(allChefs[j].name);
          if (norm === norm2 || (norm.length >= 4 && norm2.length >= 4 && levenshteinDistance(norm, norm2) <= 2)) {
            group.push(allChefs[j]);
            visited.add(allChefs[j].id);
          }
        }
        if (group.length > 1) {
          visited.add(allChefs[i].id);
          chefDuplicates.push({ group });
        }
      }

      const hostDuplicates: { group: typeof allHosts }[] = [];
      const visitedHosts = new Set<string>();
      for (let i = 0; i < allHosts.length; i++) {
        if (visitedHosts.has(allHosts[i].id)) continue;
        const norm = allHosts[i].name.toLowerCase().trim();
        const group = [allHosts[i]];
        for (let j = i + 1; j < allHosts.length; j++) {
          if (visitedHosts.has(allHosts[j].id)) continue;
          const norm2 = allHosts[j].name.toLowerCase().trim();
          if (norm === norm2 || (norm.length >= 4 && norm2.length >= 4 && levenshteinDistance(norm, norm2) <= 2)) {
            group.push(allHosts[j]);
            visitedHosts.add(allHosts[j].id);
          }
        }
        if (group.length > 1) {
          visitedHosts.add(allHosts[i].id);
          hostDuplicates.push({ group });
        }
      }

      const crossRoleMatches: { chef: typeof allChefs[0], host: typeof allHosts[0] }[] = [];
      for (const chef of allChefs) {
        const chefNorm = normalizeForCompare(chef.name);
        for (const host of allHosts) {
          const hostNorm = host.name.toLowerCase().trim();
          if (chefNorm === hostNorm || (chefNorm.length >= 4 && hostNorm.length >= 4 && levenshteinDistance(chefNorm, hostNorm) <= 2)) {
            crossRoleMatches.push({ chef, host });
          }
        }
      }

      res.json({ chefDuplicates, hostDuplicates, crossRoleMatches });
    } catch (error) {
      console.error("Error finding duplicates:", error);
      res.status(500).json({ error: "Failed to find duplicates" });
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
        
        const allEventsWithRelations = await Promise.all(
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
        
        eventsWithRelations = allEventsWithRelations.filter(ev => {
          const venueAddress = ev.venue?.fullAddress || "";
          const venueCity = ev.venue?.city || ev.location || "";
          if (venueAddress && !isAddressInSearchRegion(venueAddress, venueCity, searchCityLower)) {
            console.log(`Filtering out DB event: "${ev.title}" - venue address "${venueAddress}" is not in ${searchCityLower} area`);
            return false;
          }
          return true;
        });
        
        console.log(`Found ${eventsWithRelations.length} future published events for ${searchCityLower} (${allEventsWithRelations.length} before venue check)`);
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
        const rawCached = await db
          .select()
          .from(cachedAiEvents)
          .where(eq(cachedAiEvents.location, normalizedLocation));
        
        const futureOnlyCached = rawCached.filter(ev => {
          if (!ev.date) return false;
          try {
            const eventDate = new Date(ev.date);
            return !isNaN(eventDate.getTime()) && eventDate >= today;
          } catch { return true; }
        });
        
        const freshCached = futureOnlyCached.filter(ev => {
          if (!ev.expiresAt) return true;
          return new Date(ev.expiresAt) > today;
        });
        
        const locationValidCached = freshCached.filter(ev => {
          return isAddressInSearchRegion(ev.venueAddress || "", ev.venueCity || "", searchCityLower);
        });
        
        const seenSignatures = new Set<string>();
        cachedEvents = locationValidCached.filter(ev => {
          const sig = canonicalCacheSignature(ev.title, ev.date);
          if (seenSignatures.has(sig)) return false;
          seenSignatures.add(sig);
          return true;
        });
        console.log(`Found ${cachedEvents.length} unique cached events for ${location} (${rawCached.length} raw, ${locationValidCached.length} location-valid, ${freshCached.length} fresh+future)`);
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

        const baseEventSchema = `Each event object must have these fields:
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
}`;

        const baseRules = `CRITICAL REQUIREMENTS:
- Only events happening AFTER ${currentDateStr}
- Must have a SPECIFIC DATE (e.g., "January 16, 2026" - NOT "ongoing", "seasonal", or date ranges)
- Must be located IN or NEAR ${searchCity} (not in other cities)
- Must have a real venue with full street address
- Must have a verifiable source URL
- chefName MUST be a real chef's name (first + last name) who is COOKING
- hostName is the presenter/ambassador (can be null if chef is also the host)
- venueCity MUST be "${searchCity}" or very nearby - exclude events in other cities
- Return valid JSON only, no markdown

IMPORTANT - DISTINGUISH BETWEEN CHEF AND HOST:
- "chefName" = the person COOKING the food (e.g., "Landon Crawford" who prepares the menu)
- "hostName" = the person PRESENTING/HOSTING (e.g., "Adam Ellesmere" whisky ambassador, "Scott Fraser" distillery rep)
- For whisky dinners: the chef cooks, the whisky ambassador hosts
- For wine dinners: the chef cooks, the sommelier hosts
- If same person does both, put their name in both fields

WHAT TO EXCLUDE:
- Large food festivals (over 50 attendees)
- Events with only generic hosts like "Guest Chefs" or "Various Restaurants"
- General restaurant promotions or "Dine Around" city-wide events
- Food tours or walking tours
- Events without specific dates
- Events NOT in ${searchCity} or its immediate area`;

        const searchPrompts = [
          `Today's date is ${currentDateStr}. Search Eventbrite.ca, Eventbrite.com, and Showpass.com specifically for UPCOMING intimate dining events, food pairing dinners, whisky tastings with dinner, wine pairing dinners, and chef's table experiences in ${location}.

Search for event listings on these ticketing platforms using terms like:
- "${searchCity} dinner pairing"
- "${searchCity} whisky dinner"
- "${searchCity} wine dinner"  
- "${searchCity} chef table"
- "${searchCity} distillery dinner"
- "${searchCity} pop-up dinner"
- "${searchCity} multi-course dinner"
- "${searchCity} tasting dinner"

Also check Do250.com for ${searchCity} food and drink events.

${baseRules}

Return a JSON array of up to 10 FUTURE events found on these ticketing platforms. ${baseEventSchema}`,

          `Today's date is ${currentDateStr}. Search the web for UPCOMING intimate dining experiences in ${location} from these specific source types:

SEARCH THESE SOURCES:
- Hotel restaurant event calendars (Hotel Grand Pacific, Fairmont Empress, Chateau Victoria, Delta Hotels)
- Winery and distillery dinner/pairing event pages in and around ${searchCity}
- Local catering companies with event pages (e.g., hobfinefoods.ca)
- Restaurant websites in ${searchCity} that host special multi-course events
- Brewery and distillery tasting room event calendars near ${searchCity}

WHAT TO FIND:
- Multi-course pairing dinners (whisky, wine, beer, spirits)
- Chef's tables and special chef-hosted dinners
- Distillery or winery collaboration dinners with restaurants
- Pop-up dining experiences by guest chefs
- Seasonal or holiday themed multi-course dinners

${baseRules}

Return a JSON array of up to 10 FUTURE events. ${baseEventSchema}`,

          `Today's date is ${currentDateStr}. Search the web broadly for ALL upcoming intimate culinary events in ${location}.

SEARCH THESE TYPES OF SOURCES:
- Local catering companies with event pages (e.g., hobfinefoods.ca/long-table-events)
- Showpass, Eventbrite, Do250.com event listings for ${searchCity}
- Hotel restaurant event calendars (Hotel Grand Pacific, Fairmont Empress, Chateau Victoria)
- Winery and distillery dinner event pages
- Local chef and culinary pop-up Instagram/websites
- Tourism ${searchCity} event calendars
- Local food blogs and event aggregator sites
- Restaurant Instagram/Facebook pages with upcoming events

WHAT TO FIND (prioritize these types):
- "Long Table Dinners" by named chefs
- Whisky dinners with named ambassadors (e.g., "InchDairnie Whisky Dinner")
- Wine pairing dinners with named sommeliers
- Chef's tables hosted by specific named chefs
- Pop-up dinners by named guest chefs
- Multi-course culinary experiences at hotels with named chefs
- Distillery collaboration dinners
- Sake, beer, or cocktail pairing dinners

${baseRules}

Return a JSON array of up to 10 FUTURE events. ${baseEventSchema}`
        ];

        let allAiEvents: any[] = [];
        const allSources: { title: string; uri: string }[] = [];

        console.log(`Starting multi-pass AI discovery (${searchPrompts.length} passes) for ${location}`);

        const searchResults = await Promise.allSettled(
          searchPrompts.map(async (prompt, passIndex) => {
            try {
              const response = await ai.models.generateContent({
                model: "gemini-2.0-flash",
                contents: prompt,
                config: {
                  tools: [{ googleSearch: {} }],
                },
              });

              let rawText = response.text || "[]";
              console.log(`Pass ${passIndex + 1} raw response (first 1000 chars):`, rawText.substring(0, 1000));

              const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
              if (jsonMatch) {
                rawText = jsonMatch[1].trim();
              }

              rawText = rawText.replace(/[\x00-\x1F\x7F]/g, ' ');

              let passEvents: any[] = [];
              try {
                passEvents = JSON.parse(rawText);
              } catch (parseError) {
                let fixedText = rawText
                  .replace(/,\s*]/g, ']')
                  .replace(/,\s*}/g, '}')
                  .replace(/([^\\])\\([^"\\\/bfnrtu])/g, '$1\\\\$2');

                const lastBracket = fixedText.lastIndexOf(']');
                if (lastBracket > 0) {
                  fixedText = fixedText.substring(0, lastBracket + 1);
                }

                try {
                  passEvents = JSON.parse(fixedText);
                } catch {
                  console.log(`Pass ${passIndex + 1}: JSON parsing failed`);
                  passEvents = [];
                }
              }

              if (!Array.isArray(passEvents)) passEvents = [];

              const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
              const passSources: { title: string; uri: string }[] = [];
              if (chunks) {
                chunks.forEach((chunk: any) => {
                  if (chunk.web) {
                    passSources.push({ title: chunk.web.title || "Reference", uri: chunk.web.uri });
                  }
                });
              }

              console.log(`Pass ${passIndex + 1}: found ${passEvents.length} events, ${passSources.length} sources`);
              return { events: passEvents, sources: passSources };
            } catch (passError) {
              console.error(`Pass ${passIndex + 1} failed:`, passError);
              return { events: [], sources: [] };
            }
          })
        );

        for (const result of searchResults) {
          if (result.status === 'fulfilled') {
            allAiEvents.push(...result.value.events);
            allSources.push(...result.value.sources);
          }
        }

        console.log(`Multi-pass discovery total: ${allAiEvents.length} raw events from ${searchPrompts.length} passes`);

        const sources = allSources;
        const aiEvents = allAiEvents;

        console.log("Raw Gemini AI events:", JSON.stringify(aiEvents.map(e => e.title), null, 2));
        
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
          
          const hasVerifiedSource = isHighAuthoritySource(ev.sourceUrl);
          const hasBrandInTitle = hasCulinaryBrandToken(ev.title);
          const chefRequirementMet = hasNamedChef || hasVerifiedSource || hasBrandInTitle;
          
          const hasRealVenue = ev.venueName && ev.venueName.trim() !== "" && 
                               ev.venueName.toLowerCase() !== "various" &&
                               ev.venueName.toLowerCase() !== "various restaurants";
          const hasVenueAddress = ev.venueAddress && ev.venueAddress.trim() !== "" && 
                                  ev.venueAddress.toLowerCase() !== "tbd" &&
                                  ev.venueAddress.toLowerCase() !== "various locations" &&
                                  ev.venueAddress.toLowerCase() !== "various addresses";
          const hasSourceUrl = ev.sourceUrl && ev.sourceUrl.trim() !== "";
          
          const isInSearchCity = isAddressInSearchRegion(ev.venueAddress || "", ev.venueCity || "", searchCity);
          
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
          
          const venueIsClosed = isClosedVenue(ev.venueName);
          if (venueIsClosed) {
            console.log(`Filtering out AI event: "${ev.title}" - venue "${ev.venueName}" is known to be closed`);
            return false;
          }
          
          if (isNonCulinaryEvent(ev.title, ev.category || "")) {
            console.log(`Filtering out non-culinary AI event: "${ev.title}"`);
            return false;
          }
          
          if (!hasTitle || !chefRequirementMet || !hasRealVenue || !hasVenueAddress || !hasSourceUrl || !hasSpecificDate || !isInSearchCity) {
            console.log(`Filtering out AI event: "${ev.title}" - missing: chef=${!chefRequirementMet}${(hasVerifiedSource || hasBrandInTitle) && !hasNamedChef ? '(relaxed)' : ''}, venue=${!hasRealVenue}, address=${!hasVenueAddress}, source=${!hasSourceUrl}, date=${!hasSpecificDate}, location=${!isInSearchCity}${!isInSearchCity ? ` [addr: ${(ev.venueAddress || '').substring(0, 60)}]` : ''}`);
            return false;
          }
          return isFutureEvent;
        });
        
        console.log(`AI events after validation: ${validAiEvents.length} of ${aiEvents.length} passed`);

        const expiresAt = new Date(today.getTime() + CACHE_HOURS * 60 * 60 * 1000);
        
        const existingCacheSignatures = new Set(
          cachedEvents.map(ev => canonicalCacheSignature(ev.title, ev.date))
        );
        
        let newCachedCount = 0;
        for (const ev of validAiEvents) {
          const cacheSignature = canonicalCacheSignature(ev.title, ev.date);
          
          if (existingCacheSignatures.has(cacheSignature)) {
            continue;
          }
          existingCacheSignatures.add(cacheSignature);
          
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
            newCachedCount++;
          } catch (cacheError) {
            console.error("Failed to cache AI event:", cacheError);
          }
        }
        
        if (newCachedCount > 0) {
          console.log(`Cached ${newCachedCount} NEW AI events for ${location} (skipped ${validAiEvents.length - newCachedCount} duplicates), expires at ${expiresAt.toISOString()}`);
        }

        const allDbChefs = await db.select().from(chefs).where(isNull(chefs.deletedAt));
        const allDbHosts = await db.select().from(hosts).where(isNull(hosts.deletedAt));
        
        const findMatchingDbChef = (chefName: string) => {
          if (!chefName) return null;
          const normalized = chefName.toLowerCase().replace(/^chef\s+/i, '').trim();
          const firstName = normalized.split(' ')[0];
          
          for (const chef of allDbChefs) {
            const dbNormalized = chef.name.toLowerCase().replace(/^chef\s+/i, '').trim();
            if (dbNormalized === normalized) return chef;
          }
          
          for (const chef of allDbChefs) {
            const dbNormalized = chef.name.toLowerCase().replace(/^chef\s+/i, '').trim();
            const dbFirstName = dbNormalized.split(' ')[0];
            if (dbFirstName === firstName && firstName.length >= 3) return chef;
          }
          
          return null;
        };

        const findMatchingDbHost = (hostName: string) => {
          if (!hostName) return null;
          const normalized = hostName.toLowerCase().trim();
          const firstName = normalized.split(' ')[0];

          for (const host of allDbHosts) {
            const dbNormalized = host.name.toLowerCase().trim();
            if (dbNormalized === normalized) return host;
          }

          for (const host of allDbHosts) {
            const dbNormalized = host.name.toLowerCase().trim();
            const dbFirstName = dbNormalized.split(' ')[0];
            if (dbFirstName === firstName && firstName.length >= 3) return host;
          }

          return null;
        };

        const enhancedFreshEvents = validAiEvents.map((ev: any, i: number) => {
          const matchedChef = findMatchingDbChef(ev.chefName);
          const matchedHost = findMatchingDbHost(ev.hostName);
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
            host: matchedHost ? {
              id: matchedHost.id,
              name: matchedHost.name,
              slug: matchedHost.slug,
              bio: matchedHost.bio || ev.hostBio || "",
              specialty: matchedHost.specialty || "",
              role: matchedHost.role || "other",
              roleTitle: matchedHost.roleTitle || ev.hostRole || "",
              imageUrl: matchedHost.imageUrl || null,
              socialLinks: matchedHost.socialLinks || {},
              pastEventsCount: matchedHost.pastEventsCount || 0,
              verified: matchedHost.verified || false,
              region: matchedHost.region || "",
            } : ev.hostName ? {
              id: `ai-host-${Date.now()}-${i}`,
              name: ev.hostName,
              bio: ev.hostBio || "",
              role: ev.hostRole || "Host",
              imageUrl: null,
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
          const matchedHost = findMatchingDbHost(ev.hostName);
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
            host: matchedHost ? {
              id: matchedHost.id,
              name: matchedHost.name,
              slug: matchedHost.slug,
              bio: matchedHost.bio || ev.hostBio || "",
              specialty: matchedHost.specialty || "",
              role: matchedHost.role || "other",
              roleTitle: matchedHost.roleTitle || ev.hostRole || "",
              imageUrl: matchedHost.imageUrl || null,
              socialLinks: matchedHost.socialLinks || {},
              pastEventsCount: matchedHost.pastEventsCount || 0,
              verified: matchedHost.verified || false,
              region: matchedHost.region || "",
            } : ev.hostName ? {
              id: `cached-host-${ev.id || i}`,
              name: ev.hostName,
              bio: ev.hostBio || "",
              role: ev.hostRole || "Host",
              imageUrl: null,
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
        const validCachedEvents = enhancedCachedEvents.filter((ev: any) => {
          if (isClosedVenue(ev.venue?.name)) return false;
          if (isNonCulinaryEvent(ev.title, ev.category || "")) return false;
          return true;
        });
        
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

        const combinedAiEvents = [...enhancedFreshEvents, ...validCachedEvents];
        
        // Use smart deduplication with brand/venue/date matching
        console.log(`Before smart deduplication: ${combinedAiEvents.length} AI events`);
        const uniqueAiEvents = deduplicateEvents(combinedAiEvents);
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
