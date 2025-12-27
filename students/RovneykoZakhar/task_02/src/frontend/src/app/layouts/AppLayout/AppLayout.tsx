import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { AppLayoutBackground } from './AppLayoutBackground'
import { useAuthStore } from '@/shared/stores/authStore'
import { Content } from '@/shared/ui/Content'
import { Button } from '@/shared/ui/Button'
import { Loader } from '@/shared/ui/Loader'
import { useUserDecksStore } from '@/shared/stores/userDecksStore'
import { useEffect } from 'react'

export function AppLayout() {
  const user = useAuthStore((s) => s.user)
  const initialized = useAuthStore((s) => s.initialized)
  const logout = useAuthStore((s) => s.logout)
  const location = useLocation()

  const loadUserDecks = useUserDecksStore((s) => s.load)

  const handleLogout = () => {
    logout()
    localStorage.removeItem('token')
  }

  useEffect(() => {
    if (user && initialized) void loadUserDecks()
  }, [user, initialized, loadUserDecks])

  if (!initialized) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Loader />
      </div>
    )
  }

  if (!user) {
    const from = location.pathname + location.search
    return <Navigate to="/login" replace state={{ from }} />
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060812] text-white">
      <AppLayoutBackground />

      <div className="relative z-10 min-h-screen">
        <Content className="py-5">
          <div className="flex justify-between">
            <div>
              <h3 className="text-xl font-bold leading-none">{user?.name}</h3>
              <h4 className="text-gray-500 leading-none mt-1">{user?.email}</h4>
            </div>

            <div>
              <Button variant="danger" onClick={handleLogout}>
                Выйти
              </Button>
            </div>
          </div>
        </Content>

        <Outlet />
      </div>
    </div>
  )
}
