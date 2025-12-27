import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './DecksPage.css'

import { envConfig } from '@/config/env'
import { Content } from '@/shared/ui/Content'
import { ErrorBlock } from '@/shared/ui/ErrorBlock'
import { Loader } from '@/shared/ui/Loader'
import { Button } from '@/shared/ui/Button'
import { DeckCard } from '@/shared/components/DeckCard'

type DeckDto = {
  id: number
  title: string
  description: string
  rating_avg: number
  rating_count: number
  created_at: string
}

const TOKEN_KEY = 'token'

export function DecksPage() {
  const navigate = useNavigate()

  const [items, setItems] = useState<DeckDto[]>([])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setPending(true)
    setError(null)

    try {
      const token = localStorage.getItem(TOKEN_KEY)

      const res = await fetch(`${envConfig.API_URL}/decks`, {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Ошибка запроса: ${res.status}`)
      }

      const data = (await res.json()) as DeckDto[]
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неизвестная ошибка')
    } finally {
      setPending(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <Content>
      <div>
        <Button>
          <Link to={'/'}>На главную</Link>
        </Button>
      </div>
      <div className="DecksPage">
        <div className="DecksPage__header">
          <h1 className="DecksPage__title">Деки</h1>
          <button
            className="DecksPage__reload"
            onClick={() => void load()}
            disabled={pending}
          >
            Обновить
          </button>
        </div>

        {error && (
          <div className="DecksPage__error">
            <ErrorBlock>{error}</ErrorBlock>
          </div>
        )}

        {pending && (
          <div className="DecksPage__loading">
            <Loader />
          </div>
        )}

        {!pending && !error && items.length === 0 && (
          <div className="DecksPage__empty">Пока нет ни одной деки.</div>
        )}

        {!pending && !error && items.length > 0 && (
          <div className="DecksPage__grid">
            {items.map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                onClick={() => navigate(`/decks/${deck.id}/`)}
              />
            ))}
          </div>
        )}
      </div>
    </Content>
  )
}
