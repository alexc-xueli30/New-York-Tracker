export type SeverityTier = 'CRITICAL' | 'HIGH' | 'NOTABLE'

export type SightingCategory = 'pothole' | 'playground' | 'water' | 'tree' | 'other'

/** Raw record from NYC 311 Socrata API */
export interface SocrataRecord {
  unique_key: string
  created_date: string
  closed_date?: string
  complaint_type: string
  descriptor: string
  incident_address: string
  latitude?: string
  longitude?: string
  status: string
  borough: string
  agency?: string
  agency_name?: string
  cross_street_1?: string
  cross_street_2?: string
  intersection_street_1?: string
  intersection_street_2?: string
}

/** Curated sighting produced by AI curator, stored in page props */
export interface MapSighting {
  id: string
  title: string
  description: string
  category: SightingCategory
  severity: SeverityTier
  lat: number
  lng: number
  address: string
  borough: string
  createdAt: string
  closedAt?: string
  status: string
  rawComplaintType: string
}

/** Sighting with live vote counts (client-side, from Supabase) */
export interface MapSightingWithVotes extends MapSighting {
  votes: { likes: number; dislikes: number }
}

/** Aggregated resolution stats from Socrata GROUP BY query */
export interface ResolutionStats {
  totalReports: number
  avgResolutionDays: number | null
  recentlyClosed: number
}

/** NYC civic news item from RSS feed */
export interface NewsItem {
  title: string
  link: string
  pubDate: string
  source: 'gothamist' | 'citylimits' | 'streetsblog' | 'thecity'
}

/** Supabase vote row */
export interface VoteRow {
  id: string
  sighting_id: string
  vote: 1 | -1
  created_at: string
  ip_hash?: string
}
