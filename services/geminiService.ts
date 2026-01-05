
import { GoogleGenAI, Type } from "@google/genai";
import { DiningEvent, GroundingSource, Chef } from "../types";
import { VERIFIED_CHEFS } from "../data/chefRegistry";

const getAI = () => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required. Please set it in your environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Normalizes a chef name for matching
 */
const matchChef = (name: string): Chef | null => {
  const normalizedSearch = name.toLowerCase().replace(/chef\s+/g, '').trim();
  return VERIFIED_CHEFS.find(c => 
    normalizedSearch.includes(c.name.toLowerCase()) || 
    c.name.toLowerCase().includes(normalizedSearch)
  ) || null;
};

export const fetchDiningEvents = async (location: string): Promise<{ events: DiningEvent[], sources: GroundingSource[] }> => {
  const prompt = `Find unique private dining events in ${location}. 
  Focus on long table dinners, chef pairings, and pop-ups by local Victoria chefs like Castro Boateng, Kyle Gerrard, or Paul Moran.
  Return a JSON array of objects with profiles for the Chef and the Venue.
  
  Requirements:
  - chef: { id, name, bio, culinaryStyle, imageUrl, socialLinks: { instagram, website }, pastEventsCount }
  - venue: { id, name, description, capacity, fullAddress, images: string[], atmosphere: string[] }
  - price, date, time, title, category, description, menuHighlights.`;

  try {
    const response = await getAI().models.generateContent({
      model: "gemini-3-flash-preview",
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

    const eventsJson = JSON.parse(response.text || "[]");
    
    const sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web) {
          sources.push({ title: chunk.web.title || "Reference", uri: chunk.web.uri });
        }
      });
    }

    const enhancedEvents = eventsJson.map((ev: any, i: number) => {
      // Reconcile with Verified Registry
      const verifiedChef = matchChef(ev.chef?.name || "");
      
      const chefData: Chef = verifiedChef ? {
        ...verifiedChef,
        // Preserve any dynamic social link additions if the AI found a specific event link
        socialLinks: { ...verifiedChef.socialLinks, ...ev.chef?.socialLinks }
      } : {
        ...ev.chef,
        id: ev.chef?.id || `gen-chef-${i}`,
        imageUrl: ev.chef?.imageUrl || `https://images.unsplash.com/photo-1583394293214-28dea15ee548?auto=format&fit=crop&q=80&w=400&sig=chef-${i}`,
        verified: false
      };

      return {
        ...ev,
        menuHighlights: ev.menuHighlights || [],
        imageUrl: ev.imageUrl || `https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=800&sig=event-${i}`,
        chef: chefData,
        venue: {
          ...ev.venue,
          name: ev.venue?.name || "Private Location",
          images: ev.venue?.images?.length ? ev.venue.images : [`https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1200&sig=venue-${i}`],
          atmosphere: ev.venue?.atmosphere || []
        }
      };
    });

    return { events: enhancedEvents, sources: Array.from(new Set(sources.map(s => s.uri))).map(uri => sources.find(s => s.uri === uri)!) };
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
};
