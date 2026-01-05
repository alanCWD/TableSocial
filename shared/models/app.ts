import { sql, relations } from "drizzle-orm";
import { pgTable, varchar, text, integer, timestamp, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core";

export const eventStatusEnum = pgEnum("event_status", ["draft", "published", "archived"]);
export const eventOriginEnum = pgEnum("event_origin", ["admin", "ai"]);

export const chefs = pgTable("chefs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
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
  pastEventsCount: integer("past_events_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const venues = pgTable("venues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  capacity: integer("capacity"),
  fullAddress: varchar("full_address", { length: 512 }),
  images: jsonb("images").$type<string[]>().default([]),
  atmosphere: jsonb("atmosphere").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  description: text("description"),
  date: varchar("date", { length: 50 }),
  time: varchar("time", { length: 50 }),
  price: integer("price"),
  totalSeats: integer("total_seats"),
  availableSeats: integer("available_seats"),
  menuHighlights: jsonb("menu_highlights").$type<string[]>().default([]),
  imageUrl: varchar("image_url", { length: 1024 }),
  chefId: varchar("chef_id").references(() => chefs.id),
  venueId: varchar("venue_id").references(() => venues.id),
  status: eventStatusEnum("status").default("draft"),
  origin: eventOriginEnum("origin").default("admin"),
  location: varchar("location", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiIngestions = pgTable("ai_ingestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id),
  payload: jsonb("payload"),
  aiHash: varchar("ai_hash", { length: 64 }),
  locationQuery: varchar("location_query", { length: 255 }),
  retrievedAt: timestamp("retrieved_at").defaultNow(),
  approved: boolean("approved").default(false),
});

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
