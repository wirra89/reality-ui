'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getActiveShiftNumber } from '@/lib/pricing'
import { useSettings } from '@/context/SettingsContext'

const SHIFT_META = [
  { shift: 1 as const, label: 'Shift 1', hours: '06:00 – 14:00' },
  { shift: 2 as const, label: 'Shift 2', hours: '14:00 – 22:00' },
  { shift: 3 as const, label: 'Night',   hours: '22:00 – 06:00' },
]

type ShiftForm = { base_fare: string; price_per_km: string; minimum_fare: string }

function emptyShiftForm(): ShiftForm {
  return { base_fare: '', price_per_km: '', minimum_fare: '' }
}

export default function SettingsPage() {
  const router = useRouter()
  const { settings, shifts: contextShifts, refresh } = useSettings()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    company_name: '',
    phone: '',
    currency: 'EUR',
    primary_color: '#FFD700',
    wait_charge_per_min: '0.10',
  })
  const [shifts, setShifts] = useState<ShiftForm[]>([
    emptyShiftForm(), emptyShiftForm(), emptyShiftForm(),
  ])

  const activeShift = getActiveShiftNumber()

  useEffect(() => {
    if (!settings) return
    setForm({
      company_name: settings.company_name,
      phone: settings.phone ?? '',
      currency: settings.currency,
      primary_color: settings.primary_color,
      wait_charge_per_min: String(settings.wait_charge_per_min ?? 0.10),
    })
  }, [settings])

  useEffect(() => {
    if (!contextShifts.length) return
    setShifts(contextShifts.map((s) => ({
      base_fare:    String(s.base_fare),
      price_per_km: String(s.price_per_km),
      minimum_fare: String(s.minimum_fare),
    })))
  }, [contextShifts])

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(prev => ({ ...prev, [key]: e.target.value })),
    }
  }

  function shiftField(idx: number, key: keyof ShiftForm) {
    return {
      value: shifts[idx][key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setShifts(prev => prev.map((s, i) => i === idx ? { ...s, [key]: e.target.value } : s)),
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!settings) return
    setSaving(true)
    setError('')
    try {
      const supabase = createClient()
      const shiftUpdates = SHIFT_META.map(({ shift }, idx) =>
        supabase.from('pricing_shifts').update({
          base_fare:    parseFloat(shifts[idx].base_fare),
          price_per_km: parseFloat(shifts[idx].price_per_km),
          minimum_fare: parseFloat(shifts[idx].minimum_fare),
        }).eq('shift', shift)
      )
      const [{ error: csErr }, ...shiftResults] = await Promise.all([
        supabase.from('company_settings').update({
          company_name:        form.company_name,
          phone:               form.phone || null,
          currency:            form.currency,
          primary_color:       form.primary_color,
          wait_charge_per_min: parseFloat(form.wait_charge_per_min) || 0,
        }).eq('id', settings.id),
        ...shiftUpdates,
      ])
      const shiftErr = shiftResults.find(r => r.error)?.error
      if (csErr || shiftErr) throw csErr ?? shiftErr
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.push('/dispatcher/dashboard')} className="text-taxi-muted hover:text-white mr-1">←</button>
        <div className="w-6 h-6 bg-taxi-yellow rounded-md" />
        <span className="text-taxi-yellow font-bold tracking-widest text-sm">TAXIBASE</span>
      </div>

      <h1 className="text-2xl font-bold mb-2">Company Settings</h1>
      <p className="text-taxi-muted text-sm mb-8">Configure company details and shift pricing.</p>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Company Info */}
        <div>
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Company Info</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Company Name</label>
              <input type="text" {...field('company_name')} required
                className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-taxi-yellow" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Company Phone</label>
                <input type="tel" {...field('phone')}
                  className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-taxi-yellow" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Currency</label>
                <input type="text" {...field('currency')} maxLength={3}
                  className="w-full bg-taxi-card border border-taxi-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-taxi-yellow uppercase" />
              </div>
            </div>
          </div>
        </div>

        {/* Wait time charge */}
        <div>
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Wait Time Charge</h2>
          <div className="bg-taxi-card border border-taxi-border rounded-xl p-4">
            <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">
              Charge per minute (after 2 min free)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number" step="0.01" min="0" {...field('wait_charge_per_min')}
                className="w-40 bg-taxi-dark border border-taxi-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-taxi-yellow"
              />
              <span className="text-taxi-muted text-sm">{form.currency}/min</span>
            </div>
          </div>
        </div>

        {/* Shift Pricing */}
        <div>
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-1">Shift Pricing</h2>
          <p className="text-taxi-muted text-xs mb-4">
            Active shift: <span className="text-taxi-yellow font-semibold">{SHIFT_META[activeShift - 1].label} ({SHIFT_META[activeShift - 1].hours})</span>
          </p>
          <div className="space-y-4">
            {SHIFT_META.map(({ shift, label, hours }, idx) => (
              <div key={shift}
                className={`bg-taxi-card border rounded-xl p-4 transition ${
                  activeShift === shift ? 'border-taxi-yellow' : 'border-taxi-border'
                }`}>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    activeShift === shift ? 'bg-taxi-yellow text-black' : 'bg-taxi-border text-taxi-muted'
                  }`}>{shift}</span>
                  <div>
                    <span className="text-sm font-semibold text-white">{label}</span>
                    <span className="text-xs text-taxi-muted ml-2">{hours}</span>
                  </div>
                  {activeShift === shift && (
                    <span className="ml-auto text-xs bg-taxi-yellow/20 text-taxi-yellow px-2 py-0.5 rounded-full">Active now</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Base Fare</label>
                    <input type="number" step="0.01" min="0" required {...shiftField(idx, 'base_fare')}
                      className="w-full bg-taxi-dark border border-taxi-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-taxi-yellow" />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Per KM</label>
                    <input type="number" step="0.01" min="0" required {...shiftField(idx, 'price_per_km')}
                      className="w-full bg-taxi-dark border border-taxi-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-taxi-yellow" />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-taxi-muted mb-2">Minimum</label>
                    <input type="number" step="0.01" min="0" required {...shiftField(idx, 'minimum_fare')}
                      className="w-full bg-taxi-dark border border-taxi-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-taxi-yellow" />
                  </div>
                </div>
              </div>
            ))}
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
