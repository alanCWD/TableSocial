import type { Express } from "express";
import { db } from "./db.js";
import { chefs, events, venues, aiIngestions } from "../shared/schema.js";
import { eq, and, gte, desc } from "drizzle-orm";
import { isAuthenticated } from "./replit_integrations/auth/index.js";
import { GoogleGenAI, Type } from "@google/genai";

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

  app.post("/api/admin/chefs", isAuthenticated, async (req, res) => {
    try {
      const [chef] = await db.insert(chefs).values(req.body).returning();
      res.json(chef);
    } catch (error) {
      console.error("Error creating chef:", error);
      res.status(500).json({ error: "Failed to create chef" });
    }
  });

  app.put("/api/admin/chefs/:id", isAuthenticated, async (req, res) => {
    try {
      const [chef] = await db
        .update(chefs)
        .set({ ...req.body, updatedAt: new Date() })
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

  app.post("/api/admin/venues", isAuthenticated, async (req, res) => {
    try {
      const [venue] = await db.insert(venues).values(req.body).returning();
      res.json(venue);
    } catch (error) {
      console.error("Error creating venue:", error);
      res.status(500).json({ error: "Failed to create venue" });
    }
  });

  app.put("/api/admin/venues/:id", isAuthenticated, async (req, res) => {
    try {
      const [venue] = await db
        .update(venues)
        .set({ ...req.body, updatedAt: new Date() })
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
      const [event] = await db.insert(events).values(req.body).returning();
      res.json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  app.put("/api/admin/events/:id", isAuthenticated, async (req, res) => {
    try {
      const [event] = await db
        .update(events)
        .set({ ...req.body, updatedAt: new Date() })
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

  app.get("/api/discover", async (req, res) => {
    try {
      const location = (req.query.location as string) || "Victoria, BC";
      
      let eventsWithRelations: any[] = [];
      try {
        const dbEvents = await db
          .select()
          .from(events)
          .where(eq(events.status, "published"))
          .orderBy(desc(events.createdAt));
        
        eventsWithRelations = await Promise.all(
          dbEvents.map(async (event) => {
            const chef = event.chefId
              ? (await db.select().from(chefs).where(eq(chefs.id, event.chefId)))[0]
              : null;
            const venue = event.venueId
              ? (await db.select().from(venues).where(eq(venues.id, event.venueId)))[0]
              : null;
            return { ...event, chef, venue };
          })
        );
      } catch (dbError) {
        console.error("Database error in discover:", dbError);
      }

      if (eventsWithRelations.length >= 3) {
        return res.json({ events: eventsWithRelations, sources: [] });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({ events: eventsWithRelations, sources: [] });
      }

      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `You are a culinary events researcher. Find REAL private dining events, chef's tables, pop-up dinners, and exclusive culinary experiences happening in or near ${location}.

REQUIREMENTS:
- Only include REAL events you can verify exist
- Dates must be in format "Month Day, Year" (e.g., "January 15, 2026") - use upcoming dates within the next 3 months
- Times must be in format like "7:00 PM"
- Prices should be realistic (typically $75-$350 per person)
- Include the chef's FULL NAME if known
- Include the venue's FULL ADDRESS if available
- Category must be one of: "Chef Pairing", "Long Table", "Pop-up", "Secret Location"

For each event, provide:
- title: The event name
- description: 2-3 sentences about the experience
- chef: Include name, bio (brief background), culinaryStyle (e.g., "French-Japanese fusion")
- venue: Include name, fullAddress, description of the space
- menuHighlights: 3-4 signature dishes or menu items
- sourceUrl: URL where this event was found (if available)

Return a JSON array of 3-5 events.`;

        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  category: { type: Type.STRING },
                  date: { type: Type.STRING },
                  time: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                  totalSeats: { type: Type.NUMBER },
                  availableSeats: { type: Type.NUMBER },
                  description: { type: Type.STRING },
                  menuHighlights: { type: Type.ARRAY, items: { type: Type.STRING } },
                  imageUrl: { type: Type.STRING },
                  sourceUrl: { type: Type.STRING },
                  chef: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING },
                      bio: { type: Type.STRING },
                      culinaryStyle: { type: Type.STRING },
                      imageUrl: { type: Type.STRING },
                      pastEventsCount: { type: Type.NUMBER },
                      socialLinks: {
                        type: Type.OBJECT,
                        properties: {
                          instagram: { type: Type.STRING },
                          website: { type: Type.STRING },
                          twitter: { type: Type.STRING }
                        }
                      }
                    },
                    required: ["id", "name"]
                  },
                  venue: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING },
                      description: { type: Type.STRING },
                      capacity: { type: Type.NUMBER },
                      fullAddress: { type: Type.STRING },
                      images: { type: Type.ARRAY, items: { type: Type.STRING } },
                      atmosphere: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                  }
                }
              }
            }
          },
        });

        let rawText = response.text || "[]";
        rawText = rawText.replace(/[\x00-\x1F\x7F]/g, ' ');
        
        let aiEvents: any[] = [];
        try {
          aiEvents = JSON.parse(rawText);
        } catch (parseError) {
          console.log("Initial JSON parse failed, attempting to fix...");
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

        const cuisineImages = [
          "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=800",
          "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800",
          "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&q=80&w=800",
          "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=800",
          "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=800",
        ];
        const chefImages = [
          "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=400",
          "https://images.unsplash.com/photo-1581299894007-aaa50297cf16?auto=format&fit=crop&q=80&w=400",
          "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&q=80&w=400",
        ];
        const venueImages = [
          "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1200",
          "https://images.unsplash.com/photo-1559329007-40df8a9345d8?auto=format&fit=crop&q=80&w=1200",
          "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&q=80&w=1200",
        ];

        const enhancedAiEvents = aiEvents.map((ev: any, i: number) => ({
          ...ev,
          id: ev.id || `ai-event-${Date.now()}-${i}`,
          isAiGenerated: true,
          date: ev.date || "Coming Soon",
          time: ev.time || "7:00 PM",
          price: ev.price || 150,
          totalSeats: ev.totalSeats || 12,
          availableSeats: ev.availableSeats || ev.totalSeats || 8,
          category: ev.category || "Pop-up",
          menuHighlights: ev.menuHighlights?.length ? ev.menuHighlights : ["Seasonal tasting menu", "Local ingredients", "Wine pairings"],
          imageUrl: ev.imageUrl || cuisineImages[i % cuisineImages.length],
          sourceUrl: ev.sourceUrl || null,
          chef: ev.chef ? {
            ...ev.chef,
            id: ev.chef.id || `ai-chef-${Date.now()}-${i}`,
            name: ev.chef.name || "Guest Chef",
            bio: ev.chef.bio || "A talented culinary artist bringing unique flavors to the table.",
            culinaryStyle: ev.chef.culinaryStyle || "Contemporary",
            imageUrl: ev.chef.imageUrl || chefImages[i % chefImages.length],
            socialLinks: ev.chef.socialLinks || {},
            verified: false,
            pastEventsCount: ev.chef.pastEventsCount || 0,
          } : {
            id: `ai-chef-${Date.now()}-${i}`,
            name: "Guest Chef",
            bio: "A talented culinary artist bringing unique flavors to the table.",
            culinaryStyle: "Contemporary",
            imageUrl: chefImages[i % chefImages.length],
            socialLinks: {},
            verified: false,
            pastEventsCount: 0,
          },
          venue: ev.venue ? {
            ...ev.venue,
            id: ev.venue.id || `ai-venue-${Date.now()}-${i}`,
            name: ev.venue.name || "Private Venue",
            description: ev.venue.description || "An intimate setting for an unforgettable dining experience.",
            fullAddress: ev.venue.fullAddress || location,
            capacity: ev.venue.capacity || 20,
            images: ev.venue.images?.length ? ev.venue.images : [venueImages[i % venueImages.length]],
            atmosphere: ev.venue.atmosphere?.length ? ev.venue.atmosphere : ["Intimate", "Elegant"],
          } : {
            id: `ai-venue-${Date.now()}-${i}`,
            name: "Private Venue",
            description: "An intimate setting for an unforgettable dining experience.",
            fullAddress: location,
            capacity: 20,
            images: [venueImages[i % venueImages.length]],
            atmosphere: ["Intimate", "Elegant"],
          },
        }));

        const combinedEvents = [...eventsWithRelations, ...enhancedAiEvents];
        res.json({ events: combinedEvents, sources: [...new Set(sources.map(s => s.uri))].map(uri => sources.find(s => s.uri === uri)!) });
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
