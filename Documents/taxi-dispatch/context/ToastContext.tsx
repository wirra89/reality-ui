'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

const BG: Record<ToastType, string> = {
  success: 'bg-green-950 border-green-700 text-green-100',
  error:   'bg-red-950 border-red-700 text-red-100',
  warning: 'bg-yellow-950 border-yellow-700 text-yellow-100',
  info:    'bg-[#1a1a1a] border-taxi-border text-white',
}

const ICON: Record<ToastType, string> = {
  success: '✓',
  error:   '✕',
  warning: '⚠',
  info:    'ℹ',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-xs w-full pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl text-sm font-medium pointer-events-auto transition-all ${BG[t.type]}`}
          >
            <span className="text-base leading-none mt-0.5">{ICON[t.type]}</span>
            <span>{t.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(t2 => t2.id !== t.id))}
              className="ml-auto text-current opacity-60 hover:opacity-100 text-lg leading-none"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
