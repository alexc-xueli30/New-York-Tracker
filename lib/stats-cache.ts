import { fetchResolutionStats } from './311-api'
import type { ResolutionStats } from './types'

let memCache: { data: ResolutionStats; ts: number } | null = null
const MEM_TTL = 60 * 60 * 1000 // 1 hour

export async function getCachedStats(): Promise<ResolutionStats> {
  if (memCache && Date.now() - memCache.ts < MEM_TTL) {
    return memCache.data
  }
  const stats = await fetchResolutionStats()
  if (stats.totalReports > 0) {
    memCache = { data: stats, ts: Date.now() }
  }
  return stats
}
