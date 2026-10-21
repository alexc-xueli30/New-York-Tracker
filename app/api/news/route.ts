import { NextResponse } from 'next/server'
import { fetchNewsItems } from '@/lib/news-feed'

export const revalidate = 1800

export async function GET() {
  const items = await fetchNewsItems()
  return NextResponse.json(items)
}
