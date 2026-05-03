# Threat Model

## Project Overview

TableSocial is a public-facing dining discovery application with a React frontend and an Express/TypeScript backend backed by PostgreSQL via Drizzle ORM. Public users can browse curated dining events and trigger AI-assisted event discovery by location. Authenticated users can access an admin surface that manages chefs, hosts, venues, events, AI ingestion review, and Instagram diagnostics. The server also integrates with Replit Auth (OIDC), Gemini web-grounded search, Instagram Graph API, and Replit object storage.

## Assets

- **Admin content authority** — the ability to create, publish, modify, or delete chefs, hosts, venues, and events. Compromise affects site integrity and public trust.
- **Application-backed external API quota and secrets** — Gemini and Instagram integrations run with server-held credentials and can consume paid or rate-limited resources.
- **Uploaded media and object storage paths** — image uploads influence public content and can consume storage or expose private objects if access control is weak.
- **User sessions and identity claims** — Replit-authenticated sessions gate privileged operations and must not be forgeable or over-broad.
- **Stored event and profile data** — event descriptions, source URLs, venue addresses, and profile metadata are public-facing and must not be modifiable by unauthorized users.

## Trust Boundaries

- **Browser to API** — all client input, including admin actions, location searches, and upload requests, crosses from an untrusted browser into the Express server.
- **API to PostgreSQL** — the server can read and write all application data and sessions; server-side authorization failures immediately become data integrity issues.
- **API to external AI/social services** — the server invokes Gemini and Instagram with privileged credentials, so public endpoints that trigger those calls must resist abuse.
- **API to object storage** — upload URLs and object serving endpoints cross into storage infrastructure and require explicit access-control decisions.
- **Authenticated user to admin capability** — login alone is not sufficient to justify content-management powers; admin authority must be separately enforced server-side.
- **Production vs dev-only artifacts** — `dist/`, `attached_assets/`, and local task files are generally not production attack surface unless specifically routed or served.

## Scan Anchors

- **Production entry points**: `server/index.ts`, `server/routes.ts`, `server/replit_integrations/auth/*`, `server/replit_integrations/object_storage/*`
- **Highest-risk areas**: `/api/admin/*`, `/api/discover`, Instagram/Gemini services, object storage upload/read routes
- **Surface split**: public browsing and discovery endpoints are unauthenticated; admin CRUD and diagnostics should be privileged; object/media paths are consumed by public pages
- **Usually out of scope unless reachable**: `dist/`, `attached_assets/`, `.agents/`, `.cache/`, local task artifacts

## Threat Categories

### Spoofing

The application relies on Replit OIDC and server-stored sessions for identity. The system must validate authenticated sessions on every protected route and must not treat any valid login as equivalent to an administrator. Logout and callback flows must not trust attacker-controlled host information in a way that changes security-sensitive redirects.

### Tampering

Public users must never be able to alter chefs, hosts, venues, events, AI-ingestion review state, or media references. All content-management operations must be protected by server-side authorization, not UI visibility. Uploaded media paths and object references must only be issued and bound in ways that preserve ownership and intended visibility.

### Information Disclosure

Private object-storage content, integration diagnostics, and any server-returned metadata must only be exposed to the intended audience. Public pages may show published event/profile data, but internal diagnostics and non-public objects must not become world-readable through convenience routes or missing ACL enforcement.

### Denial of Service

Public endpoints must not allow attackers to trigger expensive or rate-limited work without bounds. In this project, `/api/discover` is the primary concern because it can invoke Gemini, search grounding, Instagram lookups, caching, and asynchronous persistence. Upload endpoints must also prevent unauthenticated storage abuse and unbounded object creation.

### Elevation of Privilege

The highest-risk failure mode is broken server-side authorization on admin routes. The system must enforce a real admin boundary separate from mere authentication. File upload and object-serving routes must also enforce ownership or explicit public visibility so that arbitrary users cannot gain write/read access to storage-backed content.