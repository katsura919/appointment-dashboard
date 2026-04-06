import { redis } from './redis'

export async function withCache<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await redis.get<T>(key)
  if (cached !== null && cached !== undefined) {
    return cached
  }
  const data = await fetcher()
  await redis.set(key, data, { ex: ttl })
  return data
}

export async function invalidateKeys(...keys: string[]): Promise<void> {
  if (keys.length === 0) return
  await redis.del(...keys)
}

export async function invalidatePattern(pattern: string): Promise<void> {
  let cursor = 0
  const keysToDelete: string[] = []

  do {
    const [nextCursor, keys] = await redis.scan(cursor, { match: pattern, count: 100 })
    cursor = Number(nextCursor)
    keysToDelete.push(...keys)
  } while (cursor !== 0)

  if (keysToDelete.length > 0) {
    await redis.del(...keysToDelete)
  }
}

export const CacheKeys = {
  dashboardOverview: (workspaceId: string) => `dashboard:overview:${workspaceId}`,
  familyMembers: (workspaceId: string) => `family-members:${workspaceId}`,
  appointments: (workspaceId: string, filterHash: string) => `appointments:${workspaceId}:${filterHash}`,
  appointmentsPattern: (workspaceId: string) => `appointments:${workspaceId}:*`,
  trelloBoard: (projectId: string) => `trello:board:${projectId}`,
  userProfile: (userId: string) => `user-profile:${userId}`,
  workspaces: (userId: string) => `workspaces:${userId}`,
}

export const CacheTTL = {
  dashboardOverview: 60,
  familyMembers: 300,
  appointments: 120,
  trelloBoard: 120,
  userProfile: 600,
  workspaces: 600,
}

export function hashFilters(params: Record<string, string | null>): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k] ?? ''}`)
    .join('&')
  return Buffer.from(sorted).toString('base64url')
}
