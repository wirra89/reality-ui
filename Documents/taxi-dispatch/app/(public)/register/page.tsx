'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/types'

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<UserRole>('customer')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (phone) {
      const { data: { user: newUser } } = await supabase.auth.getUser()
      if (newUser) await supabase.from('profiles').update({ phone }).eq('id', newUser.id)
    }

    window.location.href = '/'
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 bg-taxi-yellow rounded-lg" />
          <span className="text-xl font-bold tracking-widest text-taxi-yellow">TAXIBASE</span>
        </div>

        <h1 className="text-2xl font-bold mb-2">Create account</h1>
        <p className="text-taxi-muted mb-6 text-sm">Join TaxiBase</p>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Full name</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
              className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white placeholder-taxi-muted focus:outline-none focus:border-taxi-yellow"
              placeholder="Your name" />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white placeholder-taxi-muted focus:outline-none focus:border-taxi-yellow"
              placeholder="you@example.com" />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Phone</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white placeholder-taxi-muted focus:outline-none focus:border-taxi-yellow"
              placeholder="+381 ..." />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
              className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white placeholder-taxi-muted focus:outline-none focus:border-taxi-yellow"
              placeholder="Min. 8 characters" />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">I am a</label>
            <div className="grid grid-cols-2 gap-2">
              {(['customer', 'driver'] as UserRole[]).map(r => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  className={`py-3 rounded-lg text-sm font-medium capitalize border transition ${
                    role === r
                      ? 'bg-taxi-yellow text-black border-taxi-yellow'
                      : 'bg-taxi-card text-taxi-muted border-taxi-border hover:border-taxi-yellow'
                  }`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-taxi-yellow text-black font-bold py-3 rounded-lg hover:bg-yellow-400 transition disabled:opacity-50">
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-taxi-muted text-sm text-center mt-6">
          Have an account?{' '}
          <a href="/login" className="text-taxi-yellow hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  )
}
