# TableSocial

A private dining experiences discovery platform built with React, TypeScript, and Vite.

## Overview

TableSocial helps users discover unique private dining events, chef's tables, and pop-up dining experiences. The app uses Google's Gemini AI with web search grounding to find real culinary events in a given location.

## Tech Stack

- **Frontend**: React 19, TypeScript
- **Build Tool**: Vite  
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS (via CDN)
- **AI Integration**: Google Gemini AI (@google/genai) with Google Search grounding

## Project Structure

```
├── components/          # React components
│   ├── EventCard.tsx    # Event display with AI badge
│   ├── EventModal.tsx   # Event details with source URLs
│   └── ...
├── server/
│   ├── index.ts         # Express server entry
│   ├── routes.ts        # API routes including /api/discover
│   └── db.ts            # Database connection
├── shared/
│   └── schema.ts        # Drizzle database schema
├── App.tsx              # Main application component
└── types.ts             # TypeScript type definitions
```

## AI Event Discovery

The `/api/discover` endpoint uses Gemini AI with Google Search grounding to find real events:

1. Database events are prioritized (if >= 3 exist, AI is skipped)
2. Cached AI events are loaded from the database
3. Gemini searches the web for new dining events from sources like:
   - Local catering companies (hobfinefoods.ca, etc.)
   - Event platforms (Showpass, Eventbrite, Do250)
   - Hotel restaurant event calendars
4. Events are validated to require:
   - Named chef (first + last name, who cooks the food)
   - Named host (whisky ambassador, sommelier, if different from chef)
   - Real venue name and address in the searched city
   - Source URL for verification
   - Specific future date
   - Venue not on closed venues list (e.g., OLO restaurant)
5. Valid events are cached and accumulated across searches
6. Smart deduplication merges duplicate events
7. Results are sorted chronologically (earliest first)

## Smart Event Deduplication

Events are deduplicated using a multi-step process:

1. **Title Normalization**: Extract signature tokens (brand names like Highland Park, InchDairnie, Bearface), normalize whisky/whiskey spelling, remove generic words
2. **Brand-based Grouping**: Events with same brand token on the same date are grouped
3. **Source URL Scoring**: Authoritative sources prioritized (Showpass > official sites > Google redirect URLs)
4. **Best Event Selection**: The event from the most authoritative source is kept
5. **Source Aggregation**: All source URLs from merged duplicates are preserved

This reduces 100+ cached variants down to ~8-10 unique events.

## Chef vs Host Distinction

- **Chef** (chefName): The person COOKING the food (e.g., "Landon Crawford")
- **Host** (hostName): The person PRESENTING (e.g., whisky ambassador, sommelier)

Examples:
- Whisky dinner: Chef cooks, Whisky Ambassador hosts
- Wine pairing: Chef cooks, Sommelier hosts
- Chef's table: Chef does both

## Environment Variables

- `GEMINI_API_KEY`: Required for AI-powered event discovery
- `DATABASE_URL`: PostgreSQL connection string

## Development

The app runs on port 5000:

```bash
npm run dev
```

## Building for Production

```bash
npm run build
```

## SEO-Friendly Pages

Individual chef and event pages with SEO-friendly URLs and Schema.org JSON-LD structured data:

- `/chef/:slug` - Chef profile pages with Person schema (includes jobTitle, workLocation, sameAs)
- `/event/:slug` - Event detail pages with FoodEvent schema (includes offers, location, performer)

API endpoints:
- `GET /api/chef/:slug` - Returns chef data with upcoming events and JSON-LD
- `GET /api/event/:slug` - Returns event data with chef/venue details and JSON-LD

Auto-slug generation: Slugs are auto-generated from titles when chefs/events are created via admin.

## AI Auto-Ingestion

AI-discovered content is automatically saved to the database for admin review:

- **Service**: `server/services/aiIngestion.ts`
- **Trigger**: Runs asynchronously after smart deduplication in `/api/discover`
- **Behavior**: 
  - Chefs, venues, and events are created as drafts with `origin="ai"` and `status="draft"`
  - Name normalization prevents duplicates (strips "Chef", "Restaurant" prefixes)
  - In-memory caching avoids duplicate DB queries within a batch
  - Slug-based and fuzzy name matching ensure deduplication

## Recent Changes (January 2026)

- Added AI auto-ingestion to persist discovered chefs, venues, and events to database
- Added SEO-friendly individual pages for chefs (/chef/:slug) and events (/event/:slug)
- Implemented Schema.org JSON-LD structured data for search engine discoverability
- Added URL-based SPA routing with browser history support
- Added slug, heroImageId, publishedAt fields to database schema
- Created media_assets table for organized image management
- Implemented smart event deduplication to eliminate duplicate AI-discovered events
- Added closed venue validation (OLO restaurant, etc.)
- Added source URL scoring for authoritative source selection
- Fixed invalid title filtering (garbage titles like "eventbrite.com")
- Improved brand token extraction for whisky/wine dinners
- Fixed production deployment routing (API paths now bypass catch-all middleware)
- Added slug editing and publish toggle UI to Chef and Event admin forms
- Fixed publishedAt logic to preserve timestamps when editing published content
- Added "View" links in admin tables for published chefs/events
