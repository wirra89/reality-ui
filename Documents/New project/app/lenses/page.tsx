'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LENSES } from '@/lib/lenses'
import { loadEntries } from '@/lib/storage'
import type { LensId } from '@/types/reality'

export default function LensesPage() {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [triggered, setTriggered] = useState<Set<LensId>>(new Set())

  useEffect(() => {
    const entries = loadEntries()
    const used = new Set(entries.map(e => e.primaryLens)) as Set<LensId>
    setTriggered(used)
  }, [])

  // Sort: triggered lenses first, then alphabetical
  const sorted = [...LENSES].sort((a, b) => {
    const aUsed = triggered.has(a.id) ? 0 : 1
    const bUsed = triggered.has(b.id) ? 0 : 1
    if (aUsed !== bUsed) return aUsed - bUsed
    return a.name.localeCompare(b.name)
  })

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-32">
      <header className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[--text-dim]">Reality UI</p>
        <h1 className="mt-1 text-2xl font-light text-[--text]">The 15 Lenses</h1>
        <p className="mt-1 text-sm text-[--text-muted]">Each lens is a different filter on the same reality.</p>
      </header>

      <div className="space-y-2">
        {sorted.map((lens, i) => {
          const isExpanded = expanded === lens.id
          const isUsed = triggered.has(lens.id)
          return (
            <motion.div
              key={lens.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <button
                onClick={() => setExpanded(prev => prev === lens.id ? null : lens.id)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.055] p-4 text-left backdrop-blur-xl transition hover:border-white/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[--text-dim]">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-sm font-medium text-[--text]">{lens.name}</span>
                    {isUsed && (
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                    )}
                  </div>
                  <span className="text-xs text-[--text-dim]">{isExpanded ? '−' : '+'}</span>
                </div>
                <p className="mt-1 text-xs text-[--text-muted] line-clamp-1">{lens.coreQuestion}</p>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mx-1 rounded-b-2xl border border-t-0 border-white/10 bg-black/20 p-4 space-y-3">
                      <p className="text-xs leading-5 text-[--text-muted]">{lens.description}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-[--text-dim] mb-1">Power</p>
                          <p className="text-xs leading-5 text-[--text-muted]">{lens.power}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-[--text-dim] mb-1">Blind spot</p>
                          <p className="text-xs leading-5 text-[--text-muted]">{lens.blindSpot}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-[--text-dim] mb-2">Examples</p>
                        <ul className="space-y-1">
                          {lens.examples.map(ex => (
                            <li key={ex} className="text-xs text-[--text-muted] leading-5 pl-3 border-l border-violet-500/20">
                              {ex}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </main>
  )
}
