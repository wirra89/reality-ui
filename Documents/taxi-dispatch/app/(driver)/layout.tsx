import { RoleGuard } from '@/components/RoleGuard'
import { BottomNav } from '@/components/BottomNav'

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['driver']}>
      <div className="min-h-screen max-w-md mx-auto">
        {children}
        <BottomNav role="driver" />
      </div>
    </RoleGuard>
  )
}
