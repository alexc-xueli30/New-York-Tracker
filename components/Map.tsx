'use client'

import { useEffect, useRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { MapSighting, SeverityTier } from '@/lib/types'
import { TIER_COLOR, TIER_SIZE, TIER_BORDER_WIDTH, TIER_LETTER } from '@/lib/constants'
import { rawToSighting } from '@/lib/311-api'
import type { SocrataRecord } from '@/lib/types'

const NYC_BOUNDS: mapboxgl.LngLatBoundsLike = [[-74.27, 40.48], [-73.70, 40.92]]
const MOUSE_RADIUS = 180
const TIER_ORDER: SeverityTier[] = ['CRITICAL', 'HIGH', 'NOTABLE']
const FADE_MS = 200
const MAX_VISIBLE_PINS = 200  // max DOM markers on screen at once
const MAX_POOL_SIZE = 500     // max sightings held in memory across pans

// NYC borough boundary — outer hull of Bronx + Manhattan + Queens + Brooklyn,
// plus Staten Island as a separate polygon. ~35 pts per shape for map zoom 10–14.
const NYC_BORDER_GEOJSON: GeoJSON.Feature<GeoJSON.MultiPolygon> = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'MultiPolygon',
    coordinates: [
      [[
        [-73.936, 40.877], [-73.912, 40.878], [-73.897, 40.913], [-73.860, 40.914],
        [-73.830, 40.911], [-73.800, 40.907], [-73.763, 40.880], [-73.790, 40.824],
        [-73.812, 40.808], [-73.823, 40.784], [-73.779, 40.781], [-73.731, 40.772],
        [-73.705, 40.751], [-73.700, 40.720], [-73.729, 40.676], [-73.750, 40.643],
        [-73.720, 40.604], [-73.717, 40.571], [-73.741, 40.555], [-73.788, 40.547],
        [-73.839, 40.544], [-73.916, 40.545], [-73.948, 40.577], [-73.988, 40.574],
        [-74.002, 40.574], [-74.020, 40.600], [-74.050, 40.637], [-74.025, 40.679],
        [-74.019, 40.700], [-73.974, 40.699], [-73.970, 40.711], [-73.957, 40.729],
        [-73.947, 40.765], [-73.929, 40.843], [-73.912, 40.870], [-73.936, 40.877],
      ]],
      [[
        [-74.076, 40.645], [-74.143, 40.643], [-74.255, 40.651], [-74.258, 40.503],
        [-74.252, 40.494], [-74.055, 40.493], [-74.055, 40.627], [-74.076, 40.645],
      ]],
    ],
  },
}

/** Zoom-dependent coordinate precision for grouping:
 *  zoom ≥14 → 5dp (~1m, same building), ≥12 → 4dp (~11m, same block), else → 3dp (~110m) */
function coordPrecision(zoom: number): number {
  if (zoom >= 14) return 5
  if (zoom >= 12) return 4
  return 3
}
const coordKey = (s: MapSighting, dp = 5) => `${s.lat.toFixed(dp)},${s.lng.toFixed(dp)}`

/** How many viewport complaints to fetch, scaled by zoom */
function viewportLimit(zoom: number): number {
  if (zoom >= 15) return 300
  if (zoom >= 13) return 150
  return 50
}

interface MapProps {
  sightings: MapSighting[]
  onSelect: (sighting: MapSighting) => void
  selectedId: string | null
  onViewportSightings?: (sightings: MapSighting[]) => void
}

