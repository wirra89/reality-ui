'use client'

import { useState } from 'react'
import html2canvas from 'html2canvas'

interface ShareButtonProps {
  targetRef: React.RefObject<HTMLElement | null>
}

export function ShareButton({ targetRef }: ShareButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleShare() {
    if (!targetRef.current) return
    setLoading(true)
    try {
      const canvas = await html2canvas(targetRef.current, {
        backgroundColor: '#050509',
        scale: 2,
        useCORS: true,
        logging: false,
      })
      canvas.toBlob(async (blob) => {
        if (!blob) { setLoading(false); return }
        const file = new File([blob], 'reality-decoded.png', { type: 'image/png' })
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({ title: 'Reality Decoded', files: [file] })
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'reality-decoded.png'
          a.click()
          URL.revokeObjectURL(url)
        }
        setLoading(false)
      }, 'image/png')
    } catch {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      className="rounded-full border border-white/15 bg-white/[0.04] px-6 py-3 text-sm text-[--text-muted] transition hover:border-white/25 hover:text-[--text] disabled:opacity-50"
    >
      {loading ? 'Capturing...' : 'Share'}
    </button>
  )
}
