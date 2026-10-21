'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Calendar, ExternalLink } from 'lucide-react'
import { SeverityBadge } from './SeverityBadge'
import { VoteButtons } from './VoteButtons'
import type { MapSighting } from '@/lib/types'

interface DetailCardProps {
  sighting: MapSighting | null
  likes: number
  dislikes: number
  onClose: () => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 10 }

/** Mobile-only bottom sheet. Desktop detail is handled by the sidebar in HomeClient. */
export function DetailCard({ sighting, likes, dislikes, onClose }: DetailCardProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (sighting) closeRef.current?.focus()
  }, [sighting?.id])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <AnimatePresence>
      {sighting && (
        <>
          <motion.div
            className="md:hidden fixed inset-0 bg-black/50 z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            key={sighting.id}
            role="dialog"
            aria-label={`Detail: ${sighting.title}`}
            aria-modal="true"
            className="md:hidden fixed bottom-0 left-0 right-0 z-30 overflow-y-auto rounded-t-xl"
            style={{ height: '80vh', backgroundColor: 'var(--color-surface)', borderTop: '2px solid var(--color-border)' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SPRING}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full opacity-30" style={{ backgroundColor: 'var(--color-text)' }} />
            </div>
            <CardContent
              sighting={sighting}
              likes={likes}
              dislikes={dislikes}
              onClose={onClose}
              closeRef={closeRef}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export function CardContent({
  sighting,
  likes,
  dislikes,
  onClose,
  closeRef,
}: {
  sighting: MapSighting
  likes: number
  dislikes: number
  onClose: () => void
  closeRef: React.RefObject<HTMLButtonElement | null>
}) {
  return (
    <div className="p-4 flex flex-col gap-4 halftone">
      <div className="flex items-start justify-between gap-2">
        <SeverityBadge tier={sighting.severity} />
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="Close detail card"
          className="p-1 rounded opacity-70 hover:opacity-100 focus:outline-none focus:ring-2"
          style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text)' }}
        >
          <X size={18} />
        </button>
      </div>

      <h2 className="font-pixel text-ink leading-snug" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>
        {sighting.title}
      </h2>

      <p className="font-body text-sm text-ink opacity-90 leading-relaxed" style={{ fontSize: '12px' }}>
        {sighting.description}
      </p>

      <div className="flex gap-3">
        {/* Mapbox satellite 3D thumbnail */}
        <a
          href={`https://www.google.com/maps?q=${sighting.lat},${sighting.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0"
          style={{ display: 'block' }}
        >
          <img
            src={`https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${sighting.lng},${sighting.lat},16,0,50/88x110@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`}
            alt="Satellite view of location — open in Google Maps"
            width={88}
            height={110}
            className="rounded object-cover"
            style={{ border: '1px solid var(--color-border)', display: 'block' }}
          />
        </a>

        <div className="flex flex-col gap-2 font-mono text-ink opacity-70 flex-1" style={{ fontSize: '10px' }}>
          <div className="flex items-center gap-1.5">
            <MapPin size={11} />
            <span>{sighting.address}, {sighting.borough}</span>
          </div>
          <a
            href={`https://www.google.com/maps?q=${sighting.lat},${sighting.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--color-accent, #4ECDC4)' }}
          >
            <ExternalLink size={11} />
            <span>Open in Google Maps</span>
          </a>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Calendar size={11} />
            <span>Reported {formatDate(sighting.createdAt)}</span>
            {sighting.closedAt && <span>· Closed {formatDate(sighting.closedAt)}</span>}
          </div>
          <div>
            <span
              className="inline-block px-1.5 py-0.5 rounded text-xs font-pixel"
              style={{
                fontSize: '8px',
                backgroundColor: sighting.status === 'Closed' ? '#4ECDC4' : '#FF6B35',
                color: '#091932',
              }}
            >
              {sighting.status}
            </span>
            <span className="ml-2 opacity-60">{sighting.rawComplaintType}</span>
          </div>
        </div>
      </div>

      <hr style={{ borderColor: 'var(--color-border)', opacity: 0.3 }} />

      <div>
        <p className="font-pixel text-ink opacity-50 mb-2" style={{ fontSize: '8px' }}>IS THIS WORTH FIXING?</p>
        <VoteButtons
          sightingId={sighting.id}
          initialLikes={likes}
          initialDislikes={dislikes}
        />
      </div>
    </div>
  )
}
