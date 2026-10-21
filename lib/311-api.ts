import type { SocrataRecord, ResolutionStats, SightingCategory, MapSighting, SeverityTier } from './types'

const BASE_URL = 'https://data.cityofnewyork.us/resource/erm2-nwe9.json'

function socrataUrl(params: Record<string, string>): string {
  const url = new URL(BASE_URL)
  const token = process.env.SOCRATA_APP_TOKEN
  if (token) url.searchParams.set('$$app_token', token)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  return url.toString()
}

function socrataHeaders(): HeadersInit {
  const token = process.env.SOCRATA_APP_TOKEN
  return token ? { 'X-App-Token': token } : {}
}

const LAT_MIN = 40.48, LAT_MAX = 40.92
const LNG_MIN = -74.27, LNG_MAX = -73.70
const LAT_STEP = (LAT_MAX - LAT_MIN) / 4  // 0.11 per band
const LNG_STEP = (LNG_MAX - LNG_MIN) / 5  // 0.114 per band

const GRID_CELLS = Array.from({ length: 4 }, (_, row) =>
  Array.from({ length: 5 }, (_, col) => ({
    latMin: LAT_MIN + row * LAT_STEP,
    latMax: LAT_MIN + (row + 1) * LAT_STEP,
    lngMin: LNG_MIN + col * LNG_STEP,
    lngMax: LNG_MIN + (col + 1) * LNG_STEP,
  }))
).flat()

const COMPLAINT_TYPES = "complaint_type IN ('HEAT/HOT WATER','Pothole','Street Light Condition','Blocked Driveway','Illegal Parking','Noise - Residential','UNSANITARY CONDITION','Rodent','Water System','Sewer')"

/** Fetch recent open 311 complaints via 4x5 geographic grid — guarantees dots across all boroughs */
export async function fetchRecentComplaints(): Promise<SocrataRecord[]> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19)
  const cellResults = await Promise.all(
    GRID_CELLS.map(async ({ latMin, latMax, lngMin, lngMax }) => {
      const url = socrataUrl({
        '$limit': '6',
        '$order': 'created_date DESC',
        '$where': [
          'latitude IS NOT NULL',
          'longitude IS NOT NULL',
          `latitude BETWEEN ${latMin} AND ${latMax}`,
          `longitude BETWEEN ${lngMin} AND ${lngMax}`,
          COMPLAINT_TYPES,
          "status != 'Closed'",
          `created_date > '${ninetyDaysAgo}'`,
        ].join(' AND '),
        '$select': 'unique_key,created_date,closed_date,complaint_type,descriptor,incident_address,cross_street_1,cross_street_2,intersection_street_1,intersection_street_2,latitude,longitude,status,borough',
      })
      try {
        const res = await fetch(url, { next: { revalidate: 1800 }, headers: socrataHeaders(), signal: AbortSignal.timeout(5000) })
        if (!res.ok) return []
        return await res.json() as SocrataRecord[]
      } catch {
        return []
      }
    })
  )

  const seen = new Set<string>()
  return cellResults.flat().filter(r => {
    const lat = parseFloat(r.latitude ?? '')
    const lng = parseFloat(r.longitude ?? '')
    if (isNaN(lat) || isNaN(lng) || !withinNYC(lat, lng)) return false
    if (seen.has(r.unique_key)) return false
    seen.add(r.unique_key)
    return true
  })
}

/** Fetch aggregate stats — total report count and recently closed */
export async function fetchResolutionStats(): Promise<ResolutionStats> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19)
  const headers = socrataHeaders()

  const totalUrl = socrataUrl({
    '$select': 'COUNT(*) AS total',
    '$where': "created_date > '2024-01-01T00:00:00'",
    '$limit': '1',
  })
  const recentUrl = socrataUrl({
    '$select': 'COUNT(*) AS recently_closed',
    '$where': `status='Closed' AND closed_date > '${thirtyDaysAgo}'`,
    '$limit': '1',
  })
  const avgUrl = socrataUrl({
    '$select': 'created_date,closed_date',
    '$where': `status='Closed' AND closed_date IS NOT NULL AND closed_date > '${thirtyDaysAgo}'`,
    '$order': 'closed_date DESC',
    '$limit': '200',
  })

  const cacheOpts = { next: { revalidate: 3600 }, headers, signal: AbortSignal.timeout(8000) }

  try {
    const [totalRes, recentRes, avgRes] = await Promise.all([
      fetch(totalUrl, cacheOpts),
      fetch(recentUrl, cacheOpts),
      fetch(avgUrl, cacheOpts),
    ])
    if (!totalRes.ok || !recentRes.ok) throw new Error('Stats fetch failed')
    const [totalRow] = await totalRes.json() as [{ total: string }]
    const [recentRow] = await recentRes.json() as [{ recently_closed: string }]

    let avgResolutionDays: number | null = null
    try {
      if (avgRes.ok) {
        const avgRows = await avgRes.json() as { created_date: string; closed_date: string }[]
        const diffs = avgRows
          .map(r => (new Date(r.closed_date).getTime() - new Date(r.created_date).getTime()) / 86_400_000)
          .filter(d => d >= 0 && d < 365)
        if (diffs.length) avgResolutionDays = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length)
      }
    } catch { /* avg is optional — fall through with null */ }

    return {
      totalReports: parseInt(totalRow.total, 10) || 0,
      avgResolutionDays,
      recentlyClosed: parseInt(recentRow.recently_closed, 10) || 0,
    }
  } catch {
    return { totalReports: 0, avgResolutionDays: null, recentlyClosed: 0 }
  }
}

