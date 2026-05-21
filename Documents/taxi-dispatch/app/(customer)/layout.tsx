import { RoleGuard } from '@/components/RoleGuard'

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['customer']}>
      <div className="min-h-screen max-w-md mx-auto">
        {children}
      </div>
    </RoleGuard>
  )
}
