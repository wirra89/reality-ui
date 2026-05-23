interface NavigateButtonProps {
  lat: number
  lng: number
  label: string
  className?: string
}

/**
 * Opens the best available navigation app:
 *   - iOS/macOS → Apple Maps
 *   - Android   → geo: URI (opens default nav app)
 *   - Everything else → Google Maps web
 */
function buildNavUrl(lat: number, lng: number, label: string): string {
  if (typeof navigator === 'undefined') {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  }

  const ua = navigator.userAgent

  // iOS / macOS Safari
  if (/iP(hone|ad|od)|Macintosh/.test(ua) && 'ontouchend' in document) {
    return `maps://maps.apple.com/?daddr=${lat},${lng}&q=${encodeURIComponent(label)}`
  }

  // Android — use geo: URI which Android resolves to Maps / Waze / etc.
  if (/Android/.test(ua)) {
    return `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(label)})`
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

export function NavigateButton({ lat, lng, label, className = '' }: NavigateButtonProps) {
  function handleClick() {
    const url = buildNavUrl(lat, lng, label)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <button
      onClick={handleClick}
      className={`flex items-center justify-center gap-2 w-full bg-blue-700 hover:bg-blue-600 active:bg-blue-800 text-white font-bold py-4 rounded-xl transition-colors ${className}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
      </svg>
      {label}
    </button>
  )
}
