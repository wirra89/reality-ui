'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CompanySettings, PricingShift } from '@/lib/types'

interface SettingsContextValue {
  settings: CompanySettings | null
  shifts: PricingShift[]
  currency: string
  loading: boolean
  refresh: () => void
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: null,
  shifts: [],
  currency: 'EUR',
  loading: true,
  refresh: () => {},
})

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [shifts, setShifts] = useState<PricingShift[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const supabase = createClient()
    const [{ data: cs }, { data: ps }] = await Promise.all([
      supabase.from('company_settings').select('*').single(),
      supabase.from('pricing_shifts').select('*').order('shift'),
    ])
    if (cs) setSettings(cs as CompanySettings)
    if (ps) setShifts(ps as PricingShift[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <SettingsContext.Provider value={{
      settings,
      shifts,
      currency: settings?.currency ?? 'EUR',
      loading,
      refresh: load,
    }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
