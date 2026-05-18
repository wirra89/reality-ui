import type { RealityEntry } from '@/types/reality'

export function calculateStreak(
  entries: RealityEntry[],
  today: string = new Date().toISOString().slice(0, 10),
): number {
  if (entries.length === 0) return 0

  const dates = [...new Set(entries.map(e => e.createdAt.slice(0, 10)))]
    .sort()
    .reverse()

  const yesterday = new Date(new Date(today).getTime() - 86400000)
    .toISOString()
    .slice(0, 10)

  if (dates[0] !== today && dates[0] !== yesterday) return 0

  let streak = 1
  for (let i = 1; i < dates.length; i++) {
    const expected = new Date(new Date(dates[i - 1]).getTime() - 86400000)
      .toISOString()
      .slice(0, 10)
    if (dates[i] === expected) {
      streak++
    } else {
      break
    }
  }

  return streak
}
