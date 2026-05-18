'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-md"
        >
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0a0a18] p-4 shadow-xl shadow-black/60">
            <div>
              <p className="text-sm font-semibold text-[--text]">Add to Home Screen</p>
              <p className="mt-0.5 text-xs text-[--text-muted]">
                Install Reality UI for the full experience.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => setVisible(false)}
                className="px-2 py-1 text-xs text-[--text-dim]"
              >
                Not now
              </button>
              <button
                onClick={install}
                className="rounded-xl bg-[--accent] px-3 py-1.5 text-xs font-semibold text-black"
              >
                Install
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
