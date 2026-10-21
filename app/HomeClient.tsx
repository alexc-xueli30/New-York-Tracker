'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { MapWrapper } from '@/components/MapWrapper'
import { DetailCard, CardContent } from '@/components/DetailCard'
import { StatsStrip } from '@/components/StatsStrip'
import { Ticker } from '@/components/Ticker'
import { SpottedFeed } from '@/components/SpottedFeed'
import { ActivityLog } from '@/components/ActivityLog'
import { supabase, fetchVoteTotals } from '@/lib/supabase'
import { ArrowLeft } from 'lucide-react'
import type { MapSighting, ResolutionStats, NewsItem } from '@/lib/types'

type Tab = 'map' | 'spotted'

const DEFAULT_STATS: ResolutionStats = { totalReports: 0, avgResolutionDays: null, recentlyClosed: 0 }

interface HomeClientProps {
  initialStats?: ResolutionStats
}

export function HomeClient({ initialStats }: HomeClientProps) {
  const [tab, setTab] = useState<Tab>('map')
  const [selected, setSelected] = useState<MapSighting | null>(null)
  const [sightings, setSightings] = useState<MapSighting[]>([])
  const [sightingsLoading, setSightingsLoading] = useState(true)
  const [viewportSightings, setViewportSightings] = useState<MapSighting[]>([])
  const [stats, setStats] = useState<ResolutionStats>(initialStats ?? DEFAULT_STATS)
  const [newsItems, setNewsItems] = useState<NewsItem[]>([])
  const [votesCache, setVotesCache] = useState<Record<string, { likes: number; dislikes: number }>>({})
  const sidebarCloseRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    fetch('/api/complaints')
      .then(r => r.ok ? r.json() as Promise<MapSighting[]> : Promise.resolve([]))
      .catch(() => [] as MapSighting[])
      .then(data => { setSightings(data); setSightingsLoading(false) })
  }, [])

  useEffect(() => {
    fetch('/api/news')
      .then(r => r.ok ? r.json() as Promise<NewsItem[]> : Promise.resolve([]))
      .catch(() => [] as NewsItem[])
      .then(setNewsItems)
  }, [])

  const handleSelect = useCallback((s: MapSighting) => setSelected(s), [])
  const handleClose = useCallback(() => setSelected(null), [])
  const handleViewportSightings = useCallback((s: MapSighting[]) => setViewportSightings(s), [])

  // Real-time vote subscription
  useEffect(() => {
    if (!supabase || sightings.length === 0) return
    const ids = sightings.map(s => s.id)
    fetchVoteTotals(ids).then(setVotesCache)
    const channel = supabase
      .channel('votes-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => {
        fetchVoteTotals(ids).then(setVotesCache)
      })
      .subscribe()
    return () => { supabase!.removeChannel(channel) }
  }, [sightings])

  const scannerOffline = !sightingsLoading && sightings.length === 0
  const likes    = selected ? (votesCache[selected.id]?.likes    ?? 0) : 0
  const dislikes = selected ? (votesCache[selected.id]?.dislikes ?? 0) : 0

  return (
    <div
      className="flex flex-col pixel-frame"
      style={{ height: 'calc(100dvh - 20px)', margin: '10px', backgroundColor: 'var(--color-bg)' }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 md:px-6 flex-shrink-0 halftone"
        style={{
          height: '56px',
          backgroundColor: 'var(--color-surface)',
          borderBottom: '2px solid var(--color-border)',
        }}
      >
        <h1
          className="font-pixel text-ink"
          style={{ fontSize: 'clamp(0.55rem, 1.8vw, 0.85rem)', letterSpacing: '0.05em' }}
        >
          NYC FIX TRACKER
        </h1>

        <nav className="flex items-center gap-1" aria-label="Main navigation">
          {(['map', 'spotted'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              aria-current={tab === t ? 'page' : undefined}
              className="font-pixel transition-colors"
              style={{
                fontSize: '8px',
                padding: '8px 10px',
                minWidth: 44,
                minHeight: 44,
                display: 'flex',
                alignItems: 'center',
                letterSpacing: '0.04em',
                backgroundColor: tab === t ? 'var(--color-text)' : 'transparent',
                color: tab === t ? 'var(--color-bg)' : 'var(--color-text)',
                border: '2px solid var(--color-border)',
              }}
            >
              {t === 'map' ? 'LIVE MAP' : 'NEWS FEED'}
            </button>
          ))}
        </nav>
      </header>

      {/* Stats strip */}
      <div className="flex-shrink-0">
        <StatsStrip stats={stats} />
      </div>

      {/* Main content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Map / content area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Map: always mounted so Mapbox instance is stable; hidden via visibility when off-tab */}
          <div
            className="absolute inset-0"
            style={{
              visibility: tab === 'map' ? 'visible' : 'hidden',
              pointerEvents: tab === 'map' ? 'auto' : 'none',
            }}
          >
            {scannerOffline ? (
              <div
                className="w-full h-full flex flex-col items-center justify-center gap-4 halftone"
                style={{ backgroundColor: 'var(--color-bg)' }}
              >
                <p className="font-pixel text-ink opacity-80" style={{ fontSize: '1rem' }}>SCANNER OFFLINE</p>
                <p className="font-mono text-sm text-ink opacity-50">Check back shortly</p>
              </div>
            ) : (
              <>
                <MapWrapper
                  sightings={sightings}
                  onSelect={handleSelect}
                  selectedId={selected?.id ?? null}
                  onViewportSightings={handleViewportSightings}
                />
                {sightingsLoading && (
                  <div
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 font-pixel text-ink"
                    style={{ fontSize: '8px', letterSpacing: '0.08em', opacity: 0.7, pointerEvents: 'none' }}
                  >
                    SCANNING NYC...
                  </div>
                )}
              </>
            )}
          </div>

          {/* News feed: rendered on top when active */}
          {tab === 'spotted' && (
            <div className="absolute inset-0">
              <SpottedFeed newsItems={newsItems} />
            </div>
          )}
        </div>

        {/* Desktop sidebar — activity log or detail card */}
        {tab === 'map' && (
          <aside
            className="hidden md:flex flex-col w-[280px] flex-shrink-0 overflow-hidden"
            style={{
              borderLeft: '2px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            {selected ? (
              <div className="flex flex-col h-full overflow-hidden">
                <button
                  onClick={handleClose}
                  className="flex items-center gap-2 flex-shrink-0 font-pixel text-ink hover:opacity-70 transition-opacity"
                  style={{
                    fontSize: '8px',
                    padding: '10px 12px',
                    borderBottom: '1px solid var(--color-border)',
                    backgroundColor: 'transparent',
                    letterSpacing: '0.05em',
                  }}
                >
                  <ArrowLeft size={12} />
                  BACK
                </button>
                <div className="flex-1 overflow-y-auto">
                  <CardContent
                    sighting={selected}
                    likes={likes}
                    dislikes={dislikes}
                    onClose={handleClose}
                    closeRef={sidebarCloseRef}
                  />
                </div>
              </div>
            ) : (
              <ActivityLog
                sightings={viewportSightings.length > 0 ? viewportSightings : sightings}
                selectedId={null}
                onSelect={handleSelect}
              />
            )}
          </aside>
        )}
      </main>

      {/* Mobile: DetailCard bottom sheet */}
      <DetailCard
        sighting={selected}
        likes={likes}
        dislikes={dislikes}
        onClose={handleClose}
      />

      {/* Desktop ticker */}
      <div className="flex-shrink-0">
        {tab === 'map' && <Ticker sightings={viewportSightings.length > 0 ? viewportSightings : sightings} />}
      </div>
    </div>
  )
}
