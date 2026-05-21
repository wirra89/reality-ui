import { RoleGuard } from '@/components/RoleGuard'

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['driver']}>
      <div className="min-h-screen max-w-md mx-auto">
        {children}
      </div>
    </RoleGuard>
  )
}
