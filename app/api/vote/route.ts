import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { sightingId, vote } = await req.json() as { sightingId: string; vote: 1 | -1 }

    if (!sightingId || (vote !== 1 && vote !== -1)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const ipHash = createHash('sha256').update(ip + sightingId).digest('hex')

    // One vote per IP+sighting combo
    const { data: existing } = await supabase
      .from('votes')
      .select('id')
      .eq('ip_hash', ipHash)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already voted' }, { status: 409 })
    }

    const { error } = await supabase.from('votes').insert({
      sighting_id: sightingId,
      vote,
      ip_hash: ipHash,
    })

    if (error) throw error

    // Return updated totals
    const { data: rows } = await supabase
      .from('votes')
      .select('vote')
      .eq('sighting_id', sightingId)

    const likes = rows?.filter(r => r.vote === 1).length ?? 0
    const dislikes = rows?.filter(r => r.vote === -1).length ?? 0

    return NextResponse.json({ likes, dislikes })
  } catch (err) {
    console.error('[vote] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
