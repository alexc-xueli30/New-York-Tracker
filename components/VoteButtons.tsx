'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ThumbsUp, ThumbsDown } from 'lucide-react'

interface VoteButtonsProps {
  sightingId: string
  initialLikes: number
  initialDislikes: number
}

type VoteState = 'none' | 'liked' | 'disliked'

const STORAGE_KEY = (id: string) => `vote:${id}`

function getStoredVote(id: string): VoteState {
  if (typeof window === 'undefined') return 'none'
  return (localStorage.getItem(STORAGE_KEY(id)) as VoteState) ?? 'none'
}

export function VoteButtons({ sightingId, initialLikes, initialDislikes }: VoteButtonsProps) {
  const [likes, setLikes] = useState(initialLikes)
  const [dislikes, setDislikes] = useState(initialDislikes)
  const [voteState, setVoteState] = useState<VoteState>(() => getStoredVote(sightingId))
  const [likeBounce, setLikeBounce] = useState(0)
  const [dislikeBounce, setDislikeBounce] = useState(0)
  const [disabled, setDisabled] = useState(false)

  async function castVote(v: 1 | -1) {
    if (voteState !== 'none' || disabled) return
    setDisabled(true)

    const newState: VoteState = v === 1 ? 'liked' : 'disliked'
    if (v === 1) {
      setLikes(n => n + 1)
      setLikeBounce(n => n + 1)
    } else {
      setDislikes(n => n + 1)
      setDislikeBounce(n => n + 1)
    }
    setVoteState(newState)
    localStorage.setItem(STORAGE_KEY(sightingId), newState)

    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sightingId, vote: v }),
      })
      if (res.ok) {
        const { likes: l, dislikes: d } = await res.json()
        setLikes(l)
        setDislikes(d)
      }
    } catch {
      // Keep optimistic update on network failure
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => castVote(1)}
        disabled={voteState !== 'none'}
        aria-label={`Like this sighting (${likes} likes)`}
        className="flex items-center gap-2 rounded px-3 py-2 text-sm font-mono transition-colors disabled:opacity-60"
        style={{
          minWidth: 44,
          minHeight: 44,
          backgroundColor: voteState === 'liked' ? '#4ECDC4' : 'var(--color-surface)',
          border: '2px solid var(--color-border)',
          color: voteState === 'liked' ? '#0D0D0D' : 'var(--color-text)',
        }}
      >
        <ThumbsUp size={16} />
        <motion.span
          key={likeBounce}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ type: 'spring', stiffness: 400, damping: 10 }}
        >
          {likes > 0 ? likes : '—'}
        </motion.span>
      </button>

      <button
        onClick={() => castVote(-1)}
        disabled={voteState !== 'none'}
        aria-label={`Dislike this sighting (${dislikes} dislikes)`}
        className="flex items-center gap-2 rounded px-3 py-2 text-sm font-mono transition-colors disabled:opacity-60"
        style={{
          minWidth: 44,
          minHeight: 44,
          backgroundColor: voteState === 'disliked' ? '#FF6B35' : 'var(--color-surface)',
          border: '2px solid var(--color-border)',
          color: voteState === 'disliked' ? '#0D0D0D' : 'var(--color-text)',
        }}
      >
        <ThumbsDown size={16} />
        <motion.span
          key={dislikeBounce}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ type: 'spring', stiffness: 400, damping: 10 }}
        >
          {dislikes > 0 ? dislikes : '—'}
        </motion.span>
      </button>
    </div>
  )
}
