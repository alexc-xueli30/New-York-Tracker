import { HomeClient } from './HomeClient'
import { getCachedStats } from '@/lib/stats-cache'

export default async function Page() {
  const initialStats = await getCachedStats()
  return <HomeClient initialStats={initialStats} />
}
