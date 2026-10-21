import { NextResponse } from 'next/server'
import { fetchRecentComplaints, rawToSighting } from '@/lib/311-api'
import type { MapSighting } from '@/lib/types'

export const revalidate = 1800

// In-process cache — survives across requests in dev mode where Next.js fetch cache is bypassed
let memCache: { data: MapSighting[]; ts: number } | null = null
const MEM_TTL = 10 * 60 * 1000 // 10 min

export async function GET() {
  if (memCache && Date.now() - memCache.ts < MEM_TTL) {
    return NextResponse.json(memCache.data)
  }
  const records = await fetchRecentComplaints()
  const sightings = records.map(rawToSighting)
  memCache = { data: sightings, ts: Date.now() }
  return NextResponse.json(sightings)
}
