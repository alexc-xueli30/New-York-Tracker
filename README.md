# NYC Fix Tracker

Website: https://new-york-tracker-gmt9ytq92-alex-x-projects1.vercel.app/

A real-time map tracking NYC street repairs, potholes, and infrastructure fixes — inspired by the viral TikTok trend of Mayor Zohran Mamdani personally showing up to fix broken streets, and the classic Spidey Tracker.

## Inspiration

In 2026, videos of Mayor Zohran Mamdani hopping out to fill potholes and inspect broken infrastructure went viral on TikTok. New Yorkers started tagging sightings, sharing before-and-afters, and holding the city accountable in real time. That energy needed a map.

The Spidey Tracker — the fan-built site that tracked Spider-Man film locations across NYC — showed what a focused, community-driven tracker could look like. Same idea here, but for civic infrastructure: every pothole filled, every busted streetlight fixed, every playground restored.

## What It Does

- **Live map** of NYC 311 complaints (potholes, water main breaks, broken streetlights, playground damage) pulled from NYC Open Data
- **AI triage** using Claude — rates each sighting CRITICAL / HIGH / NOTABLE so the worst problems surface first
- **Spotted feed** — community TikTok sightings of Mamdani or city crews actively fixing things
- **Vote system** — upvote/downvote sightings to signal what matters most to the neighborhood
- **Real-time stats** — total reports, average resolution time, % closed this month

## Tech Stack

- **Next.js** (App Router, SSR + ISR)
- **Mapbox GL JS** — interactive pin map
- **NYC Open Data / Socrata API** — 10M+ 311 complaints
- **Anthropic Claude API** — AI severity curation at build time
- **Supabase** — votes + real-time WebSocket
- **Tailwind CSS** + Framer Motion

## Design

Comic-ink aesthetic: Bangers display font, flat-fill severity pins with bold black outlines, halftone texture, dark background. Severity tiers use color to communicate urgency at a glance — yellow for CRITICAL, orange for HIGH, teal for NOTABLE.

## Getting Started

1. Clone the repo
2. Copy `.env.local.example` to `.env.local` and fill in your keys
3. Run the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

See `.env.local.example` for all required keys:

| Variable | Source |
|---|---|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | [mapbox.com](https://mapbox.com) |
| `SOCRATA_APP_TOKEN` | [data.cityofnewyork.us](https://data.cityofnewyork.us) |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `NEXT_PUBLIC_SUPABASE_URL` | [supabase.com](https://supabase.com) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings |
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) |
| `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` | [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps) |
