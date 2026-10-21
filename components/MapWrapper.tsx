'use client'

import dynamic from 'next/dynamic'
import type { MapSighting } from '@/lib/types'

const Map = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => (
    <div
      className="w-full h-full flex items-center justify-center font-display text-3xl text-ink halftone"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      SCANNER ONLINE...
    </div>
  ),
})

export function MapWrapper(props: {
  sightings: MapSighting[]
  onSelect: (s: MapSighting) => void
  selectedId: string | null
  onViewportSightings?: (sightings: MapSighting[]) => void
}) {
  return <Map {...props} />
}
