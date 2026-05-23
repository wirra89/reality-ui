'use client'

import { useEffect, useRef } from 'react'
import { subscribeToPush, unsubscribeFromPush } from '@/lib/push'

/**
 * Subscribes to push notifications while the driver is online,
 * and unsubscribes when they go offline.
 */
export function usePushNotifications(driverId: string | null, isOnline: boolean) {
  const wasOnline = useRef(false)

  useEffect(() => {
    if (!driverId) return

    if (isOnline && !wasOnline.current) {
      wasOnline.current = true
      subscribeToPush(driverId)
    } else if (!isOnline && wasOnline.current) {
      wasOnline.current = false
      unsubscribeFromPush(driverId)
    }
  }, [driverId, isOnline])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (driverId && wasOnline.current) {
        unsubscribeFromPush(driverId)
      }
    }
  }, [driverId])
}
