import type { ResolutionStats } from '@/lib/types'

interface StatsStripProps {
  stats: ResolutionStats
}

export function StatsStrip({ stats }: StatsStripProps) {
  const { totalReports, avgResolutionDays, recentlyClosed } = stats

  const avgLabel = avgResolutionDays !== null
    ? `${avgResolutionDays}d avg resolution`
    : 'avg N/A'

  return (
    <div
      className="flex items-center justify-center gap-3 px-4 font-mono text-sm text-ink"
      style={{
        height: '44px',
        backgroundColor: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {/* Desktop: full labels */}
      <span className="hidden md:inline">
        <span className="text-ink">{totalReports.toLocaleString()} reports</span>
        <span className="mx-2 opacity-50">·</span>
        <span className="text-ink">{avgLabel}</span>
        <span className="mx-2 opacity-50">·</span>
        <span className="text-ink">{recentlyClosed.toLocaleString()} closed this month</span>
      </span>

      {/* Mobile: compact */}
      <span className="md:hidden">
        <span>{totalReports.toLocaleString()}</span>
        <span className="mx-1.5 opacity-50">·</span>
        <span>{avgResolutionDays !== null ? `${avgResolutionDays}d` : 'N/A'}</span>
        <span className="mx-1.5 opacity-50">·</span>
        <span>{recentlyClosed.toLocaleString()} closed</span>
      </span>
    </div>
  )
}
