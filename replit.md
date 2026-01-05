# TableSocial

A private dining experiences discovery platform built with React, TypeScript, and Vite.

## Overview

TableSocial helps users discover unique private dining events, chef's tables, and pop-up dining experiences. The app uses Google's Gemini AI to curate and find exclusive dining opportunities in a given location.

## Tech Stack

- **Frontend**: React 19, TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (via CDN)
- **AI Integration**: Google Gemini AI (@google/genai)

## Project Structure

```
├── components/       # React components
│   ├── ChefCard.tsx
│   ├── EventCard.tsx
│   ├── EventModal.tsx
│   ├── ForChefs.tsx
│   ├── HowItWorks.tsx
│   ├── Layout.tsx
│   └── ProfileOverlay.tsx
├── data/
│   └── chefRegistry.ts  # Verified chef data
├── services/
│   └── geminiService.ts # Gemini AI integration
├── App.tsx           # Main application component
├── index.html        # HTML entry point
├── index.tsx         # React entry point
├── types.ts          # TypeScript type definitions
└── vite.config.ts    # Vite configuration
```

## Environment Variables

- `GEMINI_API_KEY`: Required for AI-powered event discovery. Set this secret to enable the Gemini AI features.

## Development

The app runs on port 5000. Use the "Start application" workflow to run the development server:

```bash
npm run dev
```

## Building for Production

```bash
npm run build
```

The production build outputs to the `dist` directory.
