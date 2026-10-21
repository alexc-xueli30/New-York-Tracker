import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActivityLog } from '@/components/ActivityLog'
import type { MapSighting } from '@/lib/types'

const makeSighting = (id: string, severity: MapSighting['severity'] = 'HIGH'): MapSighting => ({
  id,
  title: `Issue ${id}`,
  description: 'desc',
  category: 'pothole',
  severity,
  lat: 40.7,
  lng: -74.0,
  address: '1 Test St',
  borough: 'MANHATTAN',
  createdAt: '2024-01-01T00:00:00Z',
  status: 'Open',
  rawComplaintType: 'Pothole',
})

describe('ActivityLog', () => {
  it('renders all sightings', () => {
    const sightings = [makeSighting('a'), makeSighting('b'), makeSighting('c')]
    render(<ActivityLog sightings={sightings} selectedId={null} onSelect={vi.fn()} />)
    expect(screen.getByText('Issue a')).toBeTruthy()
    expect(screen.getByText('Issue b')).toBeTruthy()
    expect(screen.getByText('Issue c')).toBeTruthy()
  })

  it('calls onSelect with the correct sighting when clicked', () => {
    const onSelect = vi.fn()
    const sightings = [makeSighting('x', 'CRITICAL'), makeSighting('y')]
    render(<ActivityLog sightings={sightings} selectedId={null} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('Issue x').closest('button')!)
    expect(onSelect).toHaveBeenCalledWith(sightings[0])
  })

  it('shows selected state on the active sighting', () => {
    const sightings = [makeSighting('sel'), makeSighting('other')]
    render(<ActivityLog sightings={sightings} selectedId="sel" onSelect={vi.fn()} />)
    const btn = screen.getByText('Issue sel').closest('button')!
    expect(btn.getAttribute('aria-pressed')).toBe('true')
  })

  it('renders empty state when no sightings', () => {
    render(<ActivityLog sightings={[]} selectedId={null} onSelect={vi.fn()} />)
    expect(screen.getByText('NO SIGHTINGS')).toBeTruthy()
  })
})
