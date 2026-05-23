export type UserRole = 'customer' | 'driver' | 'dispatcher' | 'admin'

export type DriverStatus = 'offline' | 'online' | 'assigned' | 'arriving' | 'waiting' | 'on_trip'

export type RideStatus =
  | 'requested'
  | 'assigned'
  | 'driver_arriving'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  phone: string | null
  created_at: string
}

export interface Driver {
  id: string
  user_id: string
  car_model: string | null
  car_plate: string | null
  status: DriverStatus
  current_lat: number | null
  current_lng: number | null
  heading: number | null
  speed: number | null
  last_location_update: string | null
  is_active: boolean
  created_at: string
  profile?: Profile
}

export interface Customer {
  id: string
  user_id: string
  default_pickup: string | null
  created_at: string
  profile?: Profile
}

export interface Ride {
  id: string
  customer_id: string | null
  driver_id: string | null
  pickup_address: string | null
  pickup_lat: number | null
  pickup_lng: number | null
  destination_address: string | null
  destination_lat: number | null
  destination_lng: number | null
  estimated_price: number | null
  final_price: number | null
  payment_method: string
  status: RideStatus
  notes: string | null
  requested_at: string
  assigned_at: string | null
  started_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  customer_rating: number | null
  rating_note: string | null
  cancellation_reason: string | null
  customer?: Profile
  driver?: Driver
}

export interface RideEvent {
  id: string
  ride_id: string
  event_type: string
  message: string | null
  created_by: string | null
  created_at: string
}

export interface DriverLocation {
  id: string
  driver_id: string
  lat: number
  lng: number
  heading: number | null
  speed: number | null
  accuracy: number | null
  created_at: string
}

export interface CompanySettings {
  id: string
  company_name: string
  phone: string | null
  logo_url: string | null
  primary_color: string
  base_fare: number
  price_per_km: number
  minimum_fare: number
  currency: string
  created_at: string
}

export interface FareSettings {
  base_fare: number
  price_per_km: number
  minimum_fare: number
}

export interface PricingShift {
  shift: 1 | 2 | 3
  name: string
  start_hour: number
  end_hour: number
  base_fare: number
  price_per_km: number
  minimum_fare: number
}
