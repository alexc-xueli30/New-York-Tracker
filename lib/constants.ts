import type { SeverityTier } from './types'

export const TIER_COLOR: Record<SeverityTier, string> = {
  CRITICAL: '#FFE600',
  HIGH:     '#FF6B35',
  NOTABLE:  '#4ECDC4',
}

export const TIER_SIZE: Record<SeverityTier, number> = {
  CRITICAL: 44,
  HIGH:     44,
  NOTABLE:  44,
}

export const TIER_BORDER_WIDTH: Record<SeverityTier, number> = {
  CRITICAL: 3,
  HIGH:     2,
  NOTABLE:  2,
}

export const TIER_LETTER: Record<SeverityTier, string> = {
  CRITICAL: 'C',
  HIGH:     'H',
  NOTABLE:  'N',
}
