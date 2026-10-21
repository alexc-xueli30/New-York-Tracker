'use client'

import { useState } from 'react'
import type { MapSighting, SeverityTier } from '@/lib/types'
import { TIER_COLOR, TIER_LETTER } from '@/lib/constants'

type SortMode = 'date' | 'severity'
type FilterMode = SeverityTier | 'ALL'

const SEVERITY_RANK: Record<SeverityTier, number> = { CRITICAL: 0, HIGH: 1, NOTABLE: 2 }
const FILTERS: FilterMode[] = ['ALL', 'CRITICAL', 'HIGH', 'NOTABLE']

interface ActivityLogProps {
  sightings: MapSighting[]
  selectedId: string | null
  onSelect: (s: MapSighting) => void
}

export function ActivityLog({ sightings, selectedId, onSelect }: ActivityLogProps) {
  const [sort, setSort] = useState<SortMode>('date')
  const [filter, setFilter] = useState<FilterMode>('ALL')

  const filtered = filter === 'ALL' ? sightings : sightings.filter(s => s.severity === filter)
  const sorted = sort === 'severity'
    ? [...filtered].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
    : filtered

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header row: title + sort */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-3 py-2 halftone"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <span className="font-pixel text-ink" style={{ fontSize: '9px', letterSpacing: '0.1em' }}>
          ACTIVITY LOG
        </span>
        <div className="flex gap-1">
          {(['date', 'severity'] as SortMode[]).map(m => (
            <button
              key={m}
              onClick={() => setSort(m)}
              className="font-pixel text-ink transition-opacity"
              style={{
                fontSize: '7px',
                letterSpacing: '0.06em',
                padding: '3px 6px',
                border: '1px solid var(--color-border)',
                backgroundColor: sort === m ? 'var(--color-text)' : 'transparent',
                color: sort === m ? 'var(--color-bg)' : 'var(--color-text)',
                opacity: sort === m ? 1 : 0.5,
              }}
            >
              {m === 'date' ? 'DATE' : 'SEV'}
            </button>
          ))}
        </div>
      </div>

      {/* Filter row */}
      <div
        className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="font-pixel transition-colors"
            style={{
              fontSize: '7px',
              letterSpacing: '0.04em',
              padding: '2px 5px',
              border: '1px solid var(--color-border)',
              backgroundColor: filter === f
                ? (f === 'ALL' ? 'var(--color-text)' : TIER_COLOR[f as SeverityTier])
                : 'transparent',
              color: filter === f ? '#091932' : 'var(--color-text)',
              opacity: filter === f ? 1 : 0.45,
            }}
          >
            {f === 'ALL' ? 'ALL' : f === 'CRITICAL' ? 'CRIT' : f === 'NOTABLE' ? 'NOTE' : f}
          </button>
        ))}
        <span className="font-pixel text-ink opacity-25 ml-auto" style={{ fontSize: '7px' }}>
          {sorted.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-24 px-4">
            <p className="font-pixel text-ink opacity-40 text-center" style={{ fontSize: '8px' }}>
              NO SIGHTINGS
            </p>
          </div>
        ) : (
          sorted.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className="w-full text-left flex items-start gap-2 px-3 py-2.5 transition-colors hover:opacity-80"
              style={{
                borderBottom: '1px solid var(--color-border)',
                backgroundColor: selectedId === s.id ? 'rgba(150,224,247,0.08)' : 'transparent',
                opacity: selectedId && selectedId !== s.id ? 0.6 : 1,
              }}
              aria-pressed={selectedId === s.id}
            >
              <span
                className="flex-shrink-0 font-pixel text-ink opacity-30"
                style={{ fontSize: '8px', paddingTop: '2px', minWidth: '14px' }}
              >
                {String(idx + 1).padStart(2, '0')}
              </span>
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-pixel font-bold"
                style={{ backgroundColor: TIER_COLOR[s.severity], color: '#091932', fontSize: '8px', marginTop: '1px' }}
              >
                {TIER_LETTER[s.severity]}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className="font-pixel text-ink leading-tight"
                  style={{ fontSize: '8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                >
                  {s.title}
                </p>
                <p className="font-mono text-ink opacity-50 mt-1" style={{ fontSize: '9px' }}>
                  {s.borough}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
