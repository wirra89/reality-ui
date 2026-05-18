'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { LensTag } from '@/components/LensTag'
import { loadEntry } from '@/lib/storage'
import type { RealityEntry } from '@/types/reality'

function ClearContent() {
  const params = useSearchParams()
  const router = useRouter()
  const id = params.get('id')
  const [entry, setEntry] = useState<RealityEntry | null>(null)

  useEffect(() => {
    if (!id) return
    setEntry(loadEntry(id))
  }, [id])

  if (!entry) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <button onClick={() => router.push('/')} className="text-sm text-[--text-muted]">Back to home</button>
      </div>
    )
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[--bg] px-6">
      {/* Dual corner glows */}
      <div className="pointer-events-none absolute -left-12 -top-12 h-64 w-64 rounded-full bg-violet-700/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -right-12 h-48 w-48 rounded-full bg-blue-700/15 blur-3xl" />

      <motion.div
        className="relative z-10 w-full max-w-sm text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.p
          className="text-[9px] uppercase tracking-[0.4em] text-[--text-dim] mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          CLEAR
        </motion.p>

        <motion.p
          className="text-xl font-extralight italic leading-relaxed tracking-wide text-[--text] mb-10"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          &ldquo;{entry.betterFrame}&rdquo;
        </motion.p>

        <motion.div
          className="mx-auto mb-10 h-px w-12 bg-violet-500/30"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
        />

        <motion.div
          className="flex items-center justify-center gap-6 mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <div className="text-center">
            <p className="text-3xl font-semibold text-[--accent] leading-none">{entry.clarityScore}</p>
            <p className="text-[9px] uppercase tracking-[0.2em] text-[--text-dim] mt-1">Clarity</p>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="text-center">
            <LensTag lensId={entry.primaryLens} size="md" />
            <p className="text-[9px] uppercase tracking-[0.2em] text-[--text-dim] mt-1">Lens</p>
          </div>
        </motion.div>

        <motion.div
          className="border-t border-white/[0.06] pt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <p className="text-xs font-light italic text-[--text-muted] mb-8">
            {entry.bestAction}
          </p>

          <button
            onClick={() => router.push('/')}
            className="rounded-full border border-white/15 bg-white/[0.04] px-8 py-3 text-sm text-[--text-muted] transition hover:border-white/25 hover:text-[--text]"
          >
            Back to Reality
          </button>
        </motion.div>
      </motion.div>
    </main>
  )
}

export default function ClearPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-[--text-muted]">Loading...</p>
      </div>
    }>
      <ClearContent />
    </Suspense>
  )
}