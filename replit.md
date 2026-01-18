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
- `INSTAGRAM_ACCESS_TOKEN`: Long-lived User Access Token for Instagram Graph API (requires instagram_basic permissions)
- `INSTAGRAM_BUSINESS_ACCOUNT_ID`: Instagram Business Account ID
- `FACEBOOK_APP_ID`: Facebook App ID
- `FACEBOOK_APP_SECRET`: Facebook App Secret

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

Individual chef, host, and event pages with SEO-friendly URLs and Schema.org JSON-LD structured data:

- `/chef/:slug` - Chef profile pages with Person schema (includes jobTitle, workLocation, sameAs)
- `/host/:slug` - Drink specialist profile pages with Person schema (includes role, specialty)
- `/event/:slug` - Event detail pages with FoodEvent schema (includes offers, location, performer)

API endpoints:
- `GET /api/chef/:slug` - Returns chef data with upcoming events and JSON-LD
- `GET /api/host/:slug` - Returns host data with related events and JSON-LD
- `GET /api/event/:slug` - Returns event data with chef/venue details and JSON-LD

Auto-slug generation: Slugs are auto-generated from titles when chefs/hosts/events are created via admin.

## Drink Specialists (Hosts)

The app supports drink specialists (sommeliers, mixologists, whisky ambassadors, etc.) with dedicated profiles:

- **Database Table**: `hosts` with role enum (sommelier, mixologist, whisky_ambassador, wine_director, beverage_director, bartender, other)
- **Events Link**: Events can have a `hostId` to associate drink specialists
- **Profile Pages**: `/host/:slug` for individual host profiles with JSON-LD
- **Navigation**: "For Drink Specialists" tab in main navigation
- **Admin Management**: Full CRUD via HostManager component

Host roles supported:
- Sommelier
- Mixologist
- Whisky Ambassador
- Wine Director
- Beverage Director
- Bartender
- Other (custom roleTitle)

AI Ingestion automatically detects host roles from discovered event data and creates host records.

## AI Auto-Ingestion

AI-discovered content is automatically saved to the database for admin review:

- **Service**: `server/services/aiIngestion.ts`
- **Trigger**: Runs asynchronously after smart deduplication in `/api/discover`
- **Behavior**: 
  - Chefs, venues, and events are created as drafts with `origin="ai"` and `status="draft"`
  - Name normalization prevents duplicates (strips "Chef", "Restaurant" prefixes)
  - In-memory caching avoids duplicate DB queries within a batch
  - Slug-based and fuzzy name matching ensure deduplication

## Chef Naming Convention

All chef names use the "Chef" prefix (e.g., "Chef Castro Boateng", "Chef Ito Takashi"). This is enforced:
- In the database: All chef records have "Chef" prefix
- In AI ingestion: New chefs are automatically created with "Chef" prefix
- In matching: First-name matching prevents duplicates (e.g., "Chef Ito" matches "Chef Ito Takashi")

## Unified Chef Data

The For Chefs page (`/for-chefs`) fetches chef data from the database API (`GET /api/chefs`) instead of static files. This ensures:
- Admin changes are immediately reflected on the public site
- Single source of truth for chef data
- Consistent display across all pages

## Instagram Event Discovery

The app can discover private dining events from Instagram posts using the Instagram Graph API:

- **Service**: `server/services/instagramDiscovery.ts`
- **Hashtags searched**: #limitedseats, #popupdinner, #privatechef, #chefstable, #secretsupper
- **Behavior**:
  - Searches Instagram hashtags for dining-related posts
  - Uses Gemini AI to parse captions and extract event details (date, venue, chef, price)
  - Merges Instagram events with web search results and database events
  - Filters by location relevance
  - Persists valid events to database as drafts

**Token Requirements**:
- INSTAGRAM_ACCESS_TOKEN must be a **User Access Token** (not an App Access Token)
- Generate via Facebook Login OAuth flow or Graph API Explorer
- Requires permissions: `instagram_basic`, `pages_show_list`

**Admin Endpoint**: `GET /api/admin/instagram-test` - Tests Instagram API connection

## Recent Changes (January 2026)

- **NEW**: Added complete "For Drink Specialists" feature with hosts database table
- **NEW**: Created HostPage, HostCard, ForDrinkSpecialists, and HostManager components
- **NEW**: Added /host/:slug routing with SEO-friendly profile pages
- **NEW**: EventCard now displays both chef and host with visual distinction (purple accent for hosts)
- **NEW**: AI ingestion auto-creates host records from discovered events with role detection
- Integrated Instagram Graph API for event discovery from dining hashtags
- Added source link buttons to EventCard showing where events were discovered (Tock, Instagram, Showpass, etc.)
- Connected AI-discovered events to database chef records for profile images
- Unified chef data system: For Chefs page now uses database API instead of static file
- Standardized chef naming with "Chef" prefix across all systems
- Improved AI ingestion chef matching to prevent duplicates
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
