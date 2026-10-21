import { fetchSpottedPosts } from '@/lib/spotted-api'
import { NextResponse } from 'next/server'

export const revalidate = 1800

export async function GET() {
  try {
    const posts = await fetchSpottedPosts()
    return NextResponse.json(posts)
  } catch (err) {
    console.error('[spotted]', err)
    return NextResponse.json([], { status: 200 })
  }
}
