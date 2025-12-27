import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './DecksCardsPage.css'

import { envConfig } from '@/config/env'
import { Content } from '@/shared/ui/Content'
import { ErrorBlock } from '@/shared/ui/ErrorBlock'
import { Button } from '@/shared/ui/Button/Button'

type DeckDto = {
  id: number
  title: string
  description: string
  rating_avg: number
  rating_count: number
  created_at: string
}

const TOKEN_KEY = 'token'

function formatRating(avg: number, count: number) {
  if (!count) return '—'
  const safeAvg = Number.isFinite(avg) ? avg : 0
  return `${safeAvg.toFixed(1)} · ${count}`
}

export const DecksCardsPage = () => {
  const navigate = useNavigate()

  const [decks, setDecks] = useState<DeckDto[]>([])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [deletingIds, setDeletingIds] = useState<Set<number>>(() => new Set())

  async function loadDecks() {
    setPending(true)
    setError(null)

    try {
      const token = localStorage.getItem(TOKEN_KEY)

      const res = await fetch(`${envConfig.API_URL}/decks`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `HTTP ${res.status}`)
      }

      const data = (await res.json()) as DeckDto[]
      setDecks(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setPending(false)
    }
  }

  async function deleteDeck(deckId: number, deckTitle: string) {
    const ok = window.confirm(`Удалить деку «${deckTitle}»?`)
    if (!ok) return

    setError(null)
    setDeletingIds((prev) => {
      const next = new Set(prev)
      next.add(deckId)
      return next
    })

    try {
      const token = localStorage.getItem(TOKEN_KEY)

      const res = await fetch(`${envConfig.API_URL}/decks/${deckId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `HTTP ${res.status}`)
      }

      setDecks((prev) => prev.filter((d) => d.id !== deckId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(deckId)
        return next
      })
    }
  }

  useEffect(() => {
    void loadDecks()
  }, [])

  return (
    <Content>
      <div className="DecksCardsPage">
        <header className="DecksCardsPage__header">
          <h1 className="DecksCardsPage__title">Decks</h1>

          <div className="DecksCardsPage__actions">
            <Button
              type="button"
              onClick={() => navigate('/admin/decks/create')}
            >
              Создать деку
            </Button>

            <Button type="button" onClick={loadDecks} disabled={pending}>
              {pending ? 'Загрузка…' : 'Обновить'}
            </Button>
          </div>
        </header>

        {error && <ErrorBlock>{error}</ErrorBlock>}

        {!error && !pending && decks.length === 0 && (
          <div className="DecksCardsPage__empty">Пока нет ни одной колоды.</div>
        )}

        <div className="DecksCardsPage__grid">
          {decks.map((deck) => {
            const isDeleting = deletingIds.has(deck.id)

            return (
              <article key={deck.id} className="DeckCard">
                <div className="DeckCard__top">
                  <div className="DeckCard__main">
                    <h2 className="DeckCard__title">{deck.title}</h2>
                    <div className="DeckCard__rating">
                      {formatRating(deck.rating_avg, deck.rating_count)}
                    </div>
                  </div>

                  <div className="DeckCard__topActions">
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      disabled={isDeleting}
                      onClick={() => void deleteDeck(deck.id, deck.title)}
                    >
                      {isDeleting ? 'Удаляем…' : 'Удалить'}
                    </Button>
                  </div>
                </div>

                {deck.description ? (
                  <p className="DeckCard__desc">{deck.description}</p>
                ) : (
                  <p className="DeckCard__desc DeckCard__desc--muted">
                    Без описания
                  </p>
                )}
              </article>
            )
          })}
        </div>
      </div>
    </Content>
  )
}
