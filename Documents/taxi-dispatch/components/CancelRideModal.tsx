'use client'

import { useState } from 'react'

const PRESET_REASONS = [
  'Driver taking too long',
  'Changed my mind',
  'Ordered by mistake',
  'Found another ride',
  'Emergency came up',
  'Other',
]

interface CancelRideModalProps {
  onConfirm: (reason: string) => void
  onClose: () => void
  submitting?: boolean
}

export function CancelRideModal({ onConfirm, onClose, submitting = false }: CancelRideModalProps) {
  const [selected, setSelected] = useState('')
  const [custom, setCustom] = useState('')

  const reason = selected === 'Other' ? custom.trim() : selected

  function handleConfirm() {
    if (!reason) return
    onConfirm(reason)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[#1a1a1a] border border-taxi-border rounded-2xl w-full max-w-sm p-6">
        <h2 className="text-lg font-bold text-white mb-1">Cancel Ride</h2>
        <p className="text-taxi-muted text-sm mb-4">Please tell us why you&apos;re cancelling.</p>

        <div className="space-y-2 mb-4">
          {PRESET_REASONS.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setSelected(r)}
              className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-colors ${
                selected === r
                  ? 'border-taxi-yellow bg-taxi-yellow/10 text-white'
                  : 'border-taxi-border text-taxi-muted hover:border-taxi-yellow/40 hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {selected === 'Other' && (
          <textarea
            value={custom}
            onChange={e => setCustom(e.target.value)}
            placeholder="Describe your reason…"
            rows={2}
            className="w-full bg-[#111] border border-taxi-border rounded-lg px-3 py-2 text-sm text-white placeholder-taxi-muted resize-none focus:outline-none focus:border-taxi-yellow mb-4"
          />
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-taxi-border text-taxi-muted py-3 rounded-xl text-sm hover:text-white hover:border-taxi-yellow/40 transition-colors"
          >
            Keep Ride
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!reason || submitting}
            className="flex-1 bg-red-700 hover:bg-red-600 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-40 transition-colors"
          >
            {submitting ? 'Cancelling…' : 'Cancel Ride'}
          </button>
        </div>
      </div>
    </div>
  )
}
