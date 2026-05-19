import { supabase } from './supabase'
import { saveEntry, loadEntries, saveCheckin, loadCheckins } from './storage'
import type { RealityEntry, CheckIn, LensId } from '@/types/reality'

// --- type converters ---

function entryToRow(entry: RealityEntry, userId: string) {
  return {
    id: entry.id,
    user_id: userId,
    situation: entry.situation,
    mood: entry.mood,
    stress: entry.stress,
    confidence: entry.confidence,
    primary_lens: entry.primaryLens,
    alternate_lenses: entry.alternateLenses,
    hidden_assumption: entry.hiddenAssumption,
    distortion: entry.distortion,
    better_frame: entry.betterFrame,
    best_action: entry.bestAction,
    clarity_score: entry.clarityScore,
    created_at: entry.createdAt,
  }
}

function rowToEntry(row: Record<string, unknown>): RealityEntry {
  return {
    id: row.id as string,
    situation: row.situation as string,
    mood: row.mood as number,
    stress: row.stress as number,
    confidence: row.confidence as number,
    primaryLens: row.primary_lens as LensId,
    alternateLenses: row.alternate_lenses as LensId[],
    hiddenAssumption: row.hidden_assumption as string,
    distortion: row.distortion as string,
    betterFrame: row.better_frame as string,
    bestAction: row.best_action as string,
    clarityScore: row.clarity_score as number,
    createdAt: row.created_at as string,
  }
}

function checkinToRow(checkin: CheckIn, userId: string) {
  return {
    id: checkin.id,
    user_id: userId,
    date: checkin.date,
    energy: checkin.energy,
    mood: checkin.mood,
    stress: checkin.stress,
    confidence: checkin.confidence,
    dominant_thought: checkin.dominantThought,
    predicted_lens: checkin.predictedLens,
    created_at: checkin.createdAt,
  }
}

function rowToCheckin(row: Record<string, unknown>): CheckIn {
  return {
    id: row.id as string,
    date: row.date as string,
    energy: row.energy as number,
    mood: row.mood as number,
    stress: row.stress as number,
    confidence: row.confidence as number,
    dominantThought: row.dominant_thought as string,
    predictedLens: row.predicted_lens as LensId,
    createdAt: row.created_at as string,
  }
}

// --- sync operations ---

export async function saveEntryWithSync(entry: RealityEntry): Promise<void> {
  saveEntry(entry)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return
  await supabase.from('entries').upsert(entryToRow(entry, session.user.id))
}

export async function saveCheckinWithSync(checkin: CheckIn): Promise<void> {
  saveCheckin(checkin)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return
  await supabase.from('checkins').upsert(checkinToRow(checkin, session.user.id))
}

export async function syncFromCloud(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  const [entriesRes, checkinsRes] = await Promise.all([
    supabase.from('entries').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
    supabase.from('checkins').select('*').eq('user_id', session.user.id).order('date', { ascending: false }),
  ])

  if (entriesRes.data && entriesRes.data.length > 0) {
    const cloud = entriesRes.data.map(rowToEntry)
    const local = loadEntries()
    const cloudIds = new Set(cloud.map(e => e.id))
    const merged = [...cloud, ...local.filter(e => !cloudIds.has(e.id))]
    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    localStorage.setItem('reality:entries', JSON.stringify(merged))
  }

  if (checkinsRes.data && checkinsRes.data.length > 0) {
    const cloud = checkinsRes.data.map(rowToCheckin)
    localStorage.setItem('reality:checkins', JSON.stringify(cloud))
  }
}

export async function pushLocalToCloud(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  const entries = loadEntries()
  const checkins = loadCheckins()

  await Promise.all([
    entries.length > 0
      ? supabase.from('entries').upsert(entries.map(e => entryToRow(e, session.user.id)))
      : Promise.resolve(),
    checkins.length > 0
      ? supabase.from('checkins').upsert(checkins.map(c => checkinToRow(c, session.user.id)))
      : Promise.resolve(),
  ])
}

// --- auth helpers ---

export async function signInWithEmail(email: string): Promise<void> {
  await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}
