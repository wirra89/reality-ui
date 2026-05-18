'use client'

import { useState } from 'react'
import { GlassCard } from '@/components/GlassCard'
import {
  requestNotificationPermission,
  setNotificationTime,
  initNotifications,
} from '@/lib/notifications'

export function NotificationSetup() {
  const [time, setTime] = useState('09:00')
  const [saved, setSaved] = useState(false)
  const [denied, setDenied] = useState(false)

  async function handleSetup() {
    const granted = await requestNotificationPermission()
    if (!granted) {
      setDenied(true)
      return
    }
    setNotificationTime(time)
    initNotifications()
    setSaved(true)
  }

  if (saved) {
    return (
      <GlassCard className="border-violet-300/15 text-center">
        <p className="text-xs text-[--text-muted]">Daily reminder set for {time}.</p>
      </GlassCard>
    )
  }

  return (
    <GlassCard className="border-violet-300/15">
      <p className="mb-1 text-[10px] uppercase tracking-[0.22em] text-[--text-dim]">Daily reminder</p>
      <p className="mb-3 text-xs text-[--text-muted]">Get a nudge to decode your reality each day.</p>
      {denied ? (
        <p className="text-xs text-rose-400/70">
          Notifications blocked — enable them in browser settings.
        </p>
      ) : (
        <div className="flex items-center gap-3">
          <input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-[--text] outline-none focus:border-violet-300/30"
          />
          <button
            onClick={handleSetup}
            className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-xs text-[--text] hover:bg-white/[0.1]"
          >
            Set reminder
          </button>
        </div>
      )}
    </GlassCard>
  )
}
