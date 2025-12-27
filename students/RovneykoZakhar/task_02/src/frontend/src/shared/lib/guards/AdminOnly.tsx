import type { ReactNode } from 'react'
import { useAuthStore } from '@/shared/stores/authStore'

type Props = {
  children: ReactNode
  fallback?: ReactNode
}

export function AdminOnly({ children, fallback = null }: Props) {
  const user = useAuthStore((s) => s.user)

  if (!user || user.role !== 'admin') return <>{fallback}</>

  return <>{children}</>
}
