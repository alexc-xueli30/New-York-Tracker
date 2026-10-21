import { NextResponse } from 'next/server'
import { getCachedStats } from '@/lib/stats-cache'

export const revalidate = 3600

export async function GET() {
  const stats = await getCachedStats()
  return NextResponse.json(stats)
}
