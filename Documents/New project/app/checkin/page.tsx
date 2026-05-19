'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/GlassCard'
import { SliderInput } from '@/components/SliderInput'
import { LensTag } from '@/components/LensTag'
import { saveCheckinWithSync } from '@/lib/db'
import { predictDominantLens } from '@/lib/realityEngine'
import { getLens } from '@/lib/lenses'
import type { LensId } from '@/types/reality'
import { NotificationSetup } from '@/components/NotificationSetup'

export default function CheckInPage() {
  const router = useRouter()
  const [energy, setEnergy] = useState(50)
  const [mood, setMood] = useState(50)
  const [stress, setStress] = useState(50)
  const [confidence, setConfidence] = useState(50)
  const [thought, setThought] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [predictedLens, setPredictedLens] = useState<LensId | null>(null)

  async function handleSubmit() {
    const lens = predictDominantLens(thought)
    const checkin = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      energy,
      mood,
      stress,
      confidence,
      dominantThought: thought,
      predictedLens: lens,
      createdAt: new Date().toISOString(),
    }
    await saveCheckinWithSync(checkin)
    setPredictedLens(lens)
    setSubmitted(true)
  }

  if (submitted && predictedLens) {
    const lens = getLens(predictedLens)
    return (
      <main className="mx-auto min-h-screen max-w-md px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-32 flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <GlassCard className="border-violet-300/20 bg-violet-400/[0.07] text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[--text-dim] mb-3">Check-in saved</p>
            <p className="text-sm text-[--text-muted] mb-3">Today&apos;s dominant reality filter</p>
            <div className="flex justify-center mb-3">
              <LensTag lensId={predictedLens} size="md" />
            </div>
            {lens && (
              <p className="text-xs leading-5 text-[--text-muted]">{lens.coreQuestion}</p>
            )}
          </GlassCard>

          <NotificationSetup />

          <button
            onClick={() => router.push('/')}
            className="min-h-14 w-full rounded-2xl bg-white px-5 text-sm font-bold text-black shadow-xl shadow-violet-950/40"
          >
            Go to Dashboard
          </button>
          <button
            onClick={() => router.push('/decode')}
            className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-[--text-muted]"
          >
            Decode a situation
          </button>
        </motion.div>
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-32">
      <header className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[--text-dim]">Reality UI</p>
        <h1 className="mt-1 text-2xl font-light text-[--text]">Daily Check-In</h1>
        <p className="mt-1 text-sm text-[--text-muted]">Set your state. Predict your filter.</p>
      </header>

      <motion.div
        className="space-y-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <GlassCard>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[--text-dim] mb-4">Physical state</p>
          <div className="space-y-3">
            <SliderInput label="Energy" value={energy} onChange={setEnergy} lowLabel="drained" highLabel="charged" />
            <SliderInput label="Mood" value={mood} onChange={setMood} lowLabel="dark" highLabel="clear" />
            <SliderInput label="Stress" value={stress} onChange={setStress} lowLabel="calm" highLabel="overwhelmed" />
            <SliderInput label="Confidence" value={confidence} onChange={setConfidence} lowLabel="shaky" highLabel="solid" />
          </div>
        </GlassCard>

        <GlassCard>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[--text-dim] mb-2">Dominant thought</p>
          <p className="text-xs text-[--text-muted] mb-3">What is the first thing on your mind today?</p>
          <textarea
            className="min-h-24 w-full resize-none rounded-xl border border-white/10 bg-black/20 p-3 text-sm leading-6 text-[--text] outline-none placeholder:text-[--text-dim] focus:border-violet-300/30"
            placeholder="What am I thinking about most right now..."
            value={thought}
            onChange={e => setThought(e.target.value)}
          />
        </GlassCard>

        <button
          onClick={handleSubmit}
          className="min-h-14 w-full rounded-2xl bg-white px-5 text-sm font-bold text-black shadow-xl shadow-violet-950/40 active:scale-[0.98] transition-transform"
        >
          Save Check-In
        </button>
      </motion.div>
    </main>
  )
}
