import { GoogleGenAI } from "@google/genai";

interface InstagramPost {
  id: string;
  caption?: string;
  mediaType: string;
  mediaUrl?: string;
  permalink: string;
  timestamp: string;
  username?: string;
}

interface ParsedEvent {
  title: string;
  description?: string;
  date?: string;
  time?: string;
  price?: number | null;
  chefName?: string;
  hostName?: string;
  venueName?: string;
  venueAddress?: string;
  venueCity?: string;
  category?: string;
  sourceUrl: string;
  menuHighlights?: string[];
  imageUrl?: string | null;
}

function normalizeChefName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim();
  if (trimmed.toLowerCase().startsWith('chef ')) {
    return 'Chef ' + trimmed.slice(5).trim();
  }
  return 'Chef ' + trimmed;
}

const DINING_HASHTAGS = [
  "limitedseats",
  "popupdinner",
  "privatechef",
  "chefstable",
  "secretsupper",
  "undergrounddining",
  "popuprestaurant",
  "exclusivedining",
  "intimatedining"
];

export async function searchInstagramHashtags(location: string): Promise<ParsedEvent[]> {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igBusinessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  
  if (!accessToken || !igBusinessAccountId) {
    console.log("Instagram API credentials not configured");
    return [];
  }
  
  const allPosts: InstagramPost[] = [];
  
  for (const hashtag of DINING_HASHTAGS.slice(0, 3)) {
    try {
      const hashtagId = await getHashtagId(hashtag, igBusinessAccountId, accessToken);
      if (!hashtagId) continue;
      
      const posts = await getRecentMediaForHashtag(hashtagId, igBusinessAccountId, accessToken);
      allPosts.push(...posts);
      
      await new Promise(r => setTimeout(r, 500));
    } catch (error) {
      console.error(`Error searching hashtag #${hashtag}:`, error);
    }
  }
  
  console.log(`Found ${allPosts.length} Instagram posts across hashtags`);
  
  if (allPosts.length === 0) return [];
  
  const parsedEvents = await parsePostsWithGemini(allPosts, location);
  
  return parsedEvents;
}

async function getHashtagId(hashtag: string, igBusinessAccountId: string, accessToken: string): Promise<string | null> {
  try {
    const url = `https://graph.facebook.com/v18.0/ig_hashtag_search?user_id=${igBusinessAccountId}&q=${encodeURIComponent(hashtag)}&access_token=${accessToken}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      console.error(`Hashtag search error for #${hashtag}:`, data.error.message);
      return null;
    }
    
    if (data.data && data.data.length > 0) {
      return data.data[0].id;
    }
    
    return null;
  } catch (error) {
    console.error(`Failed to get hashtag ID for #${hashtag}:`, error);
    return null;
  }
}

