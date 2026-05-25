import { RoleGuard } from '@/components/RoleGuard'
import { BottomNav } from '@/components/BottomNav'

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['customer']}>
      <div className="min-h-screen max-w-md mx-auto">
        {children}
        <BottomNav role="customer" />
      </div>
    </RoleGuard>
  )
}
