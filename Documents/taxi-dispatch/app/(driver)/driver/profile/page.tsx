'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Driver } from '@/lib/types'

export default function DriverProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [driver, setDriver] = useState<Driver | null>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [carModel, setCarModel] = useState('')
  const [carPlate, setCarPlate] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const [{ data: p }, { data: d }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('drivers').select('*').eq('user_id', user.id).single(),
      ])
      if (p) { setProfile(p); setFullName(p.full_name ?? ''); setPhone(p.phone ?? '') }
      if (d) { setDriver(d); setCarModel(d.car_model ?? ''); setCarPlate(d.car_plate ?? '') }
    })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !driver) return
    setSaving(true)
    setSaveError('')
    try {
      const supabase = createClient()
      const [{ error: e1 }, { error: e2 }] = await Promise.all([
        supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', profile.id),
        supabase.from('drivers').update({ car_model: carModel, car_plate: carPlate }).eq('id', driver.id),
      ])
      if (e1 || e2) throw e1 ?? e2
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: d } = await supabase.from('drivers').select('id').eq('user_id', user.id).single()
      if (d) await supabase.from('drivers').update({ status: 'offline' }).eq('id', d.id)
    }
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/driver/dashboard')} className="text-taxi-muted hover:text-white">←</button>
        <h1 className="text-xl font-bold">Profile</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Full Name</label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
            className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-taxi-yellow" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Phone</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-taxi-yellow" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Car Model</label>
          <input type="text" value={carModel} onChange={e => setCarModel(e.target.value)}
            placeholder="e.g. Škoda Octavia"
            className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-taxi-yellow" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">License Plate</label>
          <input type="text" value={carPlate} onChange={e => setCarPlate(e.target.value)}
            placeholder="e.g. BG 123-AB"
            className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-taxi-yellow" />
        </div>
        {saveError && <p className="text-red-400 text-sm">{saveError}</p>}
        <button type="submit" disabled={saving}
          className="w-full bg-taxi-yellow text-black font-bold py-3 rounded-xl disabled:opacity-50">
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
