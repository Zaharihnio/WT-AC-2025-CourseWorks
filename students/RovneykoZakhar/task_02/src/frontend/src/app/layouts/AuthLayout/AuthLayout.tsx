import { Navigate, Outlet } from 'react-router-dom'

import { AuthLayoutBackground } from './AuthLayoutBackground'
import { Content } from '@/shared/ui/Content'
import { useAuthStore } from '@/shared/stores/authStore'

import { Loader } from '@/shared/ui/Loader'

export function AuthLayout() {
  const user = useAuthStore((s) => s.user)
  const initialized = useAuthStore((s) => s.initialized)

  if (!initialized) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Loader />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-neutral-950">
      <AuthLayoutBackground />

      <Content>
        <div className="relative min-h-screen flex items-center justify-center p-4">
          <Outlet />
        </div>
      </Content>
    </div>
  )
}
