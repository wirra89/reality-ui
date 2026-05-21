'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

type ChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

interface RealtimeOptions {
  table: string
  schema?: string
  filter?: string
  event?: ChangeEvent
  onInsert?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
  onUpdate?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
  onDelete?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
}

export function useRealtime(options: RealtimeOptions) {
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    const channelName = `${options.table}-${options.filter ?? 'all'}-${Date.now()}`
    const channel = supabase.channel(channelName)

    channel.on(
      // @ts-expect-error — Supabase JS v2 type overloads require this pattern
      'postgres_changes',
      {
        event: options.event ?? '*',
        schema: options.schema ?? 'public',
        table: options.table,
        filter: options.filter,
      },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        if (payload.eventType === 'INSERT' && options.onInsert) options.onInsert(payload)
        if (payload.eventType === 'UPDATE' && options.onUpdate) options.onUpdate(payload)
        if (payload.eventType === 'DELETE' && options.onDelete) options.onDelete(payload)
      }
    )

    channel.subscribe()
    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [options.table, options.filter]) // eslint-disable-line react-hooks/exhaustive-deps
}
