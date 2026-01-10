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
5. Valid events are cached and accumulated across searches
6. Events are deduplicated by normalized title + date
7. Results are sorted chronologically (earliest first)

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
