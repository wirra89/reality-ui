import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveEntry,
  loadEntries,
  loadEntry,
  saveCheckin,
  loadCheckins,
  loadSettings,
  saveSettings,
} from '@/lib/storage'
import type { RealityEntry, CheckIn } from '@/types/reality'

const today = new Date().toISOString().slice(0, 10)

const mockEntry: RealityEntry = {
  id: 'test-id-1',
  situation: 'She did not reply.',
  mood: 40,
  stress: 75,
  confidence: 30,
  primaryLens: 'mating',
  alternateLenses: ['statistics', 'abundance', 'strategy'],
  hiddenAssumption: 'If she cared, she would respond quickly.',
  distortion: 'Mind reading + emotional reasoning',
  betterFrame: 'Her response timing is data, not a verdict.',
  bestAction: 'Do not follow up. Redirect attention.',
  clarityScore: 52,
  createdAt: new Date().toISOString(),
}

const mockCheckin: CheckIn = {
  id: 'checkin-1',
  date: today,
  energy: 60,
  mood: 50,
  stress: 70,
  confidence: 40,
  dominantThought: 'Worried about the meeting today.',
  predictedLens: 'strategy',
  createdAt: new Date().toISOString(),
}

beforeEach(() => {
  localStorage.clear()
})

describe('entries', () => {
  it('returns empty array when nothing stored', () => {
    expect(loadEntries()).toEqual([])
  })

  it('saves and retrieves an entry', () => {
    saveEntry(mockEntry)
    const entries = loadEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe('test-id-1')
  })

  it('loadEntry returns entry by id', () => {
    saveEntry(mockEntry)
    const entry = loadEntry('test-id-1')
    expect(entry).not.toBeNull()
    expect(entry!.situation).toBe('She did not reply.')
  })

  it('loadEntry returns null for unknown id', () => {
    expect(loadEntry('unknown')).toBeNull()
  })

  it('prepends new entries — newest first', () => {
    const entry2 = { ...mockEntry, id: 'test-id-2' }
    saveEntry(mockEntry)
    saveEntry(entry2)
    const entries = loadEntries()
    expect(entries[0].id).toBe('test-id-2')
  })

  it('deduplicates by id when saving same entry twice', () => {
    saveEntry(mockEntry)
    saveEntry({ ...mockEntry, situation: 'Updated' })
    const entries = loadEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0].situation).toBe('Updated')
  })
})

describe('checkins', () => {
  it('returns empty array when nothing stored', () => {
    expect(loadCheckins()).toEqual([])
  })

  it('saves and retrieves a check-in', () => {
    saveCheckin(mockCheckin)
    expect(loadCheckins()).toHaveLength(1)
  })

  it('replaces check-in for same date', () => {
    saveCheckin(mockCheckin)
    saveCheckin({ ...mockCheckin, energy: 90 })
    const checkins = loadCheckins()
    expect(checkins).toHaveLength(1)
    expect(checkins[0].energy).toBe(90)
  })
})

describe('settings', () => {
  it('returns default settings when nothing stored', () => {
    expect(loadSettings()).toEqual({ onboardingDone: false })
  })

  it('saves and retrieves settings', () => {
    saveSettings({ onboardingDone: true })
    expect(loadSettings().onboardingDone).toBe(true)
  })
})
