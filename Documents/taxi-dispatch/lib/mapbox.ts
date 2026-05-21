export interface GeocodingFeature {
  id: string
  place_name: string
  center: [number, number] // [lng, lat]
}

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

export async function geocodeAddress(query: string): Promise<GeocodingFeature[]> {
  if (!query || query.length < 3) return []
  const res = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${TOKEN}&autocomplete=true&limit=5&types=address,place`
  )
  const data = await res.json()
  return data.features ?? []
}

export async function getDistanceKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<number> {
  const res = await fetch(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${to.lng},${to.lat}?access_token=${TOKEN}&overview=false`
  )
  const data = await res.json()
  return (data.routes?.[0]?.distance ?? 0) / 1000
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const res = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${TOKEN}&types=address,place&limit=1`
  )
  const data = await res.json()
  return data.features?.[0]?.place_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}
