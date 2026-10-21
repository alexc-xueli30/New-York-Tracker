import { describe, it, expect, vi, beforeEach } from 'vitest'

// Minimal MapSighting fixture
const sighting = {
  id: 'abc',
  title: 'Test',
  description: '',
  category: 'pothole',
  severity: 'HIGH' as const,
  lat: 40.7128,
  lng: -74.006,
  address: '1 Test St',
  borough: 'MANHATTAN',
  createdAt: '2024-01-01T00:00:00Z',
  status: 'Open',
  rawComplaintType: 'Pothole',
}

describe('map flyTo logic', () => {
  it('calls flyTo with correct center and zoom when selectedId matches', () => {
    const flyTo = vi.fn()
    const map = { loaded: () => true, flyTo }

    // Inline the flyTo logic from Map.tsx's useEffect
    function triggerFlyTo(selectedId: string | null, sightings: typeof sighting[]) {
      if (!map.loaded() || !selectedId) return
      const s = sightings.find(x => x.id === selectedId)
      if (!s) return
      map.flyTo({ center: [s.lng, s.lat], zoom: 14, duration: 700 })
    }

    triggerFlyTo('abc', [sighting])
    expect(flyTo).toHaveBeenCalledWith({
      center: [-74.006, 40.7128],
      zoom: 14,
      duration: 700,
    })
  })

  it('does not call flyTo when selectedId is null', () => {
    const flyTo = vi.fn()
    const map = { loaded: () => true, flyTo }

    function triggerFlyTo(selectedId: string | null, sightings: typeof sighting[]) {
      if (!map.loaded() || !selectedId) return
      const s = sightings.find(x => x.id === selectedId)
      if (!s) return
      map.flyTo({ center: [s.lng, s.lat], zoom: 14, duration: 700 })
    }

    triggerFlyTo(null, [sighting])
    expect(flyTo).not.toHaveBeenCalled()
  })

  it('does not call flyTo when map is not loaded', () => {
    const flyTo = vi.fn()
    const map = { loaded: () => false, flyTo }

    function triggerFlyTo(selectedId: string | null, sightings: typeof sighting[]) {
      if (!map.loaded() || !selectedId) return
      const s = sightings.find(x => x.id === selectedId)
      if (!s) return
      map.flyTo({ center: [s.lng, s.lat], zoom: 14, duration: 700 })
    }

    triggerFlyTo('abc', [sighting])
    expect(flyTo).not.toHaveBeenCalled()
  })
})
