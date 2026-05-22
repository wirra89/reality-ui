'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CompanySettings } from '@/lib/types'

export default function SettingsPage() {
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    company_name: '',
    phone: '',
    base_fare: '',
    price_per_km: '',
    minimum_fare: '',
    currency: 'EUR',
    primary_color: '#FFD700',
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.from('company_settings').select('*').single().then(({ data }) => {
      if (!data) return
      setSettings(data)
      setForm({
        company_name: data.company_name,
        phone: data.phone ?? '',
        base_fare: String(data.base_fare),
        price_per_km: String(data.price_per_km),
        minimum_fare: String(data.minimum_fare),
        currency: data.currency,
        primary_color: data.primary_color,
      })
    })
  }, [])

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(prev => ({ ...prev, [key]: e.target.value })),
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!settings) return
    setSaving(true)
    setError('')
    try {
      const supabase = createClient()
      const { error: saveError } = await supabase.from('company_settings').update({
        company_name: form.company_name,
        phone: form.phone || null,
        base_fare: parseFloat(form.base_fare),
        price_per_km: parseFloat(form.price_per_km),
        minimum_fare: parseFloat(form.minimum_fare),
        currency: form.currency,
        primary_color: form.primary_color,
      }).eq('id', settings.id)
      if (saveError) throw saveError
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen p-8 max-w-lg">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-6 h-6 bg-taxi-yellow rounded-md" />
        <span className="text-taxi-yellow font-bold tracking-widest text-sm">TAXIBASE</span>
      </div>

      <h1 className="text-2xl font-bold mb-2">Company Settings</h1>
      <p className="text-taxi-muted text-sm mb-8">Configure your taxi company details and pricing.</p>

      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Company Info</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Company Name</label>
              <input type="text" {...field('company_name')} required
                className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-taxi-yellow" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Company Phone</label>
              <input type="tel" {...field('phone')}
                className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-taxi-yellow" />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Pricing</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Base Fare</label>
              <input type="number" step="0.01" {...field('base_fare')} required
                className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-taxi-yellow" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Per KM</label>
              <input type="number" step="0.01" {...field('price_per_km')} required
                className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-taxi-yellow" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Minimum Fare</label>
              <input type="number" step="0.01" {...field('minimum_fare')} required
                className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-taxi-yellow" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Currency</label>
              <input type="text" {...field('currency')} maxLength={3}
                className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-taxi-yellow uppercase" />
            </div>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button type="submit" disabled={saving}
          className="w-full bg-taxi-yellow text-black font-bold py-3 rounded-xl disabled:opacity-50">
          {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}