async function getRecentMediaForHashtag(hashtagId: string, igBusinessAccountId: string, accessToken: string): Promise<InstagramPost[]> {
  try {
    const fields = "id,caption,media_type,media_url,permalink,timestamp";
    const url = `https://graph.facebook.com/v18.0/${hashtagId}/recent_media?user_id=${igBusinessAccountId}&fields=${fields}&limit=25&access_token=${accessToken}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      console.error(`Recent media error:`, data.error.message);
      return [];
    }
    
    if (data.data && Array.isArray(data.data)) {
      return data.data.map((post: any) => ({
        id: post.id,
        caption: post.caption,
        mediaType: post.media_type,
        mediaUrl: post.media_url,
        permalink: post.permalink,
        timestamp: post.timestamp
      }));
    }
    
    return [];
  } catch (error) {
    console.error(`Failed to get recent media:`, error);
    return [];
  }
}

async function parsePostsWithGemini(posts: InstagramPost[], location: string): Promise<ParsedEvent[]> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.log("Gemini API key not configured for caption parsing");
    return [];
  }
  
  const genAI = new GoogleGenAI({ apiKey: geminiApiKey });
  const parsedEvents: ParsedEvent[] = [];
  
  const relevantPosts = posts.filter(post => {
    if (!post.caption) return false;
    const caption = post.caption.toLowerCase();
    return (
      caption.includes(location.toLowerCase()) ||
      caption.includes("dinner") ||
      caption.includes("dining") ||
      caption.includes("chef") ||
      caption.includes("tasting") ||
      caption.includes("course") ||
      caption.includes("reservation") ||
      caption.includes("seats") ||
      caption.includes("limited")
    );
  });
  
  console.log(`Parsing ${relevantPosts.length} relevant Instagram posts with Gemini`);
  
  for (const post of relevantPosts.slice(0, 10)) {
    try {
      const prompt = `Extract dining event details from this Instagram caption. Return JSON only.

Caption: "${post.caption}"

If this is about a private dining event, chef's table, pop-up dinner, or similar exclusive dining experience, extract:
- title: Event name or create one from context
- description: Brief description
- date: Date in YYYY-MM-DD format (if mentioned, use 2026 for upcoming dates)
- time: Time in HH:MM format (if mentioned)
- price: Price per person as number (if mentioned)
- chefName: Chef's full name (first + last)
- hostName: Host name if different from chef
- venueName: Restaurant or venue name
- venueAddress: Full address if mentioned
- venueCity: City name (prefer "${location}" if relevant)
- category: One of "chef's table", "pop-up", "wine dinner", "whisky dinner", "tasting menu", or "private dining"
- menuHighlights: Array of dish names if mentioned

If this is NOT about a dining event, return: { "isEvent": false }

Return ONLY valid JSON, no markdown.`;

      const response = await genAI.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt
      });
      
      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        if (parsed.isEvent === false) continue;
        
        if (parsed.title && (parsed.date || parsed.venueName || parsed.chefName)) {
          parsedEvents.push({
            title: parsed.title,
            description: parsed.description,
            date: parsed.date,
            time: parsed.time,
            price: parsed.price ? Number(parsed.price) : null,
            chefName: parsed.chefName ? normalizeChefName(parsed.chefName) : undefined,
            hostName: parsed.hostName,
            venueName: parsed.venueName,
            venueAddress: parsed.venueAddress,
            venueCity: parsed.venueCity || location,
            category: parsed.category,
            sourceUrl: post.permalink,
            menuHighlights: parsed.menuHighlights,
            imageUrl: post.mediaUrl || null
          });
        }
      }
    } catch (error) {
      console.error(`Error parsing Instagram post:`, error);
    }
  }
  
  console.log(`Successfully parsed ${parsedEvents.length} events from Instagram`);
  return parsedEvents;
}

export async function testInstagramConnection(): Promise<{ success: boolean; message: string; details?: any }> {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igBusinessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  
  if (!accessToken) {
    return { success: false, message: "INSTAGRAM_ACCESS_TOKEN not configured" };
  }
  
  if (!igBusinessAccountId) {
    return { success: false, message: "INSTAGRAM_BUSINESS_ACCOUNT_ID not configured" };
  }
  
  // Check if this looks like an app access token (APP_ID|APP_SECRET format)
  if (accessToken.includes('|')) {
    return {
      success: false,
      message: "The token appears to be an App Access Token (format: APP_ID|SECRET). Instagram Graph API requires a User Access Token generated through OAuth with instagram_basic permissions. Please generate a long-lived user access token from the Facebook Developer Console.",
      details: { tokenType: "app_access_token", hint: "Generate a user token via Facebook Login flow or Graph API Explorer" }
    };
  }
  
  try {
    const url = `https://graph.facebook.com/v18.0/${igBusinessAccountId}?fields=id,username&access_token=${accessToken}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      // Check for common permission errors
      if (data.error.code === 100 || data.error.code === 190) {
        return { 
          success: false, 
          message: `Token or permissions issue: ${data.error.message}. Make sure the access token is a User Access Token with instagram_basic and instagram_manage_insights permissions.`,
          details: data.error
        };
      }
      return { 
        success: false, 
        message: `API Error: ${data.error.message}`,
        details: data.error
      };
    }
    
    return { 
      success: true, 
      message: `Connected to Instagram account: ${data.username || data.id}`,
      details: data
    };
  } catch (error: any) {
    return { 
      success: false, 
      message: `Connection failed: ${error.message}` 
    };
  }
}
