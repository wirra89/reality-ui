import { RoleGuard } from '@/components/RoleGuard'

export default function DispatcherLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['dispatcher', 'admin']}>
      <div className="min-h-screen">
        {children}
      </div>
    </RoleGuard>
  )
}
