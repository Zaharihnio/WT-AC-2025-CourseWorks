import { useEffect, useRef, useState } from 'react'
import { useRoutes } from 'react-router-dom'
import { routes } from './routes'
import { useAuthStore } from '@/shared/stores/authStore'
import { ErrorBlock } from '@/shared/ui/ErrorBlock'
import { envConfig } from '@/config/env'
import { Loader } from '@/shared/ui/Loader'

type ProfileDto = {
  id: number
  email: string
  name: string
  role: 'user' | 'admin'
  created_at: string
}

const TOKEN_KEY = 'token'

function App() {
  const element = useRoutes(routes)

  const setUser = useAuthStore((s) => s.setUser)
  const setLoading = useAuthStore((s) => s.setLoading)
  const loading = useAuthStore((s) => s.loading)
  const setInitialized = useAuthStore((s) => s.setInitialized)

  const didRun = useRef(false)

  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (didRun.current) return
    didRun.current = true

    const token = localStorage.getItem(TOKEN_KEY)

    setLoading(true)

    if (!token) {
      setUser(null)
      setLoading(false)
      setInitialized(true)
      return
    }

    const fetchUser = async () => {
      try {
        setError('')

        const res = await fetch(`${envConfig.API_URL}/profile`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem(TOKEN_KEY)
            setUser(null)
          } else {
            setError(`Request failed: ${res.status}`)
          }
          return
        }

        const dto: ProfileDto = await res.json()

        setUser({
          id: dto.id,
          email: dto.email,
          name: dto.name,
          role: dto.role,
        })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unexpected error'

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((error as any)?.name === 'AbortError') return

        setError(message)
      } finally {
        setLoading(false)
        setInitialized(true)
      }
    }

    fetchUser()
  }, [setLoading, setUser, setInitialized])

  if (error) {
    return <ErrorBlock>{error}</ErrorBlock>
  }

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Loader />
      </div>
    )
  }

  return element
}

export default App
