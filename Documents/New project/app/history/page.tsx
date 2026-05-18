'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/GlassCard'
import { LensTag } from '@/components/LensTag'
import { ClaritySparkline } from '@/components/ClaritySparkline'
import { LensDistribution } from '@/components/LensDistribution'
import { loadEntries } from '@/lib/storage'
import type { RealityEntry, LensId } from '@/types/reality'

const PATTERN_LABELS: Partial<Record<LensId, string>> = {
  'mind-reading': 'Mind Reading',
  mating: 'Rejection Sensitivity',
  'victim-oppressor': 'Victim Lens',
  'winners-losers': 'Self-Worth Collapse',
  'moist-robot': 'Anxiety Pattern',
  abundance: 'Scarcity Mindset',
}

function detectBlindSpot(entries: RealityEntry[]): { lens: LensId; count: number } | null {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  const recent = entries.filter(e => new Date(e.createdAt).getTime() > cutoff)
  const counts: Partial<Record<LensId, number>> = {}
  for (const e of recent) {
    counts[e.primaryLens] = (counts[e.primaryLens] ?? 0) + 1
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  if (!top || top[1] < 3) return null
  return { lens: top[0] as LensId, count: top[1] }
}

function sparklineData(entries: RealityEntry[]): number[] {
  return entries.slice(0, 14).reverse().map(e => e.clarityScore)
}

function weekComparison(entries: RealityEntry[]): { thisWeek: number; lastWeek: number } | null {
  const day = 86400000
  const now = Date.now()
  const thisWeek = entries.filter(e => now - new Date(e.createdAt).getTime() < 7 * day)
  const lastWeek = entries.filter(e => {
    const age = now - new Date(e.createdAt).getTime()
    return age >= 7 * day && age < 14 * day
  })
  if (thisWeek.length === 0 || lastWeek.length === 0) return null
  const avg = (arr: RealityEntry[]) =>
    Math.round(arr.reduce((s, e) => s + e.clarityScore, 0) / arr.length)
  return { thisWeek: avg(thisWeek), lastWeek: avg(lastWeek) }
}

function lensCountsSorted(entries: RealityEntry[]): Array<{ lens: LensId; count: number }> {
  const counts: Partial<Record<LensId, number>> = {}
  for (const e of entries) {
    counts[e.primaryLens] = (counts[e.primaryLens] ?? 0) + 1
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lens, count]) => ({ lens: lens as LensId, count }))
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function HistoryPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<RealityEntry[]>([])
  const [bannerDismissed, setBannerDismissed] = useState(false)

  useEffect(() => {
    setEntries(loadEntries())
  }, [])

  const blindSpot = detectBlindSpot(entries)
  const showBanner = blindSpot && !bannerDismissed
  const sparkline = sparklineData(entries)
  const comparison = weekComparison(entries)
  const lensItems = lensCountsSorted(entries)

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-32">
      <header className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[--text-dim]">Reality UI</p>
        <h1 className="mt-1 text-2xl font-light text-[--text]">Pattern History</h1>
        <p className="mt-1 text-xs text-[--text-muted]">
          {entries.length} decode{entries.length !== 1 ? 's' : ''} stored
        </p>
      </header>

      {/* Blind spot banner */}
      {showBanner && blindSpot && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-2xl border border-violet-300/25 bg-violet-400/[0.09] p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-widest text-[--text-dim]">
                Blind spot detected
              </p>
              <p className="mb-1 text-sm text-[--text]">
                <strong>{PATTERN_LABELS[blindSpot.lens] ?? blindSpot.lens}</strong> — {blindSpot.count}× this month
              </p>
              <p className="text-xs leading-5 text-[--text-muted]">
                You repeatedly decode situations through this lens. It may be a recurring blind spot worth examining.
              </p>
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className="shrink-0 text-xs text-[--text-dim] hover:text-[--text-muted]"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}

      {/* Insights */}
      {entries.length >= 2 && (
        <section className="mb-6 space-y-3">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[--text-dim]">Insights</p>

          <GlassCard>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs text-[--text-muted]">Clarity trend</p>
              {comparison && (
                <p
                  className={`text-[10px] font-semibold ${
                    comparison.thisWeek >= comparison.lastWeek
                      ? 'text-emerald-400/80'
                      : 'text-rose-400/80'
                  }`}
                >
                  {comparison.thisWeek >= comparison.lastWeek ? '+' : ''}
                  {comparison.thisWeek - comparison.lastWeek} vs last week
                </p>
              )}
            </div>
            <ClaritySparkline scores={sparkline} />
            <p className="mt-1 text-right text-[9px] text-[--text-dim]">
              last {sparkline.length} decodes
            </p>
          </GlassCard>

          {lensItems.length > 0 && (
            <GlassCard>
              <p className="mb-3 text-xs text-[--text-muted]">Top lenses</p>
              <LensDistribution items={lensItems} />
            </GlassCard>
          )}
        </section>
      )}

      {/* Empty state */}
      {entries.length === 0 && (
        <GlassCard>
          <p className="text-sm leading-6 text-[--text-muted]">
            No decodes yet. Analyze a situation and your history will appear here.
          </p>
          <button
            onClick={() => router.push('/decode')}
            className="mt-3 text-xs text-[--accent] underline underline-offset-2"
          >
            Start your first decode
          </button>
        </GlassCard>
      )}

      {/* Entry list */}
      <div className="space-y-3">
        {entries.map((entry, i) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <GlassCard onClick={() => router.push(`/result?id=${entry.id}`)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="mb-2 line-clamp-2 text-sm leading-6 text-[--text]">
                    {entry.situation}
                  </p>
                  <div className="flex items-center gap-2">
                    <LensTag lensId={entry.primaryLens} />
                    <span className="text-[10px] text-[--text-dim]">{formatDate(entry.createdAt)}</span>
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
    </main>
  )
}
