import { db } from "../db.js";
import { chefs, venues, events, type InsertChef, type InsertVenue, type InsertEvent } from "../../shared/schema.js";
import { generateSlug } from "../utils/slug.js";
import { eq, ilike, and, or, sql } from "drizzle-orm";

interface AiDiscoveredEvent {
  title: string;
  description?: string;
  date?: string;
  time?: string;
  price?: number | null;
  category?: string;
  sourceUrl?: string;
  chefName?: string;
  chefBio?: string;
  chefStyle?: string;
  hostName?: string;
  hostBio?: string;
  hostRole?: string;
  venueName?: string;
  venueAddress?: string;
  venueCity?: string;
  venueDescription?: string;
  menuHighlights?: string[];
}

function normalizeChefName(name: string): string {
  return name
    .trim()
    .replace(/^chef\s+/i, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normalizeVenueName(name: string): string {
  return name
    .trim()
    .replace(/\s+(restaurant|bar|lounge|cafe|bistro)$/i, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

async function findOrCreateChef(name: string, bio?: string, style?: string, region?: string): Promise<string> {
  const rawName = name.trim();
  const normalizedName = normalizeChefName(rawName);
  const slug = generateSlug(rawName);
  
  const existing = await db.select({ id: chefs.id }).from(chefs).where(
    or(
      eq(chefs.slug, slug),
      ilike(chefs.name, rawName),
      ilike(chefs.name, `Chef ${normalizedName}`),
      sql`LOWER(REPLACE(${chefs.name}, 'Chef ', '')) = ${normalizedName}`
    )
  ).limit(1);
  
  if (existing.length > 0) {
    return existing[0].id;
  }
  
  let uniqueSlug = slug;
  let counter = 1;
  while (true) {
    const [slugExists] = await db.select({ id: chefs.id }).from(chefs).where(eq(chefs.slug, uniqueSlug)).limit(1);
    if (!slugExists) break;
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }
  
  const newChef: InsertChef = {
    name: rawName,
    slug: uniqueSlug,
    bio: bio || null,
    culinaryStyle: style || null,
    region: region || null,
    verified: false,
  };
  
  const [created] = await db.insert(chefs).values(newChef).returning({ id: chefs.id });
  console.log(`Created new chef: ${rawName} (${created.id})`);
  return created.id;
}

async function findOrCreateVenue(name: string, address?: string, city?: string, description?: string): Promise<string> {
  const rawName = name.trim();
  const normalizedName = normalizeVenueName(rawName);
  const slug = generateSlug(rawName);
  
  const existing = await db.select({ id: venues.id }).from(venues).where(
    or(
      eq(venues.slug, slug),
      ilike(venues.name, rawName),
      sql`LOWER(${venues.name}) LIKE ${'%' + normalizedName + '%'}`
    )
  ).limit(1);
  
  if (existing.length > 0) {
    return existing[0].id;
  }
  
  let uniqueSlug = slug;
  let counter = 1;
  while (true) {
    const [slugExists] = await db.select({ id: venues.id }).from(venues).where(eq(venues.slug, uniqueSlug)).limit(1);
    if (!slugExists) break;
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }
  
  const newVenue: InsertVenue = {
    name: rawName,
    slug: uniqueSlug,
    fullAddress: address || null,
    city: city || null,
    description: description || null,
  };
  
  const [created] = await db.insert(venues).values(newVenue).returning({ id: venues.id });
  console.log(`Created new venue: ${rawName} (${created.id})`);
  return created.id;
}

async function eventExists(slug: string, chefId?: string | null, date?: string): Promise<boolean> {
  const [bySlug] = await db.select({ id: events.id }).from(events).where(eq(events.slug, slug)).limit(1);
  if (bySlug) return true;
  
  if (chefId && date) {
    const [byChefDate] = await db.select({ id: events.id }).from(events).where(
      and(eq(events.chefId, chefId), eq(events.date, date))
    ).limit(1);
    if (byChefDate) return true;
  }
  
  return false;
}

export async function persistAiDiscoveries(discoveredEvents: AiDiscoveredEvent[], location: string): Promise<{ chefsCreated: number; venuesCreated: number; eventsCreated: number }> {
  let chefsCreated = 0;
  let venuesCreated = 0;
  let eventsCreated = 0;
  
  const chefCache = new Map<string, string>();
  const venueCache = new Map<string, string>();
  
  for (const aiEvent of discoveredEvents) {
    try {
      let chefId: string | null = null;
      let venueId: string | null = null;
      
      if (aiEvent.chefName && aiEvent.chefName.trim()) {
        const chefKey = normalizeChefName(aiEvent.chefName);
        
        if (chefCache.has(chefKey)) {
          chefId = chefCache.get(chefKey)!;
        } else {
          const [existingCount] = await db.select({ count: sql<number>`count(*)` }).from(chefs);
          chefId = await findOrCreateChef(
            aiEvent.chefName,
            aiEvent.chefBio,
            aiEvent.chefStyle,
            location
          );
          const [newCount] = await db.select({ count: sql<number>`count(*)` }).from(chefs);
          if (Number(newCount.count) > Number(existingCount.count)) chefsCreated++;
          chefCache.set(chefKey, chefId);
        }
      }
      
      if (aiEvent.venueName && aiEvent.venueName.trim()) {
        const venueKey = normalizeVenueName(aiEvent.venueName);
        
        if (venueCache.has(venueKey)) {
          venueId = venueCache.get(venueKey)!;
        } else {
          const [existingCount] = await db.select({ count: sql<number>`count(*)` }).from(venues);
          venueId = await findOrCreateVenue(
            aiEvent.venueName,
            aiEvent.venueAddress,
            aiEvent.venueCity,
            aiEvent.venueDescription
          );
          const [newCount] = await db.select({ count: sql<number>`count(*)` }).from(venues);
          if (Number(newCount.count) > Number(existingCount.count)) venuesCreated++;
          venueCache.set(venueKey, venueId);
        }
      }
      
      const eventSlug = generateSlug(aiEvent.title, aiEvent.date);
      
      if (await eventExists(eventSlug, chefId, aiEvent.date)) {
        continue;
      }
      
      let uniqueSlug = eventSlug;
      let counter = 1;
      while (true) {
        const [slugExists] = await db.select({ id: events.id }).from(events).where(eq(events.slug, uniqueSlug)).limit(1);
        if (!slugExists) break;
        uniqueSlug = `${eventSlug}-${counter}`;
        counter++;
      }
      
      const newEvent: InsertEvent = {
        title: aiEvent.title,
        slug: uniqueSlug,
        description: aiEvent.description || null,
        date: aiEvent.date || null,
        time: aiEvent.time || null,
        price: aiEvent.price ? Math.round(aiEvent.price) : null,
        category: aiEvent.category || null,
        menuHighlights: aiEvent.menuHighlights || [],
        sourceUrls: aiEvent.sourceUrl ? [aiEvent.sourceUrl] : [],
        chefId,
        venueId,
        hostName: aiEvent.hostName || null,
        hostBio: aiEvent.hostBio || null,
        hostRole: aiEvent.hostRole || null,
        location,
        status: "draft",
        origin: "ai",
      };
      
      await db.insert(events).values(newEvent);
      eventsCreated++;
      console.log(`Created new event: ${aiEvent.title}`);
      
    } catch (error) {
      console.error(`Error persisting AI event "${aiEvent.title}":`, error);
    }
  }
  
  console.log(`AI Ingestion complete: ${chefsCreated} chefs, ${venuesCreated} venues, ${eventsCreated} events created`);
  return { chefsCreated, venuesCreated, eventsCreated };
}
