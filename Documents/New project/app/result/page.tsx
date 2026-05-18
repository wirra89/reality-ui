'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/GlassCard'
import { LensTag } from '@/components/LensTag'
import { ScoreRing } from '@/components/ScoreRing'
import { loadEntry } from '@/lib/storage'
import { getLens } from '@/lib/lenses'
import { reframeForLens } from '@/lib/realityEngine'
import type { RealityEntry, LensId } from '@/types/reality'

function ResultContent() {
  const params = useSearchParams()
  const router = useRouter()
  const id = params.get('id')
  const [entry, setEntry] = useState<RealityEntry | null>(null)
  const [selectedLens, setSelectedLens] = useState<LensId | null>(null)

  useEffect(() => {
    if (!id) return
    const found = loadEntry(id)
    setEntry(found)
  }, [id])

  if (!entry) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-[--text-muted]">Entry not found.</p>
      </div>
    )
  }

  const altReframe = selectedLens ? reframeForLens(entry, selectedLens) : null
  const lens = getLens(entry.primaryLens)

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-10">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1 text-xs text-[--text-dim] hover:text-[--text-muted]"
      >
        ← Back
      </button>

      {/* Hero — Layout C */}
      <motion.div
        className="mb-6 relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-6 text-center backdrop-blur-xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Dual corner glows */}
        <div className="pointer-events-none absolute -left-8 -top-8 h-40 w-40 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-blue-600/15 blur-3xl" />

        <p className="text-[9px] uppercase tracking-[0.3em] text-[--text-dim] mb-4">Reality Decoded</p>

        <div className="flex justify-center mb-4">
          <ScoreRing score={entry.clarityScore} />
        </div>

        <div className="mb-1">
          <LensTag lensId={entry.primaryLens} size="md" />
        </div>
        <p className="text-[10px] text-[--text-dim] mb-4">{lens?.name ?? entry.primaryLens} dominant</p>

        <p className="text-base font-light italic leading-relaxed text-[--text] mb-4">
          &ldquo;{entry.betterFrame}&rdquo;
        </p>

        <div className="mx-auto my-4 h-px w-16 bg-violet-500/30" />

        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <p className="text-[9px] uppercase tracking-widest text-[--text-dim] mb-1">Distortion</p>
            <p className="text-xs text-[--text-muted] leading-5">{entry.distortion}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <p className="text-[9px] uppercase tracking-widest text-[--text-dim] mb-1">Assumption</p>
            <p className="text-xs text-[--text-muted] leading-5">{entry.hiddenAssumption}</p>
          </div>
        </div>

        {/* Best action */}
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-left">
          <div className="mt-0.5 h-full w-0.5 flex-shrink-0 self-stretch rounded bg-[--accent-blue]" />
          <div>
            <p className="text-[9px] uppercase tracking-widest text-[--text-dim] mb-1">Best action</p>
            <p className="text-xs text-[--text-muted] leading-5">{entry.bestAction}</p>
          </div>
        </div>
      </motion.div>

      {/* Alternate lenses */}
      <section className="mb-6">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[--text-dim] mb-3">
          See through other lenses
        </p>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {entry.alternateLenses.map(lensId => (
            <button
              key={lensId}
              onClick={() => setSelectedLens(prev => prev === lensId ? null : lensId)}
              className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                selectedLens === lensId
                  ? 'border-violet-300/40 bg-violet-400/20 text-violet-100'
                  : 'border-white/10 bg-white/[0.04] text-[--text-muted] hover:border-white/20'
              }`}
            >
              {getLens(lensId)?.name ?? lensId}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {altReframe && selectedLens && (
            <motion.div
              key={selectedLens}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3 overflow-hidden"
            >
              <GlassCard className="border-violet-300/20 bg-violet-400/[0.07]">
                <div className="flex items-center gap-2 mb-2">
                  <LensTag lensId={selectedLens} />
                  <p className="text-[10px] text-[--text-dim]">Reframe</p>
                </div>
                <p className="text-sm leading-6 text-[--text] mb-2 italic">&ldquo;{altReframe.frame}&rdquo;</p>
                <p className="text-xs text-[--text-muted] leading-5">→ {altReframe.action}</p>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Situation recap */}
      <GlassCard className="mb-6">
        <p className="text-[9px] uppercase tracking-widest text-[--text-dim] mb-2">Situation</p>
        <p className="text-sm leading-6 text-[--text-muted]">{entry.situation}</p>
      </GlassCard>

      {/* CTAs */}
      <div className="space-y-3">
        <button
          onClick={() => router.push(`/clear?id=${entry.id}`)}
          className="min-h-14 w-full rounded-2xl bg-white px-5 text-sm font-bold text-black shadow-xl shadow-violet-950/40 active:scale-[0.98] transition-transform"
        >
          Clear Screen
        </button>
        <button
          onClick={() => router.push('/decode')}
          className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-[--text-muted]"
        >
          Decode another
        </button>
      </div>
    </main>
  )
}

export default function ResultPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-[--text-muted]">Loading...</p>
      </div>
    }>
      <ResultContent />
    </Suspense>
  )
}
