import type { User } from '@/interface/user'
import { create } from 'zustand'

type AuthState = {
  user: User | null
  loading: boolean
  initialized: boolean
  setUser: (u: User | null) => void
  setLoading: (v: boolean) => void
  setInitialized: (v: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,

  setUser: (user) => set({ user }),
  setLoading: (v) => set({ loading: v }),
  logout: () => set({ user: null }),

  initialized: false,
  setInitialized: (v) => set({ initialized: v }),
}))
