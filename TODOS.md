# NYC Fix Tracker — Open TODOs

## P1 — Must-have before launch

- [ ] **Socrata app token** — register free token at data.cityofnewyork.us, set as `SOCRATA_APP_TOKEN` in Vercel env vars (server-only, not `NEXT_PUBLIC_`). Without it, rate-limited to ~1k req/hr shared IP.
- [ ] **Supabase schema** — create `votes` table (`id uuid PK`, `sighting_id text`, `vote int CHECK(-1,1)`, `created_at timestamptz`, `ip_hash text`) + enable real-time on the table.
- [ ] **Supabase vote dedup** — store voted sighting IDs in `localStorage` keyed as `vote:{sighting_id}` to prevent re-votes on refresh. Server-side: rate-limit by `ip_hash` (SHA-256 of X-Forwarded-For) at the API route level.
- [ ] **Mapbox dynamic import** — `dynamic(() => import('./components/Map'), { ssr: false })` must wrap the Mapbox component to prevent SSR crash on `window` access.
- [ ] **Claude API ISR key** — `ANTHROPIC_API_KEY` in Vercel env vars, used only at ISR build time (not client-exposed).
- [ ] **TikTok oEmbed server-side** — fetch oEmbed data in Next.js server components (not client-side). TikTok blocks browser CORS on their oEmbed endpoint.

## P2 — Quality / correctness

- [ ] **Null lat/lng guard** — some 311 records have missing coordinates. Filter in the mapper (`lib/311-api.ts`) before passing to map: `if (!record.latitude || !record.longitude) return null`.
- [ ] **Missing closed_date handling** — stats "avg resolution time" calculation must handle records where `closed_date` is null (open complaints). Exclude from average; count separately as "open."
- [ ] **oEmbed failure fallback** — if a TikTok URL 404s or times out at build time, render a text-only card with title + link-out instead of crashing the build.
- [ ] **Supabase down fallback** — if Supabase WebSocket fails, vote buttons should show static counts (last known) and disable new votes with a tooltip "Voting temporarily unavailable."
- [ ] **Vote dislike feedback loop** — if a sighting accumulates net negative votes (dislike > like by threshold), surface this to the AI curation prompt on next ISR cycle so it can deprioritize or drop it. (Threshold TBD — start at -5.)

## P3 — Polish

- [ ] **`prefers-reduced-motion`** — wrap all Framer Motion animations in `useReducedMotion()`. If true: DetailCard entrance = instant, vote bounce = instant, ticker = paused.
- [ ] **Focus restoration on sheet close** — when DetailCard (bottom sheet or side panel) closes, return focus to the pin marker that opened it.
- [ ] **Pin icon outer ring** — Lucide icons render as flat SVG. Wrap each in a `<svg>` container that adds a 3px black stroke circle behind the icon to achieve the comic-ink outlined pin look.
- [ ] **Ticker scroll performance** — use `will-change: transform` on the ticker inner element to promote to GPU compositing layer. Prevents jank on low-end mobile.
- [ ] **Vote spam prevention** — consider adding a simple time-gate: one vote per sighting per browser session (not just per page load). Use `sessionStorage` as secondary check.

## Design decisions resolved — no action needed

- Pin icons: Lucide React (`CircleDot`, `Landmark`, `Droplet`, `Leaf`, `Star`)
- Halftone texture: CSS `radial-gradient`, 8px grid, 15% opacity
- Vote storage: Supabase Postgres + real-time WebSocket
- Detail card responsive: side panel 360px (desktop ≥768px), bottom sheet 80% (mobile)
- Ticker on mobile: hidden from map view, shown above list in Spotted tab
- AI curation: Claude API at ISR build time (revalidate: 3600), top 10 sightings with CRITICAL/HIGH/NOTABLE tier assignment
