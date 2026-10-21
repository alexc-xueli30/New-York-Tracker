import type { MapSighting } from '@/lib/types'

interface TickerProps {
  sightings: MapSighting[]
}

export function Ticker({ sightings }: TickerProps) {
  if (sightings.length === 0) return null

  const items = [...sightings, ...sightings] // doubled for seamless loop

  return (
    <div
      className="hidden md:block overflow-hidden ticker-wrap"
      style={{
        height: '40px',
        backgroundColor: 'var(--color-bg)',
        borderTop: '1px solid var(--color-border)',
      }}
      aria-hidden="true"
    >
      <div
        className="ticker-track flex items-center h-full whitespace-nowrap font-mono text-sm text-ink"
        style={{ animationDuration: `${sightings.length * 4}s` }}
      >
        <span
          className="font-display text-base mr-4 ml-4"
          style={{ letterSpacing: '0.05em' }}
        >
          RECENT FIXES:
        </span>
        {items.map((s, i) => (
          <span key={`${s.id}-${i}`} className="mr-8">
            <span
              className="font-mono text-xs px-1.5 py-0.5 mr-2"
              style={{
                backgroundColor:
                  s.severity === 'CRITICAL' ? '#FFE600'
                  : s.severity === 'HIGH' ? '#FF6B35'
                  : '#4ECDC4',
                color: '#0D0D0D',
                fontFamily: 'var(--font-bangers)',
              }}
            >
              {s.severity}
            </span>
            {s.title} — {s.borough}
          </span>
        ))}
      </div>
    </div>
  )
}
