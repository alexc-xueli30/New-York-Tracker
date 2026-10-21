import Parser from 'rss-parser'
import type { NewsItem } from './types'

type Source = NewsItem['source']

const SOURCES: { id: Source; url: string }[] = [
  { id: 'gothamist',   url: 'https://gothamist.com/feed' },
  { id: 'streetsblog', url: 'https://nyc.streetsblog.org/feed' },
  { id: 'citylimits',  url: 'https://citylimits.org/feed' },
  { id: 'thecity',     url: 'https://thecity.nyc/feed' },
]

const parser = new Parser({ timeout: 8000 })

export async function fetchNewsItems(): Promise<NewsItem[]> {
  const fetches = SOURCES.map(({ id, url }) =>
    fetch(url, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(3000) })
      .then(r => r.text())
      .then(xml => parser.parseString(xml))
      .then(feed =>
        (feed.items ?? []).slice(0, 15).map(item => ({
          title: item.title ?? '',
          link: item.link ?? '',
          pubDate: item.pubDate ?? item.isoDate ?? new Date().toISOString(),
          source: id,
        } satisfies NewsItem))
      )
      .catch(() => [] as NewsItem[])
  )

  const results = await Promise.allSettled(fetches)
  const all = results.flatMap(r => r.status === 'fulfilled' ? r.value : [])
  return all
    .filter(item => item.title && item.link)
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 30)
}
