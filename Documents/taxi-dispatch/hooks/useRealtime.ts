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

  // Keep callback refs current on every render so the subscription
  // always calls the latest version without reconnecting the channel.
  const onInsertRef = useRef(options.onInsert)
  const onUpdateRef = useRef(options.onUpdate)
  const onDeleteRef = useRef(options.onDelete)
  onInsertRef.current = options.onInsert
  onUpdateRef.current = options.onUpdate
  onDeleteRef.current = options.onDelete

  useEffect(() => {
    const channelName = `${options.table}-${options.filter ?? 'all'}-${Date.now()}`
    const channel = supabase.channel(channelName)

    channel.on(
      'postgres_changes',
      {
        event: options.event ?? '*',
        schema: options.schema ?? 'public',
        table: options.table,
        filter: options.filter,
      },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        if (payload.eventType === 'INSERT') onInsertRef.current?.(payload)
        if (payload.eventType === 'UPDATE') onUpdateRef.current?.(payload)
        if (payload.eventType === 'DELETE') onDeleteRef.current?.(payload)
      }
    )

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [options.table, options.filter]) // eslint-disable-line react-hooks/exhaustive-deps
}
