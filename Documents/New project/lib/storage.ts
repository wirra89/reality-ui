import type { RealityEntry, CheckIn, Settings } from '@/types/reality'

const KEYS = {
  entries: 'reality:entries',
  checkins: 'reality:checkins',
  settings: 'reality:settings',
} as const

const DEFAULT_SETTINGS: Settings = { onboardingDone: false }

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function safeSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore quota errors
  }
}

export function saveEntry(entry: RealityEntry): void {
  const existing = loadEntries().filter(e => e.id !== entry.id)
  safeSet(KEYS.entries, [entry, ...existing])
}

export function loadEntries(): RealityEntry[] {
  return safeGet<RealityEntry[]>(KEYS.entries, [])
}

export function loadEntry(id: string): RealityEntry | null {
  return loadEntries().find(e => e.id === id) ?? null
}

export function saveCheckin(checkin: CheckIn): void {
  const existing = loadCheckins().filter(c => c.date !== checkin.date)
  safeSet(KEYS.checkins, [checkin, ...existing])
}

export function loadCheckins(): CheckIn[] {
  return safeGet<CheckIn[]>(KEYS.checkins, [])
}

export function loadSettings(): Settings {
  return safeGet<Settings>(KEYS.settings, DEFAULT_SETTINGS)
}

export function saveSettings(settings: Settings): void {
  safeSet(KEYS.settings, settings)
}
