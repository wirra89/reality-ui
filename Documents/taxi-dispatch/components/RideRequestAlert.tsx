'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Ride } from '@/lib/types'

const TIMEOUT_SECONDS = 30

interface RideRequestAlertProps {
  ride: Ride
  onAccept: () => void
  onReject: () => void
  rejectDisabled?: boolean
}

export function RideRequestAlert({ ride, onAccept, onReject, rejectDisabled }: RideRequestAlertProps) {
  const [seconds, setSeconds] = useState(TIMEOUT_SECONDS)

  const handleReject = useCallback(() => {
    onReject()
  }, [onReject])

  // Countdown — auto-reject when it hits 0
  useEffect(() => {
    if (seconds <= 0) {
      if (!rejectDisabled) handleReject()
      return
    }
    const t = setTimeout(() => setSeconds(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [seconds, handleReject, rejectDisabled])

  const progress = ((TIMEOUT_SECONDS - seconds) / TIMEOUT_SECONDS) * 100
  const urgent = seconds <= 10

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
      <div className="bg-[#1a1a1a] border border-taxi-yellow/40 rounded-2xl w-full max-w-sm shadow-2xl">
        {/* Timer bar */}
        <div className="h-1 rounded-t-2xl bg-taxi-border overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${urgent ? 'bg-red-500' : 'bg-taxi-yellow'}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">New Ride Request</h2>
            <span className={`text-3xl font-mono font-bold ${urgent ? 'text-red-400' : 'text-taxi-yellow'}`}>
              {seconds}s
            </span>
          </div>

          <div className="bg-taxi-card border border-taxi-border rounded-xl p-4 mb-5 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-taxi-yellow text-xs mt-1">●</span>
              <div>
                <p className="text-xs text-taxi-muted">Pickup</p>
                <p className="text-sm text-white">{ride.pickup_address ?? 'Unknown'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-taxi-muted text-xs mt-1">→</span>
              <div>
                <p className="text-xs text-taxi-muted">Destination</p>
                <p className="text-sm text-white">{ride.destination_address ?? 'Unknown'}</p>
              </div>
            </div>
            {ride.notes && (
              <p className="text-xs text-taxi-muted border-t border-taxi-border pt-2 mt-2">
                Note: {ride.notes}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onReject}
              disabled={rejectDisabled}
              className={`flex-1 border border-red-800 text-red-400 py-3.5 rounded-xl font-semibold text-sm transition-colors ${
                rejectDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-900/20'
              }`}
            >
              {rejectDisabled ? 'Rejecting...' : 'Reject'}
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="flex-1 bg-taxi-yellow text-black font-bold py-3.5 rounded-xl text-sm hover:bg-yellow-400 transition-colors"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
