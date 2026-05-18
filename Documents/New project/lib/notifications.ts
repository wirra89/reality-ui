const TIME_KEY = 'reality:notification-time' // stored as "HH:MM"

export function getNotificationTime(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TIME_KEY)
}

export function setNotificationTime(time: string): void {
  localStorage.setItem(TIME_KEY, time)
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function initNotifications(): void {
  if (typeof window === 'undefined') return
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  const time = getNotificationTime()
  if (!time) return
  scheduleNext(time)
}

function scheduleNext(time: string): void {
  const [h, m] = time.split(':').map(Number)
  const now = new Date()
  const next = new Date(now)
  next.setHours(h, m, 0, 0)
  if (next <= now) next.setDate(next.getDate() + 1)
  const delay = next.getTime() - now.getTime()
  setTimeout(() => {
    new Notification('Reality UI', {
      body: "Time to decode reality. What's on your mind?",
      icon: '/icon-192.png',
    })
    scheduleNext(time)
  }, delay)
}
