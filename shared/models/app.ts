import { sql, relations } from "drizzle-orm";
import { pgTable, varchar, text, integer, timestamp, boolean, jsonb, pgEnum, index, uniqueIndex } from "drizzle-orm/pg-core";

export const eventStatusEnum = pgEnum("event_status", ["draft", "published", "archived"]);
export const eventOriginEnum = pgEnum("event_origin", ["admin", "ai"]);
export const mediaTypeEnum = pgEnum("media_type", ["image", "video"]);

export const mediaAssets = pgTable("media_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  objectKey: varchar("object_key", { length: 512 }).notNull(),
  filename: varchar("filename", { length: 255 }),
  mimeType: varchar("mime_type", { length: 100 }),
  mediaType: mediaTypeEnum("media_type").default("image"),
  altText: varchar("alt_text", { length: 512 }),
  caption: text("caption"),
  width: integer("width"),
  height: integer("height"),
  fileSize: integer("file_size"),
  uploadedBy: varchar("uploaded_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_media_object_key").on(table.objectKey),
]);

export type MediaAsset = typeof mediaAssets.$inferSelect;
export type InsertMediaAsset = typeof mediaAssets.$inferInsert;

export const chefs = pgTable("chefs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique(),
  bio: text("bio"),
  culinaryStyle: varchar("culinary_style", { length: 255 }),
  region: varchar("region", { length: 255 }),
  verified: boolean("verified").default(false),
  socialLinks: jsonb("social_links").$type<{
    instagram?: string;
    website?: string;
    twitter?: string;
  }>(),
  imageUrl: varchar("image_url", { length: 1024 }),
  heroImageId: varchar("hero_image_id").references(() => mediaAssets.id),
  metaDescription: varchar("meta_description", { length: 320 }),
  pastEventsCount: integer("past_events_count").default(0),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_chefs_slug").on(table.slug),
]);

export const venues = pgTable("venues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique(),
  description: text("description"),
  capacity: integer("capacity"),
  fullAddress: varchar("full_address", { length: 512 }),
  city: varchar("city", { length: 100 }),
  images: jsonb("images").$type<string[]>().default([]),
  heroImageId: varchar("hero_image_id").references(() => mediaAssets.id),
  atmosphere: jsonb("atmosphere").$type<string[]>().default([]),
  metaDescription: varchar("meta_description", { length: 320 }),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_venues_slug").on(table.slug),
]);

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique(),
  category: varchar("category", { length: 100 }),
  description: text("description"),
  date: varchar("date", { length: 50 }),
  time: varchar("time", { length: 50 }),
  price: integer("price"),
  totalSeats: integer("total_seats"),
  availableSeats: integer("available_seats"),
  menuHighlights: jsonb("menu_highlights").$type<string[]>().default([]),
  imageUrl: varchar("image_url", { length: 1024 }),
  heroImageId: varchar("hero_image_id").references(() => mediaAssets.id),
  sourceUrls: jsonb("source_urls").$type<string[]>().default([]),
  chefId: varchar("chef_id").references(() => chefs.id),
  hostName: varchar("host_name", { length: 255 }),
  hostBio: text("host_bio"),
  hostRole: varchar("host_role", { length: 100 }),
  venueId: varchar("venue_id").references(() => venues.id),
  status: eventStatusEnum("status").default("draft"),
  origin: eventOriginEnum("origin").default("admin"),
  location: varchar("location", { length: 255 }),
  metaDescription: varchar("meta_description", { length: 320 }),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_events_slug").on(table.slug),
]);

export const aiIngestions = pgTable("ai_ingestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id),
  payload: jsonb("payload"),
  aiHash: varchar("ai_hash", { length: 64 }),
  locationQuery: varchar("location_query", { length: 255 }),
  retrievedAt: timestamp("retrieved_at").defaultNow(),
  approved: boolean("approved").default(false),
});

export const cachedAiEvents = pgTable("cached_ai_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  location: varchar("location", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  date: varchar("date", { length: 100 }),
  time: varchar("time", { length: 50 }),
  price: integer("price"),
  category: varchar("category", { length: 100 }),
  sourceUrl: varchar("source_url", { length: 1024 }),
  chefName: varchar("chef_name", { length: 255 }),
  chefBio: text("chef_bio"),
  chefStyle: varchar("chef_style", { length: 255 }),
  hostName: varchar("host_name", { length: 255 }),
  hostBio: text("host_bio"),
  hostRole: varchar("host_role", { length: 255 }),
  venueName: varchar("venue_name", { length: 255 }),
  venueAddress: varchar("venue_address", { length: 512 }),
  venueCity: varchar("venue_city", { length: 100 }),
  venueDescription: text("venue_description"),
  menuHighlights: jsonb("menu_highlights").$type<string[]>().default([]),
  cachedAt: timestamp("cached_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export type CachedAiEvent = typeof cachedAiEvents.$inferSelect;
export type InsertCachedAiEvent = typeof cachedAiEvents.$inferInsert;

export const chefsRelations = relations(chefs, ({ many }) => ({
  events: many(events),
}));

export const venuesRelations = relations(venues, ({ many }) => ({
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  chef: one(chefs, {
    fields: [events.chefId],
    references: [chefs.id],
  }),
  venue: one(venues, {
    fields: [events.venueId],
    references: [venues.id],
  }),
}));

export type Chef = typeof chefs.$inferSelect;
export type InsertChef = typeof chefs.$inferInsert;
export type Venue = typeof venues.$inferSelect;
export type InsertVenue = typeof venues.$inferInsert;
export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;
export type AiIngestion = typeof aiIngestions.$inferSelect;
export type InsertAiIngestion = typeof aiIngestions.$inferInsert;
