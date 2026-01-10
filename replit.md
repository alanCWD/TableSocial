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
2. Gemini searches the web for real dining events
3. Events are validated to require:
   - Real chef name (not "Guest Chef")
   - Real venue name and address
   - Source URL for verification
4. Invalid/fictional events are filtered out
5. Valid events are marked with `isAiGenerated: true`

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
