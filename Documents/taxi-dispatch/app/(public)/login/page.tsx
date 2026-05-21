'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 bg-taxi-yellow rounded-lg" />
          <span className="text-xl font-bold tracking-widest text-taxi-yellow">TAXIBASE</span>
        </div>

        <h1 className="text-2xl font-bold mb-2">Sign in</h1>
        <p className="text-taxi-muted mb-6 text-sm">Enter your credentials to continue</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white placeholder-taxi-muted focus:outline-none focus:border-taxi-yellow"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white placeholder-taxi-muted focus:outline-none focus:border-taxi-yellow"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-taxi-yellow text-black font-bold py-3 rounded-lg hover:bg-yellow-400 transition disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-taxi-muted text-sm text-center mt-6">
          No account?{' '}
          <a href="/register" className="text-taxi-yellow hover:underline">Register</a>
        </p>
      </div>
    </div>
  )
}
