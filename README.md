# TableSocial

A private dining discovery platform for Victoria, BC. Uses Google Gemini AI with web search grounding to find real culinary events (chef's tables, whisky dinners, wine pairings, pop-up dinners).

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Set required secrets in Replit's Secrets panel (or as environment variables):
   - `GEMINI_API_KEY` — Google Gemini API key for event discovery
   - `SESSION_SECRET` — Random string for session security
   - `DATABASE_URL` — PostgreSQL connection string
3. Run the app: `npm run dev`

## Security Notes

- All API keys must be stored in Replit Secrets (or server-side environment variables), never in source code or committed files
- The Gemini API is called server-side only; the key is never exposed to the browser
- Never commit `.env`, `.env.local`, or any file containing real credentials