/** Fetch complaints within an arbitrary bounding box (for viewport re-fetch on pan/zoom) */
export async function fetchViewportComplaints(
  bounds: { latMin: number; latMax: number; lngMin: number; lngMax: number },
  limit = 40,
): Promise<SocrataRecord[]> {
  const { latMin, latMax, lngMin, lngMax } = bounds
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19)
  const url = socrataUrl({
    '$limit': String(limit),
    '$order': 'created_date DESC',
    '$where': [
      'latitude IS NOT NULL',
      'longitude IS NOT NULL',
      `latitude BETWEEN ${latMin.toFixed(3)} AND ${latMax.toFixed(3)}`,
      `longitude BETWEEN ${lngMin.toFixed(3)} AND ${lngMax.toFixed(3)}`,
      COMPLAINT_TYPES,
      "status != 'Closed'",
      `created_date > '${thirtyDaysAgo}'`,
    ].join(' AND '),
    '$select': 'unique_key,created_date,closed_date,complaint_type,descriptor,incident_address,cross_street_1,cross_street_2,intersection_street_1,intersection_street_2,latitude,longitude,status,borough',
  })

  try {
    const res = await fetch(url, { next: { revalidate: 300 }, headers: socrataHeaders(), signal: AbortSignal.timeout(5000) })
    if (!res.ok) return []
    const records = await res.json() as SocrataRecord[]
    return records.filter(r => {
      const lat = parseFloat(r.latitude ?? '')
      const lng = parseFloat(r.longitude ?? '')
      return !isNaN(lat) && !isNaN(lng)
    })
  } catch {
    return []
  }
}

/** Assign a severity tier from complaint type without AI */
function classifySeverity(complaintType: string): SeverityTier {
  const t = complaintType.toLowerCase()
  if (t.includes('heat') || t.includes('water system') || t.includes('sewer') || t.includes('gas')) return 'CRITICAL'
  if (t.includes('pothole') || t.includes('street light') || t.includes('blocked') || t.includes('rodent')) return 'HIGH'
  return 'NOTABLE'
}

/** True if the coordinate pair is within the NYC map viewport */
function withinNYC(lat: number, lng: number): boolean {
  return lat >= LAT_MIN && lat <= LAT_MAX && lng >= LNG_MIN && lng <= LNG_MAX
}

/** Convert a raw Socrata record to a basic MapSighting with rule-based severity */
export function rawToSighting(r: SocrataRecord): MapSighting {
  const type = r.complaint_type
  return {
    id: r.unique_key,
    title: `${type}: ${r.incident_address || (r.cross_street_1 && r.cross_street_2 ? `${r.cross_street_1} & ${r.cross_street_2}` : '') || (r.intersection_street_1 && r.intersection_street_2 ? `${r.intersection_street_1} & ${r.intersection_street_2}` : '') || 'Unknown address'}`,
    description: r.descriptor,
    severity: classifySeverity(type),
    category: classifyComplaintType(type),
    lat: parseFloat(r.latitude!),
    lng: parseFloat(r.longitude!),
    address: r.incident_address || (r.cross_street_1 && r.cross_street_2 ? `${r.cross_street_1} & ${r.cross_street_2}` : undefined) || (r.intersection_street_1 && r.intersection_street_2 ? `${r.intersection_street_1} & ${r.intersection_street_2}` : undefined) || 'Unknown address',
    borough: r.borough,
    createdAt: r.created_date,
    closedAt: r.closed_date,
    status: r.status,
    rawComplaintType: type,
  }
}

/** Map a 311 complaint_type string to an internal category */
export function classifyComplaintType(complaintType: string): SightingCategory {
  const t = complaintType.toLowerCase()
  if (t.includes('pothole') || t.includes('road') || t.includes('street') || t.includes('pavement')) return 'pothole'
  if (t.includes('park') || t.includes('playground') || t.includes('recreation')) return 'playground'
  if (t.includes('water') || t.includes('sewer') || t.includes('drain') || t.includes('flood')) return 'water'
  if (t.includes('tree') || t.includes('plant') || t.includes('forest')) return 'tree'
  return 'other'
}
