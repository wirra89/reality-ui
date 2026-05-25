'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

export default function CustomerProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data)
        setFullName(data.full_name ?? '')
        setPhone(data.phone ?? '')
      }
    })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    setSaveError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', profile.id)
      if (error) throw error
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } finally {
      window.location.href = '/login'
    }
  }

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/customer/dashboard')} className="text-taxi-muted hover:text-white">←</button>
        <h1 className="text-xl font-bold">Profile</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-taxi-yellow"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-taxi-yellow"
          />
        </div>
        {saveError && <p className="text-red-400 text-sm">{saveError}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-taxi-yellow text-black font-bold py-3 rounded-xl disabled:opacity-50"
        >
          {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full border border-taxi-border text-taxi-muted py-3 rounded-xl text-sm hover:text-red-400 hover:border-red-800 transition mt-2"
        >
          Sign out
        </button>
      </form>
    </div>
  )
}
