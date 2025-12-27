import { create } from 'zustand'
import { envConfig } from '@/config/env'

const TOKEN_KEY = 'token'

type CardDto = {
  id: number
  front: string
  back: string
  examples: string
  tags: string[]
  user_id: number
  created_at: string
}

export type UserDeckDto = {
  id: number
  title: string
  description: string
  rating_avg: number | null
  rating_count: number | null
  created_at: string
  cards: CardDto[]
}

type State = {
  loaded: boolean
  loading: boolean
  error: string | null

  decks: UserDeckDto[]
  deckIds: Set<number>

  load: () => Promise<void>
  has: (deckId: number) => boolean

  markAdded: (deck: UserDeckDto) => void
  remove: (deckId: number) => Promise<void>
  markRemoved: (deckId: number) => void
}

export const useUserDecksStore = create<State>((set, get) => ({
  loaded: false,
  loading: false,
  error: null,

  decks: [],
  deckIds: new Set<number>(),

  has: (deckId) => get().deckIds.has(deckId),

  markAdded: (deck) => {
    const nextDecks = [deck, ...get().decks.filter((d) => d.id !== deck.id)]
    const nextIds = new Set(get().deckIds)
    nextIds.add(deck.id)
    set({ decks: nextDecks, deckIds: nextIds })
  },

  markRemoved: (deckId) => {
    const nextDecks = get().decks.filter((d) => d.id !== deckId)
    const nextIds = new Set(get().deckIds)
    nextIds.delete(deckId)
    set({ decks: nextDecks, deckIds: nextIds })
  },

  load: async () => {
    const { loaded, loading } = get()
    if (loaded || loading) return

    set({ loading: true, error: null })

    try {
      const token = localStorage.getItem(TOKEN_KEY)

      const res = await fetch(`${envConfig.API_URL}/user-decks`, {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Ошибка запроса: ${res.status}`)
      }

      const data = (await res.json()) as UserDeckDto[]
      const list = Array.isArray(data) ? data : []
      const ids = new Set<number>(list.map((d) => d.id))

      set({ decks: list, deckIds: ids, loaded: true })
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : 'Неизвестная ошибка',
        loaded: false,
        decks: [],
        deckIds: new Set<number>(),
      })
    } finally {
      set({ loading: false })
    }
  },

  remove: async (deckId) => {
    set({ error: null })

    try {
      const token = localStorage.getItem(TOKEN_KEY)

      const res = await fetch(`${envConfig.API_URL}/user-decks/${deckId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Ошибка запроса: ${res.status}`)
      }

      get().markRemoved(deckId)
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Неизвестная ошибка' })
      throw e
    }
  },
}))
