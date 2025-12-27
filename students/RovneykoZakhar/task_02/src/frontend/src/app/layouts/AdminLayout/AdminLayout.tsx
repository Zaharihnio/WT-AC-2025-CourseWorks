import { useAuthStore } from '@/shared/stores/authStore'
import { Link, Navigate, Outlet } from 'react-router-dom'
import { AdminLayoutBackground } from './AdminLayoutBackground'
import { Content } from '@/shared/ui/Content'
import { Loader } from '@/shared/ui/Loader'

const TOKEN_KEY = 'token'

export const AdminLayout = () => {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)

  const token = localStorage.getItem(TOKEN_KEY)
  const waitingUser = Boolean(token) && !user

  if (loading || waitingUser) {
    return <Loader />
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060812] text-white">
      <AdminLayoutBackground />

      <div className="relative z-10 min-h-screen">
        <Content className="pt-10">
          <Link to="/">На главную</Link>
        </Content>
        <Outlet />
      </div>
    </div>
  )
}
