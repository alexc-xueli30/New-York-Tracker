import type { NewsItem } from '@/lib/types'

const SOURCE_META: Record<NewsItem['source'], { label: string; abbr: string; color: string }> = {
  gothamist:   { label: 'GOTHAMIST',   abbr: 'G',  color: '#FF6B35' },
  streetsblog: { label: 'STREETSBLOG', abbr: 'S',  color: '#4ECDC4' },
  citylimits:  { label: 'CITY LIMITS', abbr: 'CL', color: '#FFE600' },
  thecity:     { label: 'THE CITY',    abbr: 'TC', color: '#a78bfa' },
}

function relativeTime(pubDate: string): string {
  const diff = Date.now() - new Date(pubDate).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

interface SpottedFeedProps {
  newsItems: NewsItem[]
}

export function SpottedFeed({ newsItems }: SpottedFeedProps) {
  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{
          height: '36px',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        <span className="font-pixel text-ink" style={{ fontSize: '8px', letterSpacing: '0.08em', opacity: 0.7 }}>
          NYC CIVIC FEED
        </span>
        <span className="font-pixel text-ink" style={{ fontSize: '7px', letterSpacing: '0.06em', opacity: 0.35 }}>
          4 SOURCES · LIVE
        </span>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {newsItems.length === 0 ? (
          <div className="flex items-center justify-center h-24">
            <p className="font-pixel text-ink opacity-40" style={{ fontSize: '8px' }}>NO FEED ITEMS</p>
          </div>
        ) : (
          newsItems.map((item, i) => {
            const meta = SOURCE_META[item.source]
            return (
              <a
                key={`${item.source}-${i}`}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 px-3 py-3 transition-opacity hover:opacity-70"
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  textDecoration: 'none',
                  display: 'flex',
                }}
              >
                {/* Source badge */}
                <div
                  className="flex-shrink-0 flex items-center justify-center font-pixel font-bold"
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: meta.color,
                    color: '#091932',
                    fontSize: '8px',
                    border: '2px solid #091932',
                    marginTop: '1px',
                  }}
                >
                  {meta.abbr}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="font-pixel"
                      style={{ fontSize: '7px', letterSpacing: '0.06em', color: meta.color }}
                    >
                      {meta.label}
                    </span>
                    <span
                      className="font-pixel text-ink"
                      style={{ fontSize: '7px', opacity: 0.4 }}
                    >
                      · {relativeTime(item.pubDate)}
                    </span>
                  </div>
                  <p
                    className="font-pixel text-ink leading-relaxed"
                    style={{
                      fontSize: '9px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      margin: 0,
                    }}
                  >
                    {item.title}
                  </p>
                </div>
              </a>
            )
          })
        )}
      </div>
    </div>
  )
}