export default function Map({ sightings, onSelect, selectedId, onViewportSightings }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  // Flat list used only for the mouse-radius effect (opacity sweep)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  // Keyed by coordKey so we can diff without clearing everything
  const markerMapRef = useRef({} as Record<string, mapboxgl.Marker>)

  const sightingsRef = useRef<MapSighting[]>(sightings)
  const selectedIdRef = useRef<string | null>(selectedId)
  const mouseActiveRef = useRef(false)
  const onViewportSightingsRef = useRef(onViewportSightings)

  // Unified sighting pool: initial load + viewport fetches merged + deduped
  const allSightingsRef = useRef<MapSighting[]>([])
  const seenIdsRef = useRef<Set<string>>(new Set())
  const viewportIdsRef = useRef<Set<string>>(new Set())

  const moveendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchControllerRef = useRef<AbortController | null>(null)
  const fetchSeqRef = useRef(0)
  const lastCenterRef = useRef<{ lng: number; lat: number } | null>(null)

  useEffect(() => { sightingsRef.current = sightings }, [sightings])
  useEffect(() => { selectedIdRef.current = selectedId }, [selectedId])
  useEffect(() => { onViewportSightingsRef.current = onViewportSightings }, [onViewportSightings])

  /** Build the DOM element for a coordinate group (1 or many sightings at same location) */
  const buildGroupEl = useCallback((group: MapSighting[], zoom: number) => {
    const top = group[0] // sorted most-severe first
    const tier = top.severity as SeverityTier
    const t = Math.min(Math.max((zoom - 11) / 3, 0), 1)
    const fullSize = Math.max(TIER_SIZE[tier], 44)
    const size = Math.round(28 + (fullSize - 28) * t)
    const color = TIER_COLOR[tier]
    const bw = TIER_BORDER_WIDTH[tier]
    const label = TIER_LETTER[tier]

    const el = document.createElement('button')
    el.setAttribute('aria-label', group.length > 1
      ? `${group.length} complaints at ${top.address}`
      : `${tier}: ${top.title}`)
    el.setAttribute('data-id', top.id)
    el.setAttribute('data-tier', tier)
    if (top.id === selectedIdRef.current) el.classList.add('pin-selected')
    el.style.cssText = `
      width:${size}px;height:${size}px;
      background-color:${color};
      border:${bw}px solid #091932;
      border-radius:50%;
      cursor:pointer;
      display:flex;align-items:center;justify-content:center;
      font-family:var(--font-pixel),monospace;
      font-size:11px;
      font-weight:bold;color:#091932;
      transition:box-shadow 150ms ease,opacity ${FADE_MS}ms ease;
    `
    el.textContent = label
    el.addEventListener('mouseenter', () => { el.style.boxShadow = '0 0 0 3px #fff,0 0 0 5px #091932' })
    el.addEventListener('mouseleave', () => { el.style.boxShadow = '' })
    el.addEventListener('mousedown', e => e.stopPropagation())
    el.addEventListener('click', () => onSelect(top))
    return el
  }, [onSelect])

  /** Diff-rebuild markers: add new, update changed, fade-remove stale. Never clears all at once. */
  const rebuildMarkers = useCallback((map: mapboxgl.Map) => {
    const bounds = map.getBounds()
    if (!bounds) return
    const zoom = map.getZoom()

    // Filter pool to current viewport
    const inBounds = allSightingsRef.current.filter(s =>
      s.lat >= bounds.getSouth() && s.lat <= bounds.getNorth() &&
      s.lng >= bounds.getWest() && s.lng <= bounds.getEast()
    )

    // Group by zoom-aware coordinate precision
    const dp = coordPrecision(zoom)
    const groups: Record<string, MapSighting[]> = {}
    inBounds.forEach(s => {
      const k = coordKey(s, dp)
      if (groups[k]) groups[k].push(s)
      else groups[k] = [s]
    })
    Object.values(groups).forEach(g => g.sort((a, b) => TIER_ORDER.indexOf(a.severity) - TIER_ORDER.indexOf(b.severity)))

    // Cap to MAX_VISIBLE_PINS — keep most-severe groups first
    const visibleEntries = Object.entries(groups)
      .sort((a, b) => TIER_ORDER.indexOf(a[1][0].severity) - TIER_ORDER.indexOf(b[1][0].severity))
      .slice(0, MAX_VISIBLE_PINS)

    const newKeys = new Set(visibleEntries.map(([k]) => k))
    const existingKeys = new Set(Object.keys(markerMapRef.current))

    // Fade-out and remove stale markers (left viewport or trimmed by pin cap)
    existingKeys.forEach(key => {
      if (newKeys.has(key)) return
      const m = markerMapRef.current[key]
      m.getElement().style.opacity = '0'
      setTimeout(() => m.remove(), FADE_MS)
      delete markerMapRef.current[key]
    })

    // Add new markers or update changed ones
    visibleEntries.forEach(([key, group]) => {
      const existing = markerMapRef.current[key]

      if (existing) {
        // Update only if the top severity tier changed (letter would change)
        const existingTier = existing.getElement().getAttribute('data-tier')
        if (existingTier === group[0].severity) return
        const [lat, lng] = key.split(',').map(Number)
        const newEl = buildGroupEl(group, zoom)
        newEl.style.opacity = '0'
        const newMarker = new mapboxgl.Marker({ element: newEl, anchor: 'center' })
          .setLngLat([lng, lat])
          .addTo(map)
        markerMapRef.current[key] = newMarker
        // Fade old out, new in
        existing.getElement().style.opacity = '0'
        setTimeout(() => existing.remove(), FADE_MS)
        requestAnimationFrame(() => { newEl.style.opacity = '1' })
        return
      }

      // Brand-new marker — fade in
      const [lat, lng] = key.split(',').map(Number)
      const el = buildGroupEl(group, zoom)
      el.style.opacity = '0'
      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(map)
      markerMapRef.current[key] = marker
      requestAnimationFrame(() => { el.style.opacity = '1' })
    })

    // Sync flat list for mouse-radius sweep
    markersRef.current = Object.values(markerMapRef.current)

    // Notify parent with flat in-viewport list sorted by date desc
    onViewportSightingsRef.current?.(
      [...inBounds].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    )
  }, [buildGroupEl])

  // Keep a stable ref so event listeners (set up once) always call the latest version
  const rebuildMarkersRef = useRef<(map: mapboxgl.Map) => void>(() => {})
  useEffect(() => { rebuildMarkersRef.current = rebuildMarkers }, [rebuildMarkers])

  /** Reset the pool to the initial sightings batch (clears viewport adds) */
  const resetPool = useCallback((items: MapSighting[]) => {
    allSightingsRef.current = items.slice()
    seenIdsRef.current = new Set(items.map(s => s.id))
    viewportIdsRef.current.clear()
  }, [])

  /** Swap viewport batch in pool, then re-render */
  const mergeViewportSightings = useCallback((newSightings: MapSighting[], map: mapboxgl.Map) => {
    // Remove previous viewport batch
    allSightingsRef.current = allSightingsRef.current.filter(s => !viewportIdsRef.current.has(s.id))
    viewportIdsRef.current.forEach(id => seenIdsRef.current.delete(id))
    viewportIdsRef.current.clear()
    // Add fresh results
    newSightings.forEach(s => {
      if (seenIdsRef.current.has(s.id)) return
      seenIdsRef.current.add(s.id)
      viewportIdsRef.current.add(s.id)
      allSightingsRef.current.push(s)
    })
    // Cap pool to prevent unbounded memory growth from repeated panning
    if (allSightingsRef.current.length > MAX_POOL_SIZE) {
      const trimmed = allSightingsRef.current.slice(-MAX_POOL_SIZE)
      allSightingsRef.current = trimmed
      const trimmedSet = new Set(trimmed.map(s => s.id))
      seenIdsRef.current = trimmedSet
      for (const id of [...viewportIdsRef.current]) {
        if (!trimmedSet.has(id)) viewportIdsRef.current.delete(id)
      }
    }
    rebuildMarkers(map)
  }, [rebuildMarkers])

  const mergeViewportRef = useRef(mergeViewportSightings)
  useEffect(() => { mergeViewportRef.current = mergeViewportSightings }, [mergeViewportSightings])

  /** Apply/remove selected highlight ring without re-building markers */
  useEffect(() => {
    Object.values(markerMapRef.current).forEach(m => {
      const el = m.getElement()
      const isSelected = el.getAttribute('data-id') === selectedId
      el.classList.toggle('pin-selected', isSelected)
    })
  }, [selectedId])

  /** Fly to selected sighting */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.loaded() || !selectedId) return
    const sighting = sightings.find(s => s.id === selectedId)
      ?? allSightingsRef.current.find(s => s.id === selectedId)
    if (!sighting) return
    map.flyTo({ center: [sighting.lng, sighting.lat], zoom: 14, duration: 700 })
  }, [selectedId, sightings])

  /** Mouse radius: dim markers far from cursor, show all on leave */
  const applyMouseRadius = useCallback((mouseX: number, mouseY: number) => {
    const map = mapRef.current
    if (!map) return
    markersRef.current.forEach(m => {
      const pt = map.project(m.getLngLat())
      const dist = Math.sqrt((pt.x - mouseX) ** 2 + (pt.y - mouseY) ** 2)
      const el = m.getElement()
      el.style.opacity = dist <= MOUSE_RADIUS ? '1' : '0.08'
      el.style.pointerEvents = dist <= MOUSE_RADIUS ? 'auto' : 'none'
    })
  }, [])

  const showAllMarkers = useCallback(() => {
    markersRef.current.forEach(m => {
      m.getElement().style.opacity = '1'
      m.getElement().style.pointerEvents = 'auto'
    })
  }, [])

  // Stable map setup — never remounts
  useEffect(() => {
    if (!containerRef.current) return

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

    let map: mapboxgl.Map
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-73.985, 40.748],
        zoom: 11,
        maxBounds: NYC_BOUNDS,
      })
    } catch { return }

    mapRef.current = map

    map.on('load', () => {
      map.addSource('nyc-border', { type: 'geojson', data: NYC_BORDER_GEOJSON })
      map.addLayer({
        id: 'nyc-border-line',
        type: 'line',
        source: 'nyc-border',
        paint: {
          'line-color': '#4a7fa0',
          'line-width': 1.5,
          'line-dasharray': [5, 4],
          'line-opacity': 0.65,
        },
      })
      resetPool(sightingsRef.current)
      rebuildMarkersRef.current(map)
    })

    // Re-cluster on zoom (dot sizes + groupings change)
    map.on('zoomend', () => { rebuildMarkersRef.current(map) })

    // Viewport fetch on pan only — debounced 250ms; zoom-only moves skip the fetch
    const onMoveEnd = () => {
      if (moveendTimerRef.current) clearTimeout(moveendTimerRef.current)
      moveendTimerRef.current = setTimeout(async () => {
        const b = map.getBounds()
        if (!b) return
        const center = map.getCenter()
        const last = lastCenterRef.current
        const panned = !last ||
          Math.abs(center.lng - last.lng) > 0.001 ||
          Math.abs(center.lat - last.lat) > 0.001
        lastCenterRef.current = { lng: center.lng, lat: center.lat }
        if (!panned) return
        fetchControllerRef.current?.abort()
        const controller = new AbortController()
        fetchControllerRef.current = controller
        const thisSeq = ++fetchSeqRef.current
        const zoom = map.getZoom()
        const dp = zoom <= 12 ? 2 : 3
        const snap = (n: number) => parseFloat(n.toFixed(dp))
        const qs = new URLSearchParams({
          latMin: String(snap(b.getSouth())),
          latMax: String(snap(b.getNorth())),
          lngMin: String(snap(b.getWest())),
          lngMax: String(snap(b.getEast())),
          limit: String(viewportLimit(zoom)),
          zoom: String(Math.round(zoom)),
        })
        const records: SocrataRecord[] = await fetch(`/api/viewport-complaints?${qs}`, { signal: controller.signal })
          .then(r => r.ok ? r.json() : [])
          .catch(() => [])
        if (fetchSeqRef.current !== thisSeq) return
        mergeViewportRef.current(records.map(rawToSighting), map)
        showAllMarkers()
      }, 250)
    }
    map.on('moveend', onMoveEnd)

    const container = containerRef.current
    const onMouseMove = (e: MouseEvent) => {
      mouseActiveRef.current = true
      const rect = container.getBoundingClientRect()
      applyMouseRadius(e.clientX - rect.left, e.clientY - rect.top)
    }
    const onMouseLeave = () => {
      mouseActiveRef.current = false
      showAllMarkers()
    }
    container.addEventListener('mousemove', onMouseMove)
    container.addEventListener('mouseleave', onMouseLeave)

    return () => {
      container.removeEventListener('mousemove', onMouseMove)
      container.removeEventListener('mouseleave', onMouseLeave)
      if (moveendTimerRef.current) clearTimeout(moveendTimerRef.current)
      Object.values(markerMapRef.current).forEach(m => m.remove())
      markerMapRef.current = {} as Record<string, mapboxgl.Marker>
      markersRef.current = []
      map.remove()
      mapRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-render when initial sightings prop changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.loaded()) return
    resetPool(sightings)
    rebuildMarkersRef.current(map)
  }, [sightings, resetPool])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      role="application"
      aria-label="NYC Fix sightings map"
    />
  )
}
