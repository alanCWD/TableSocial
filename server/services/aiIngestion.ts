import { db } from "../db.js";
import { chefs, hosts, venues, events, type InsertChef, type InsertHost, type InsertVenue, type InsertEvent } from "../../shared/schema.js";
import { generateSlug } from "../utils/slug.js";
import { eq, ilike, and, or, sql, isNull, isNotNull } from "drizzle-orm";

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
    .replace(/^(chef|chef de cuisine|executive chef|head chef)\s+/i, '')
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

function normalizeHostName(name: string): string {
  return name
    .trim()
    .replace(/^(dr\.?\s+|mr\.?\s+|ms\.?\s+|mrs\.?\s+)/i, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function levenshtein(a: string, b: string): number {
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

function isFuzzyMatch(a: string, b: string, threshold = 2): boolean {
  if (a.length < 4 || b.length < 4) return false;
  return levenshtein(a, b) <= threshold;
}

async function isDeletedProfile(name: string, table: 'chef' | 'host'): Promise<boolean> {
  const normalized = table === 'chef' ? normalizeChefName(name) : normalizeHostName(name);
  const tbl = table === 'chef' ? chefs : hosts;
  const nameCol = table === 'chef' ? chefs.name : hosts.name;
  const deletedCol = table === 'chef' ? chefs.deletedAt : hosts.deletedAt;

  const deleted = await db.select({ id: tbl.id }).from(tbl).where(
    and(
      isNotNull(deletedCol),
      or(
        ilike(nameCol, name.trim()),
        ilike(nameCol, `Chef ${normalized}`),
        sql`LOWER(REPLACE(${nameCol}, 'Chef ', '')) = ${normalized}`
      )
    )
  ).limit(1);

  return deleted.length > 0;
}

function detectHostRole(roleText: string | undefined): 'sommelier' | 'mixologist' | 'whisky_ambassador' | 'wine_director' | 'beverage_director' | 'bartender' | 'other' {
  if (!roleText) return 'other';
  const role = roleText.toLowerCase();
  if (role.includes('sommelier')) return 'sommelier';
  if (role.includes('mixologist')) return 'mixologist';
  if (role.includes('whisky') || role.includes('whiskey') || role.includes('ambassador')) return 'whisky_ambassador';
  if (role.includes('wine') && role.includes('director')) return 'wine_director';
  if (role.includes('beverage') && role.includes('director')) return 'beverage_director';
  if (role.includes('bartender')) return 'bartender';
  return 'other';
}

async function findOrCreateChef(name: string, bio?: string, style?: string, region?: string): Promise<string | null> {
  const rawName = name.trim();
  const normalizedName = normalizeChefName(rawName);
  const canonicalName = rawName.toLowerCase().startsWith('chef ') ? rawName : `Chef ${rawName.replace(/^(chef|chef de cuisine|executive chef|head chef)\s+/i, '')}`;
  const slug = generateSlug(canonicalName);

  if (await isDeletedProfile(rawName, 'chef')) {
    console.log(`Skipping deleted chef: "${rawName}"`);
    return null;
  }
  
  const existing = await db.select({ id: chefs.id, name: chefs.name }).from(chefs).where(
    and(
      isNull(chefs.deletedAt),
      or(
        eq(chefs.slug, slug),
        ilike(chefs.name, rawName),
        ilike(chefs.name, `Chef ${normalizedName}`),
        sql`LOWER(REPLACE(${chefs.name}, 'Chef ', '')) = ${normalizedName}`
      )
    )
  ).limit(1);
  
  if (existing.length > 0) {
    console.log(`Found existing chef match: "${rawName}" → "${existing[0].name}"`);
    return existing[0].id;
  }
  
  const nameParts = normalizedName.split(' ');
  if (nameParts.length === 1 && nameParts[0].length > 2) {
    const partialMatch = await db.select({ id: chefs.id, name: chefs.name }).from(chefs).where(
      and(
        isNull(chefs.deletedAt),
        sql`LOWER(REPLACE(${chefs.name}, 'Chef ', '')) LIKE ${nameParts[0] + ' %'}`
      )
    ).limit(1);
    
    if (partialMatch.length > 0) {
      console.log(`Found partial chef match: "${rawName}" → "${partialMatch[0].name}" (first name match)`);
      return partialMatch[0].id;
    }
  }

  const allActiveChefs = await db.select({ id: chefs.id, name: chefs.name }).from(chefs).where(isNull(chefs.deletedAt));
  for (const chef of allActiveChefs) {
    const dbNormalized = normalizeChefName(chef.name);
    if (isFuzzyMatch(normalizedName, dbNormalized)) {
      console.log(`Found fuzzy chef match: "${rawName}" → "${chef.name}" (edit distance <= 2)`);
      return chef.id;
    }
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
    name: canonicalName,
    slug: uniqueSlug,
    bio: bio || null,
    culinaryStyle: style || null,
    region: region || null,
    verified: false,
  };
  
  const [created] = await db.insert(chefs).values(newChef).returning({ id: chefs.id });
  console.log(`Created new chef: ${canonicalName} (${created.id})`);
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

async function findOrCreateHost(name: string, bio?: string, roleText?: string, region?: string): Promise<string | null> {
  const rawName = name.trim();
  const normalizedName = normalizeHostName(rawName);
  const slug = generateSlug(rawName);
  const role = detectHostRole(roleText);

  if (await isDeletedProfile(rawName, 'host')) {
    console.log(`Skipping deleted host: "${rawName}"`);
    return null;
  }
  
  const existing = await db.select({ id: hosts.id, name: hosts.name }).from(hosts).where(
    and(
      isNull(hosts.deletedAt),
      or(
        eq(hosts.slug, slug),
        ilike(hosts.name, rawName),
        sql`LOWER(${hosts.name}) = ${normalizedName}`
      )
    )
  ).limit(1);
  
  if (existing.length > 0) {
    console.log(`Found existing host match: "${rawName}" → "${existing[0].name}"`);
    return existing[0].id;
  }

  const allActiveHosts = await db.select({ id: hosts.id, name: hosts.name }).from(hosts).where(isNull(hosts.deletedAt));
  for (const host of allActiveHosts) {
    const dbNormalized = normalizeHostName(host.name);
    if (isFuzzyMatch(normalizedName, dbNormalized)) {
      console.log(`Found fuzzy host match: "${rawName}" → "${host.name}" (edit distance <= 2)`);
      return host.id;
    }
  }

  const chefMatch = await db.select({ id: chefs.id, name: chefs.name }).from(chefs).where(
    and(
      isNull(chefs.deletedAt),
      or(
        ilike(chefs.name, rawName),
        ilike(chefs.name, `Chef ${normalizedName}`),
        sql`LOWER(REPLACE(${chefs.name}, 'Chef ', '')) = ${normalizedName}`
      )
    )
  ).limit(1);
  if (chefMatch.length > 0) {
    console.log(`Warning: Host "${rawName}" also exists as chef "${chefMatch[0].name}" — creating separate host profile`);
  }
  
  let uniqueSlug = slug;
  let counter = 1;
  while (true) {
    const [slugExists] = await db.select({ id: hosts.id }).from(hosts).where(eq(hosts.slug, uniqueSlug)).limit(1);
    if (!slugExists) break;
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }
  
  const newHost: InsertHost = {
    name: rawName,
    slug: uniqueSlug,
    bio: bio || null,
    role: role,
    roleTitle: roleText || null,
    specialty: null,
    region: region || null,
    verified: false,
  };
  
  const [createdHost] = await db.insert(hosts).values(newHost).returning({ id: hosts.id });
  console.log(`Created new host: ${rawName} (${createdHost.id})`);
  return createdHost.id;
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

export async function persistAiDiscoveries(discoveredEvents: AiDiscoveredEvent[], location: string): Promise<{ chefsCreated: number; venuesCreated: number; hostsCreated: number; eventsCreated: number }> {
  let chefsCreated = 0;
  let venuesCreated = 0;
  let hostsCreated = 0;
  let eventsCreated = 0;
  
  const chefCache = new Map<string, string | null>();
  const venueCache = new Map<string, string>();
  const hostCache = new Map<string, string | null>();
  
  for (const aiEvent of discoveredEvents) {
    try {
      let chefId: string | null = null;
      let venueId: string | null = null;
      let hostId: string | null = null;
      
      if (aiEvent.chefName && aiEvent.chefName.trim()) {
        const chefKey = normalizeChefName(aiEvent.chefName);
        
        if (chefCache.has(chefKey)) {
          chefId = chefCache.get(chefKey) ?? null;
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
      
      if (aiEvent.hostName && aiEvent.hostName.trim()) {
        const hostKey = normalizeHostName(aiEvent.hostName);
        
        if (hostCache.has(hostKey)) {
          hostId = hostCache.get(hostKey) ?? null;
        } else {
          const [existingCount] = await db.select({ count: sql<number>`count(*)` }).from(hosts);
          hostId = await findOrCreateHost(
            aiEvent.hostName,
            aiEvent.hostBio,
            aiEvent.hostRole,
            location
          );
          const [newCount] = await db.select({ count: sql<number>`count(*)` }).from(hosts);
          if (Number(newCount.count) > Number(existingCount.count)) hostsCreated++;
          hostCache.set(hostKey, hostId);
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
        hostId,
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
  
  console.log(`AI Ingestion complete: ${chefsCreated} chefs, ${hostsCreated} hosts, ${venuesCreated} venues, ${eventsCreated} events created`);
  return { chefsCreated, venuesCreated, hostsCreated, eventsCreated };
}
