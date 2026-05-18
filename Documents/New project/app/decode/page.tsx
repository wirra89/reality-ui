'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/GlassCard'
import { SliderInput } from '@/components/SliderInput'
import { analyzeReality } from '@/lib/realityEngine'
import { saveEntry } from '@/lib/storage'

export default function DecodePage() {
  const router = useRouter()
  const [situation, setSituation] = useState('')
  const [mood, setMood] = useState(50)
  const [stress, setStress] = useState(50)
  const [confidence, setConfidence] = useState(50)
  const [loading, setLoading] = useState(false)

  const ready = situation.trim().length > 10

  function handleDecode() {
    if (!ready || loading) return
    setLoading(true)
    const entry = analyzeReality({ situation: situation.trim(), mood, stress, confidence })
    saveEntry(entry)
    router.push(`/result?id=${entry.id}`)
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-32">
      <header className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[--text-dim]">
          Reality UI
        </p>
        <h1 className="mt-1 text-2xl font-light text-[--text]">Decode Reality</h1>
      </header>

      <motion.div
        className="space-y-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        <GlassCard>
          <p className="text-xs text-[--text-muted] mb-3">
            Describe what happened — exactly as your mind is presenting it.
          </p>
          <textarea
            className="min-h-48 w-full resize-none rounded-2xl border border-white/10 bg-black/30 p-4 text-sm leading-7 text-[--text] outline-none placeholder:text-[--text-dim] focus:border-violet-300/40 focus:ring-2 focus:ring-violet-500/10"
            placeholder="Example: Mia did not reply for 6 hours. I don't know what I did wrong..."
            value={situation}
            onChange={e => setSituation(e.target.value)}
          />
          <p className="mt-2 text-right text-[10px] text-[--text-dim]">
            {situation.trim().length > 10 ? '✓ Ready to decode' : 'Keep writing...'}
          </p>
        </GlassCard>

        <GlassCard>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[--text-dim] mb-4">Current state</p>
          <div className="space-y-3">
            <SliderInput label="Mood" value={mood} onChange={setMood} lowLabel="dark" highLabel="clear" />
            <SliderInput label="Stress" value={stress} onChange={setStress} lowLabel="calm" highLabel="overwhelmed" />
            <SliderInput label="Confidence" value={confidence} onChange={setConfidence} lowLabel="shaky" highLabel="solid" />
          </div>
        </GlassCard>

        <button
          onClick={handleDecode}
          disabled={!ready || loading}
          className={`min-h-14 w-full rounded-2xl px-5 text-sm font-bold transition-all ${
            ready && !loading
              ? 'bg-white text-black shadow-xl shadow-violet-950/40 active:scale-[0.98]'
              : 'bg-white/10 text-[--text-dim] cursor-not-allowed'
          }`}
        >
          {loading ? 'Analyzing...' : 'Decode Reality'}
        </button>
      </motion.div>
    </main>
  )
}
