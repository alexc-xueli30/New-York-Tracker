import { NextRequest, NextResponse } from 'next/server'
import { fetchViewportComplaints } from '@/lib/311-api'
import type { SocrataRecord } from '@/lib/types'

export const revalidate = 300

let memCache: Map<string, { data: SocrataRecord[]; ts: number }> = new Map()
const MEM_TTL = 5 * 60 * 1000 // 5 min

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const latMin = parseFloat(p.get('latMin') ?? '')
  const latMax = parseFloat(p.get('latMax') ?? '')
  const lngMin = parseFloat(p.get('lngMin') ?? '')
  const lngMax = parseFloat(p.get('lngMax') ?? '')
  const limit  = Math.min(parseInt(p.get('limit') ?? '50', 10), 300)
  const zoom   = parseInt(p.get('zoom') ?? '12', 10)

  if ([latMin, latMax, lngMin, lngMax].some(isNaN)) {
    return NextResponse.json([], { status: 400 })
  }

  const key = `${latMin},${latMax},${lngMin},${lngMax},${limit},${zoom}`
  const cached = memCache.get(key)
  if (cached && Date.now() - cached.ts < MEM_TTL) {
    return NextResponse.json(cached.data)
  }

  const records = await fetchViewportComplaints({ latMin, latMax, lngMin, lngMax }, limit)
  memCache.set(key, { data: records, ts: Date.now() })
  return NextResponse.json(records)
}
