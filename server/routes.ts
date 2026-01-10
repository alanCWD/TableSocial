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
        const today = new Date();
        const currentDateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        
        const prompt = `Today's date is ${currentDateStr}. Search the web for UPCOMING private dining events, chef's tables, pop-up dinners, whisky dinners, and exclusive culinary experiences in ${location}.

CRITICAL: Only include events happening AFTER ${currentDateStr}. Do NOT include any past events.

IMPORTANT SOURCES TO CHECK:
- hotelgrandpacific.com/dining-events/ (Highland Park Whisky Dinner, InchDairnie Whisky Dinner, and other dining events)
- Local restaurant websites and event listings
- Eventbrite and similar event platforms

Return a JSON array of 3-5 FUTURE events only. Each event object must have exactly these fields:
{
  "title": "Event name",
  "description": "2-3 sentences about the experience",
  "date": "Month Day, Year",
  "time": "7:00 PM",
  "price": 150,
  "category": "Pop-up",
  "sourceUrl": "https://example.com/event",
  "chefName": "Chef's full name",
  "chefBio": "Brief chef background",
  "chefCulinaryStyle": "Cuisine specialty",
  "chefWebsite": "https://chef-website.com",
  "chefInstagram": "https://instagram.com/chef",
  "venueName": "Venue name only",
  "venueAddress": "123 Street, City, Province PostalCode",
  "venueDescription": "Brief venue description",
  "menuHighlights": ["Dish 1", "Dish 2", "Dish 3"]
}

Important:
- ONLY include events with dates AFTER ${currentDateStr}
- Keep venueName short (just the venue name, not the full address)
- Keep venueAddress as a single clean address string
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
          const hasRealChef = ev.chefName && ev.chefName.trim() !== "" && ev.chefName.toLowerCase() !== "guest chef";
          const hasRealVenue = ev.venueName && ev.venueName.trim() !== "";
          const hasVenueAddress = ev.venueAddress && ev.venueAddress.trim() !== "" && ev.venueAddress.toLowerCase() !== "tbd";
          const hasSourceUrl = ev.sourceUrl && ev.sourceUrl.trim() !== "";
          
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
            } catch (e) {
              // If date parsing fails, keep the event
            }
          }
          
          if (!hasTitle || !hasRealChef || !hasRealVenue || !hasVenueAddress || !hasSourceUrl) {
            console.log(`Filtering out AI event: "${ev.title}" - missing: chef=${!hasRealChef}, venue=${!hasRealVenue}, address=${!hasVenueAddress}, source=${!hasSourceUrl}`);
            return false;
          }
          return isFutureEvent;
        });
        
        console.log(`AI events after validation: ${validAiEvents.length} of ${aiEvents.length} passed`);

        const enhancedAiEvents = validAiEvents.map((ev: any, i: number) => ({
          id: `ai-event-${Date.now()}-${i}`,
          title: ev.title,
          description: ev.description || "",
          date: ev.date || "Coming Soon",
          time: ev.time || "7:00 PM",
          price: ev.price || 150,
          totalSeats: ev.totalSeats || 12,
          availableSeats: ev.availableSeats || 8,
          category: ev.category || "Pop-up",
          menuHighlights: ev.menuHighlights || [],
          imageUrl: ev.imageUrl || null,
          sourceUrl: ev.sourceUrl || null,
          isAiGenerated: true,
          chef: {
            id: `ai-chef-${Date.now()}-${i}`,
            name: ev.chefName,
            bio: ev.chefBio || "",
            culinaryStyle: ev.chefCulinaryStyle || "",
            imageUrl: null,
            verified: false,
            pastEventsCount: 0,
            socialLinks: {
              instagram: ev.chefInstagram || null,
              website: ev.chefWebsite || null,
              twitter: ev.chefTwitter || null,
            },
          },
          venue: {
            id: `ai-venue-${Date.now()}-${i}`,
            name: ev.venueName,
            description: ev.venueDescription || "",
            fullAddress: ev.venueAddress || "",
            capacity: 20,
            images: [],
            atmosphere: [],
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
