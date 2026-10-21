import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = (url && anonKey) ? createClient(url, anonKey) : null

export type VoteTotals = Record<string, { likes: number; dislikes: number }>

export async function fetchVoteTotals(sightingIds: string[]): Promise<VoteTotals> {
  if (sightingIds.length === 0 || !supabase) return {}

  const { data, error } = await supabase
    .from('votes')
    .select('sighting_id, vote')
    .in('sighting_id', sightingIds)

  if (error || !data) return {}

  const totals: VoteTotals = {}
  for (const id of sightingIds) {
    totals[id] = { likes: 0, dislikes: 0 }
  }
  for (const row of data) {
    if (!totals[row.sighting_id]) continue
    if (row.vote === 1)  totals[row.sighting_id].likes++
    else if (row.vote === -1) totals[row.sighting_id].dislikes++
  }
  return totals
}
