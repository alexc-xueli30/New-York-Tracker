# SPOTTED Tab — NYC Civic News Feed

**Date:** 2026-10-13  
**Status:** Approved

## Goal

Replace the TikTok creator embed in the SPOTTED tab with a unified NYC civic news feed pulled from 4 RSS sources. The feed is server-side rendered, revalidates every 30 minutes, requires no auth or API keys, and fits the existing pixel/retro aesthetic.

## What We're Building

A scrollable list of news articles from Gothamist, Streetsblog NYC, City Limits, and The City — merged by publish date, newest first, top 30 items. Each card shows the source badge, headline, and relative publish time. The whole card is a link that opens the article in a new tab.

Community photo upload is explicitly out of scope for this version. It requires Supabase storage to be configured (currently using placeholder URL) and is deferred to a future iteration.

## Data Layer

### `lib/news-feed.ts` (new)

Exports one function: `fetchNewsItems(): Promise<NewsItem[]>`

- Fetches all 4 RSS feeds in parallel with `Promise.allSettled`
- Failed feeds (network error, malformed XML, timeout) are silently skipped — remaining sources still render
- Uses `rss-parser` npm package for XML parsing
- Each fetch uses `{ next: { revalidate: 1800 } }` (30-minute ISR cache)
- Merges results, sorts by `pubDate` descending, returns top 30

### `NewsItem` type (add to `lib/types.ts`)

```ts
export interface NewsItem {
  title: string
  link: string
  pubDate: string        // ISO string
  source: 'gothamist' | 'citylimits' | 'streetsblog' | 'thecity'
}
```

### Sources

| Source | RSS URL | Badge color |
|--------|---------|-------------|
| Gothamist | `https://gothamist.com/feed` | `#FF6B35` (orange) |
| Streetsblog NYC | `https://nyc.streetsblog.org/feed` | `#4ECDC4` (teal) |
| City Limits | `https://citylimits.org/feed` | `#FFE600` (yellow) |
| The City | `https://thecity.nyc/feed` | `#a78bfa` (purple) |

## Page Integration

### `app/page.tsx`

Add `fetchNewsItems()` to the existing `Promise.all`:

```ts
const [records, stats, newsItems] = await Promise.all([
  fetchRecentComplaints(),
  fetchResolutionStats(),
  fetchNewsItems(),
])
```

Pass `newsItems` to `HomeClient`. Change page-level `revalidate` from 21600 to 1800 so news stays fresh. (The 311 fetch calls have their own per-fetch revalidate of 21600 — they are unaffected.)

### `app/HomeClient.tsx`

Add `newsItems: NewsItem[]` to `HomeClientProps`. Pass it through to `<SpottedFeed newsItems={newsItems} />`.

## Component

### `components/SpottedFeed.tsx` (full rewrite)

Drops the TikTok embed entirely. Becomes a pure render component — no `useEffect`, no external scripts, no `'use client'` directive needed (can be a server component).

```
SpottedFeed
  header bar: "NYC CIVIC FEED" + "4 SOURCES · LIVE"
  scrollable list of NewsCard items
  empty state: "NO FEED ITEMS" if newsItems.length === 0
```

Each `NewsCard`:
- Full-width, border-bottom divider
- Left: 36×36px colored square with 1–2 letter abbreviation (source badge)
- Right: source name label + relative time, then headline (2-line clamp)
- Entire card is an `<a href={item.link} target="_blank" rel="noopener noreferrer">`
- Hover: `opacity: 0.8` transition

Relative time helper: convert `pubDate` to "Xm ago" / "Xh ago" / "Xd ago" using simple arithmetic, no date library needed.

Source badge abbreviations and colors:

| source | letter | color |
|--------|--------|-------|
| gothamist | G | `#FF6B35` |
| streetsblog | S | `#4ECDC4` |
| citylimits | CL | `#FFE600` |
| thecity | TC | `#a78bfa` |

## Files Changed

| File | Change |
|------|--------|
| `lib/news-feed.ts` | New — RSS fetch + parse logic |
| `lib/types.ts` | Add `NewsItem` interface |
| `app/page.tsx` | Add `fetchNewsItems()` to parallel fetch, change `revalidate` to 1800 |
| `app/HomeClient.tsx` | Add `newsItems` prop, pass to SpottedFeed |
| `components/SpottedFeed.tsx` | Full rewrite — drop TikTok, render news cards |

## Dependencies

- Install: `npm install rss-parser`
- No new environment variables
- No Supabase changes

## Error Handling

- `fetchNewsItems` never throws — wraps everything in try/catch, returns `[]` on total failure
- `Promise.allSettled` means one bad feed doesn't block others
- Empty `newsItems` renders a "NO FEED ITEMS" empty state in SpottedFeed

## Out of Scope

- Community photo upload (requires Supabase storage — deferred)
- TikTok content (removed entirely)
- Filtering or searching news items
- Pagination beyond 30 items
