'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/GlassCard'
import { signInWithEmail } from '@/lib/db'

export default function AuthPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    await signInWithEmail(email.trim())
    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          <GlassCard className="border-violet-300/20 text-center">
            <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-[--text-dim]">Check your email</p>
            <p className="mb-2 text-sm text-[--text]">
              Magic link sent to <strong>{email}</strong>
            </p>
            <p className="text-xs leading-5 text-[--text-muted]">
              Click the link in the email to sign in and sync your data.
            </p>
          </GlassCard>
        </motion.div>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4">
      <motion.div
        className="w-full space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-6 text-center">
          <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[--text-dim]">Reality UI</p>
          <h1 className="text-2xl font-light text-[--text]">Sync your data</h1>
          <p className="mt-1 text-sm text-[--text-muted]">
            Save your decodes to the cloud. Access them on any device.
          </p>
        </div>

        <GlassCard>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-[--text] outline-none placeholder:text-[--text-dim] focus:border-violet-300/30"
            />
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full rounded-xl bg-white py-3 text-sm font-bold text-black shadow-xl shadow-violet-950/30 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send magic link'}
            </button>
          </form>
        </GlassCard>

        <button
          onClick={() => router.push('/')}
          className="w-full text-center text-xs text-[--text-dim] hover:text-[--text-muted] transition-colors"
        >
          Skip — keep using locally
        </button>
      </motion.div>
    </main>
  )
}
