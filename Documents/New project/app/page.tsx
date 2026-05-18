'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/GlassCard'
import { LensTag } from '@/components/LensTag'
import { ScoreRing } from '@/components/ScoreRing'
import { loadEntries, loadCheckins, saveSettings, loadSettings } from '@/lib/storage'
import { getLens } from '@/lib/lenses'
import type { RealityEntry, LensId } from '@/types/reality'

function dominantLens(entries: RealityEntry[]): LensId | null {
  if (entries.length === 0) return null
  const counts: Partial<Record<LensId, number>> = {}
  for (const e of entries.slice(0, 7)) {
    counts[e.primaryLens] = (counts[e.primaryLens] ?? 0) + 1
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as LensId
}

function avgClarity(entries: RealityEntry[]): number {
  if (entries.length === 0) return 0
  return Math.round(entries.slice(0, 7).reduce((s, e) => s + e.clarityScore, 0) / Math.min(entries.length, 7))
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function HomePage() {
  const router = useRouter()
  const [entries, setEntries] = useState<RealityEntry[]>([])
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    const loaded = loadEntries()
    setEntries(loaded)
    const settings = loadSettings()
    if (!settings.onboardingDone && loaded.length === 0) {
      setShowOnboarding(true)
    }
  }, [])

  const checkins = loadCheckins()
  const latestCheckin = checkins[0] ?? null
  const primary = dominantLens(entries)
  const clarity = avgClarity(entries)
  const recent = entries.slice(0, 3)

  function dismissOnboarding() {
    saveSettings({ onboardingDone: true })
    setShowOnboarding(false)
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-32">
      <header className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[--text-dim]">
          Reality UI
        </p>
        <h1 className="mt-1 text-2xl font-light text-[--text] leading-snug">
          What reality are you<br />operating from today?
        </h1>
      </header>

      {/* State strip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <GlassCard className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-[--text-dim] mb-2">
                {entries.length > 0 ? 'Recent clarity' : 'No decodes yet'}
              </p>
              {primary ? (
                <>
                  <p className="text-sm text-[--text-muted] mb-1">Dominant lens</p>
                  <LensTag lensId={primary} size="md" />
                </>
              ) : (
                <p className="text-sm text-[--text-muted]">Start your first decode below</p>
              )}
              {latestCheckin && (
                <p className="text-xs text-[--text-dim] mt-2">
                  Today&apos;s energy: {latestCheckin.energy} · Stress: {latestCheckin.stress}
                </p>
              )}
            </div>
            {entries.length > 0 && <ScoreRing score={clarity} />}
          </div>
        </GlassCard>
      </motion.div>

      {/* Quick actions */}
      <motion.div
        className="grid grid-cols-2 gap-3 mb-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <button
          onClick={() => router.push('/decode')}
          className="min-h-24 rounded-2xl border border-white/10 bg-white p-4 text-left text-black shadow-xl shadow-violet-950/30"
        >
          <p className="text-sm font-bold">Decode Reality</p>
          <p className="mt-2 text-xs leading-5 text-zinc-600">Analyze a situation through multiple lenses.</p>
        </button>
        <button
          onClick={() => router.push('/checkin')}
          className="min-h-24 rounded-2xl border border-white/10 bg-white/[0.055] p-4 text-left text-[--text]"
        >
          <p className="text-sm font-bold">Check In</p>
          <p className="mt-2 text-xs leading-5 text-[--text-muted]">Set your state for today.</p>
        </button>
      </motion.div>

      {/* Onboarding */}
      {showOnboarding && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6"
        >
          <GlassCard className="border-violet-300/20">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[--text-dim] mb-2">Welcome</p>
            <p className="text-sm font-semibold text-[--text] mb-1">Your mental operating system</p>
            <p className="text-xs leading-5 text-[--text-muted] mb-3">
              Reality UI analyzes situations through 15 cognitive lenses — detecting distortions, hidden assumptions, and clearer frames.
            </p>
            <button
              onClick={dismissOnboarding}
              className="text-xs text-[--accent] underline underline-offset-2"
            >
              Got it
            </button>
          </GlassCard>
        </motion.div>
      )}

      {/* Recent entries */}
      {recent.length > 0 && (
        <section>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[--text-dim] mb-3">Recent decodes</p>
          <div className="space-y-3">
            {recent.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
              >
                <GlassCard onClick={() => router.push(`/result?id=${entry.id}`)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm leading-6 text-[--text]">{entry.situation}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <LensTag lensId={entry.primaryLens} />
                        <span className="text-[10px] text-[--text-dim]">{formatRelative(entry.createdAt)}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-semibold text-[--accent]">{entry.clarityScore}</p>
                      <p className="text-[9px] uppercase tracking-widest text-[--text-dim]">Clarity</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
