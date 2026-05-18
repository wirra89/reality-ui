import { describe, it, expect } from 'vitest'
import { calculateStreak } from '@/lib/streak'
import type { RealityEntry } from '@/types/reality'

function makeEntry(date: string): RealityEntry {
  return {
    id: crypto.randomUUID(),
    situation: 'test',
    mood: 50, stress: 50, confidence: 50,
    primaryLens: 'logic',
    alternateLenses: [],
    hiddenAssumption: '',
    distortion: '',
    betterFrame: '',
    bestAction: '',
    clarityScore: 70,
    createdAt: `${date}T12:00:00.000Z`,
  }
}

describe('calculateStreak', () => {
  it('returns 0 for empty entries', () => {
    expect(calculateStreak([], '2026-01-10')).toBe(0)
  })

  it('returns 1 for a single entry today', () => {
    expect(calculateStreak([makeEntry('2026-01-10')], '2026-01-10')).toBe(1)
  })

  it('returns 1 for a single entry yesterday', () => {
    expect(calculateStreak([makeEntry('2026-01-09')], '2026-01-10')).toBe(1)
  })

  it('returns 0 when last entry was 2 days ago', () => {
    expect(calculateStreak([makeEntry('2026-01-08')], '2026-01-10')).toBe(0)
  })

  it('counts consecutive days correctly', () => {
    const entries = [
      makeEntry('2026-01-10'),
      makeEntry('2026-01-09'),
      makeEntry('2026-01-08'),
    ]
    expect(calculateStreak(entries, '2026-01-10')).toBe(3)
  })

  it('stops counting at a gap', () => {
    const entries = [
      makeEntry('2026-01-10'),
      makeEntry('2026-01-09'),
      makeEntry('2026-01-07'),
    ]
    expect(calculateStreak(entries, '2026-01-10')).toBe(2)
  })

  it('deduplicates multiple entries on the same day', () => {
    const entries = [
      makeEntry('2026-01-10'),
      makeEntry('2026-01-10'),
      makeEntry('2026-01-09'),
    ]
    expect(calculateStreak(entries, '2026-01-10')).toBe(2)
  })
})
