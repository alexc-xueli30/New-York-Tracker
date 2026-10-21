'use client'

import type { SeverityTier } from '@/lib/types'
import { TIER_COLOR, TIER_BORDER_WIDTH } from '@/lib/constants'

export function SeverityBadge({ tier }: { tier: SeverityTier }) {
  return (
    <span
      className="inline-block px-2 py-0.5 text-xs font-pixel"
      style={{
        backgroundColor: TIER_COLOR[tier],
        border: `${TIER_BORDER_WIDTH[tier]}px solid #091932`,
        color: '#091932',
      }}
    >
      {tier}
    </span>
  )
}
