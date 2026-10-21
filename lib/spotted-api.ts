export interface SpottedPost {
  id: string
  source: 'seeclickfix' | 'reddit'
  title: string
  description?: string
  imageUrl?: string
  url: string
  createdAt: string
  address?: string
  lat?: number
  lng?: number
  status?: string
  author?: string
  score?: number
}

// NYC bounding box — same as 311-api
const NYC = { minLat: 40.47, maxLat: 40.95, minLng: -74.30, maxLng: -73.65 }

function inNYC(lat: number, lng: number) {
  return lat >= NYC.minLat && lat <= NYC.maxLat && lng >= NYC.minLng && lng <= NYC.maxLng
}

async function fetchSeeClickFix(): Promise<SpottedPost[]> {
  // NYC center; SeeClickFix returns issues within ~zoom-11 radius
  const url = 'https://seeclickfix.com/api/v2/issues?lat=40.7128&lng=-74.0060&zoom=11&sort=created_at&per_page=30&status=Open'
  const res = await fetch(url, { next: { revalidate: 1800 } })
  if (!res.ok) throw new Error(`SeeClickFix ${res.status}`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await res.json() as { issues?: any[] }
  return (data.issues ?? [])
    .filter(i => i.lat && i.lng && inNYC(Number(i.lat), Number(i.lng)))
    .map(issue => ({
      id: `scf-${issue.id}`,
      source: 'seeclickfix' as const,
      title: issue.summary ?? 'Untitled report',
      description: issue.description ?? undefined,
      imageUrl: issue.media?.image_full ?? undefined,
      url: issue.html_url ?? `https://seeclickfix.com/issues/${issue.id}`,
      createdAt: issue.created_at,
      address: issue.address ?? undefined,
      lat: Number(issue.lat),
      lng: Number(issue.lng),
      status: issue.status ?? undefined,
      author: issue.reporter?.name ?? undefined,
    }))
}

// Reddit requires OAuth app credentials — optional, skipped if keys are absent
async function fetchRedditToken(): Promise<string> {
  const id = process.env.REDDIT_CLIENT_ID
  const secret = process.env.REDDIT_CLIENT_SECRET
  if (!id || !secret) throw new Error('Reddit credentials not configured')

  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'MamdaniTracker/1.0',
    },
    body: 'grant_type=client_credentials',
    next: { revalidate: 3000 }, // token lasts 1hr, refresh at 50min
  })
  if (!res.ok) throw new Error(`Reddit token ${res.status}`)
  const data = await res.json() as { access_token: string }
  return data.access_token
}

const REDDIT_Q = 'pothole OR flooding OR noise OR "heat outage" OR rodent OR sewer'

async function fetchReddit(): Promise<SpottedPost[]> {
  const token = await fetchRedditToken()
  const url = `https://oauth.reddit.com/r/nyc/search?q=${encodeURIComponent(REDDIT_Q)}&sort=new&limit=20&restrict_sr=1&t=week`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'MamdaniTracker/1.0',
    },
    next: { revalidate: 1800 },
  })
  if (!res.ok) throw new Error(`Reddit search ${res.status}`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await res.json() as { data?: { children?: { data: any }[] } }
  return (data.data?.children ?? [])
    .map(c => c.data)
    .filter(p => p.score > 3)
    .map(post => ({
      id: `reddit-${post.id}`,
      source: 'reddit' as const,
      title: post.title,
      description: post.selftext ? post.selftext.slice(0, 220) : undefined,
      imageUrl: post.thumbnail?.startsWith('http') ? post.thumbnail : undefined,
      url: `https://reddit.com${post.permalink}`,
      createdAt: new Date(post.created_utc * 1000).toISOString(),
      author: `u/${post.author}`,
      score: post.score,
    }))
}

export async function fetchSpottedPosts(): Promise<SpottedPost[]> {
  const [scf, reddit] = await Promise.allSettled([fetchSeeClickFix(), fetchReddit()])
  const posts: SpottedPost[] = []
  if (scf.status === 'fulfilled') posts.push(...scf.value)
  else console.warn('[spotted] SeeClickFix failed:', scf.reason)
  if (reddit.status === 'fulfilled') posts.push(...reddit.value)
  else console.warn('[spotted] Reddit skipped:', reddit.reason?.message)
  return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}
