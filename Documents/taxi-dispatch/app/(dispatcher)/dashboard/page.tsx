'use client'

import { useState, useEffect } from 'react'
import { usePendingRides } from '@/hooks/usePendingRides'
import { useOnlineDrivers } from '@/hooks/useOnlineDrivers'
import { useDispatcherMap } from '@/hooks/useDispatcherMap'
import { MapView } from '@/components/MapView'
import { RideCard } from '@/components/RideCard'
import { DriverCard } from '@/components/DriverCard'
import { DispatcherPanel } from '@/components/DispatcherPanel'
import type { Ride } from '@/lib/types'

export default function DispatcherDashboard() {
  const { rides, loading: ridesLoading } = usePendingRides()
  const { drivers } = useOnlineDrivers()
  const { handleMapReady, syncDriverMarkers } = useDispatcherMap()
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null)

  useEffect(() => {
    syncDriverMarkers(drivers)
  }, [drivers, syncDriverMarkers])

  return (
    <div className="h-screen flex flex-col bg-taxi-dark overflow-hidden">
      {/* Topbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#151515] border-b border-taxi-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-taxi-yellow rounded-md" />
          <span className="text-taxi-yellow font-bold tracking-widest text-sm">TAXIBASE</span>
          <span className="text-taxi-muted text-sm ml-2">Dispatcher</span>
        </div>
        <div className="flex gap-4 text-xs">
          <span className="text-green-400">● {drivers.length} online</span>
          <span className="text-orange-400">● {rides.filter(r => r.status === 'requested').length} unassigned</span>
          <span className="text-blue-400">● {rides.filter(r => r.status === 'in_progress').length} in progress</span>
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-14 bg-[#0a0a0a] border-r border-[#1e1e1e] flex flex-col items-center py-3 gap-2 shrink-0">
          {[
            { icon: '⊞', label: 'Dashboard', active: true },
            { icon: '🚗', label: 'Rides' },
            { icon: '👥', label: 'Drivers' },
            { icon: '👤', label: 'Customers' },
            { icon: '📊', label: 'Analytics' },
          ].map(item => (
            <button
              key={item.label}
              title={item.label}
              className={`w-9 h-9 rounded-lg flex items-center justify-content text-base transition ${
                item.active ? 'bg-taxi-yellow text-black' : 'bg-[#1a1a1a] text-taxi-muted hover:text-white'
              }`}
            >
              {item.icon}
            </button>
          ))}
          <button title="Settings" className="mt-auto w-9 h-9 rounded-lg bg-[#1a1a1a] text-taxi-muted hover:text-white flex items-center justify-center text-base">
            ⚙️
          </button>
        </div>

        {/* Left panel: ride queue */}
        <div className="w-64 bg-[#111] border-r border-[#1e1e1e] flex flex-col overflow-hidden shrink-0">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1e1e1e]">
            <span className="text-xs font-semibold text-white uppercase tracking-wider">Ride Queue</span>
            <button className="bg-taxi-yellow text-black text-xs font-bold px-2 py-1 rounded">+ NEW</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {ridesLoading && <p className="text-taxi-muted text-xs p-2">Loading...</p>}
            {!ridesLoading && rides.length === 0 && (
              <p className="text-taxi-muted text-xs p-2">No active rides</p>
            )}
            {rides.map(ride => (
              <RideCard
                key={ride.id}
                ride={ride}
                onClick={() => setSelectedRide(ride)}
                selected={selectedRide?.id === ride.id}
              />
            ))}
          </div>
        </div>

        {/* Center: live Mapbox map */}
        <div className="flex-1 relative overflow-hidden">
          <MapView onMapReady={handleMapReady} className="w-full h-full" />
          <div className="absolute bottom-3 right-3 bg-black/60 text-taxi-muted text-xs px-2 py-1 rounded">
            Mapbox · Live
          </div>
        </div>

        {/* Right panel */}
        <div className="w-56 bg-[#111] border-l border-[#1e1e1e] shrink-0 overflow-y-auto">
          <DispatcherPanel
            ride={selectedRide}
            drivers={drivers.filter(d => ['online', 'waiting'].includes(d.status))}
          />
        </div>
      </div>

      {/* Bottom: driver strip */}
      <div className="shrink-0 bg-[#0a0a0a] border-t border-[#1e1e1e] px-4 py-2 flex items-center gap-2 overflow-x-auto">
        <span className="text-taxi-muted text-xs whitespace-nowrap">ONLINE</span>
        {drivers.map(driver => (
          <DriverCard key={driver.id} driver={driver} />
        ))}
      </div>
    </div>
  )
}
