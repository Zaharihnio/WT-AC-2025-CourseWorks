import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import './DeckDetailPage.css'

import { envConfig } from '@/config/env'
import { Content } from '@/shared/ui/Content'
import { ErrorBlock } from '@/shared/ui/ErrorBlock'
import { Button } from '@/shared/ui/Button'
import { useUserDecksStore } from '@/shared/stores/userDecksStore'

type CardDto = {
  id: number
  front: string
  back: string
  examples: string
  tags: string[]
  user_id: number
  created_at: string
}

type DeckDetailDto = {
  id: number
  title: string
  description: string
  rating_avg: number
  rating_count: number
  created_at: string
  cards: CardDto[]
}

const TOKEN_KEY = 'token'

function formatDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('ru-RU')
}

async function readErrorText(res: Response): Promise<string> {
  const text = await res.text().catch(() => '')
  if (!text) return `Ошибка запроса: ${res.status}`

  try {
    const json = JSON.parse(text) as { detail?: string }
    if (json?.detail) return json.detail
  } catch {
    // ignore
  }

  return text
}

/**
 * Приводим DeckDetailDto к формату, который хранит useUserDecksStore.
 * Если у тебя в сторе тип один-в-один — можно просто `return d as any`.
 */
function toUserDeck(d: DeckDetailDto) {
  return {
    id: d.id,
    title: d.title,
    description: d.description,
    rating_avg: d.rating_avg ?? 0,
    rating_count: d.rating_count ?? 0,
    created_at: d.created_at,
    cards: d.cards ?? [],
  }
}

export function DeckDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()

  const deckIdFromParams = useMemo(() => Number(id), [id])

  const [deck, setDeck] = useState<DeckDetailDto | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [addPending, setAddPending] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [removePending, setRemovePending] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)

  // ====== user-decks: только через стор ======
  const userDecksLoaded = useUserDecksStore((s) => s.loaded)
  const checkPending = useUserDecksStore((s) => s.loading)
  const checkError = useUserDecksStore((s) => s.error)
  const loadUserDecks = useUserDecksStore((s) => s.load)

  const markAdded = useUserDecksStore((s) => s.markAdded)
  const removeDeck = useUserDecksStore((s) => s.remove)

  // Важный момент: если id из URL кривой/NaN — берем id из загруженной деки
  const targetDeckId = Number.isFinite(deckIdFromParams)
    ? deckIdFromParams
    : deck?.id

  const added = useUserDecksStore((s) =>
    Number.isFinite(Number(targetDeckId)) ? s.has(Number(targetDeckId)) : false
  )

  useEffect(() => {
    // Безопасно: стор сам не дернет повторно (там стоит guard loaded/loading)
    if (!userDecksLoaded) void loadUserDecks()
  }, [userDecksLoaded, loadUserDecks])

  async function removeDeckFromUser() {
    if (!Number.isFinite(Number(targetDeckId))) return
    if (!added) return

    setRemovePending(true)
    setRemoveError(null)

    try {
      await removeDeck(Number(targetDeckId)) // DELETE /user-decks/{deck_id} внутри стора
    } catch (e) {
      setRemoveError(e instanceof Error ? e.message : 'Неизвестная ошибка')
    } finally {
      setRemovePending(false)
    }
  }

  async function addDeckToUser() {
    if (!deck) return
    if (added) return

    setAddPending(true)
    setAddError(null)

    try {
      const token = localStorage.getItem(TOKEN_KEY)

      const res = await fetch(`${envConfig.API_URL}/user-decks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          deck_id: deck.id,
          is_favorite: false,
        }),
      })

      if (!res.ok) {
        const msg = await readErrorText(res)

        // если сервер говорит "уже добавлено" — синхронизируем стор и UI сразу переключится
        if (res.status === 400 && msg.includes('Deck already added')) {
          markAdded(toUserDeck(deck))
          return
        }

        throw new Error(msg)
      }

      // успех — тоже синхронизируем стор
      markAdded(toUserDeck(deck))
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Неизвестная ошибка')
    } finally {
      setAddPending(false)
    }
  }

  async function loadDeck() {
    if (!Number.isFinite(deckIdFromParams)) {
      setError('Некорректный ID деки')
      setDeck(null)
      return
    }

    setPending(true)
    setError(null)

    try {
      const token = localStorage.getItem(TOKEN_KEY)

      const res = await fetch(
        `${envConfig.API_URL}/decks/${deckIdFromParams}`,
        {
          method: 'GET',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      )

      if (!res.ok) {
        const msg = await readErrorText(res)
        throw new Error(msg)
      }

      const data = (await res.json()) as DeckDetailDto
      setDeck(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неизвестная ошибка')
      setDeck(null)
    } finally {
      setPending(false)
    }
  }

  useEffect(() => {
    void loadDeck()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckIdFromParams])

  const practiseTargetId = deck?.id ?? targetDeckId

  return (
    <Content>
      <div className="DeckDetailPage">
        <div className="DeckDetailPage__top">
          <Button
            className="DeckDetailPage__back"
            onClick={() => navigate('/decks')}
          >
            ← Назад к списку
          </Button>

          <div className="DeckDetailPage__actions">
            {!added ? (
              <Button
                className="DeckDetailPage__add"
                onClick={() => void addDeckToUser()}
                disabled={addPending || !deck || checkPending}
                title="Добавить деку себе"
              >
                {checkPending
                  ? 'Проверяю...'
                  : addPending
                  ? 'Добавляю...'
                  : 'Добавить себе'}
              </Button>
            ) : (
              <Button
                variant="danger"
                onClick={() => void removeDeckFromUser()}
                disabled={
                  removePending || !Number.isFinite(Number(targetDeckId))
                }
                title="Удалить деку из моих"
              >
                {removePending ? 'Удаляю...' : 'Удалить из моих'}
              </Button>
            )}

            <Button
              className="DeckDetailPage__reload"
              onClick={() => void loadDeck()}
              disabled={pending}
            >
              Обновить
            </Button>
          </div>
        </div>

        {addError && (
          <div className="DeckDetailPage__error">
            <ErrorBlock>{addError}</ErrorBlock>
          </div>
        )}

        {checkError && (
          <div className="DeckDetailPage__error">
            <ErrorBlock>{checkError}</ErrorBlock>
          </div>
        )}

        {removeError && (
          <div className="DeckDetailPage__error">
            <ErrorBlock>{removeError}</ErrorBlock>
          </div>
        )}

        {error && (
          <div className="DeckDetailPage__error">
            <ErrorBlock>{error}</ErrorBlock>
          </div>
        )}

        {pending && <div className="DeckDetailPage__loading">Загрузка...</div>}

        {!pending && !error && deck && (
          <>
            <div className="DeckDetailPage__header">
              <div className="DeckDetailPage__headerLeft">
                <h1 className="DeckDetailPage__title">{deck.title}</h1>

                {deck.description ? (
                  deck.description
                ) : (
                  <p className="DeckDetailPage__muted">Без описания</p>
                )}

                <div className="DeckDetailPage__meta">
                  <span className="DeckDetailPage__metaChip">
                    ID: {deck.id}
                  </span>
                  <span className="DeckDetailPage__metaText">
                    {formatDate(deck.created_at)}
                  </span>
                </div>
              </div>

              <div className="DeckDetailPage__rating">
                <span className="DeckDetailPage__ratingChip">
                  ⭐ {Number(deck.rating_avg ?? 0).toFixed(2)} (
                  {deck.rating_count ?? 0})
                </span>
              </div>
            </div>

            <div className="DeckDetailPage__section">
              <h2 className="DeckDetailPage__sectionTitle">
                Карточки ({deck.cards?.length ?? 0})
              </h2>

              {(!deck.cards || deck.cards.length === 0) && (
                <div className="DeckDetailPage__empty">
                  В этой деке пока нет карточек.
                </div>
              )}

              {deck.cards && deck.cards.length > 0 && (
                <div className="DeckDetailPage__cards">
                  {deck.cards.map((card) => (
                    <div key={card.id} className="DeckDetailPage__card">
                      <div className="DeckDetailPage__cardTop">
                        <div className="DeckDetailPage__cardTitle">
                          #{card.id}
                        </div>
                      </div>

                      <div className="DeckDetailPage__cardRow">
                        <div className="DeckDetailPage__label">Front</div>
                        <div className="DeckDetailPage__value">
                          {card.front}
                        </div>
                      </div>

                      <div className="DeckDetailPage__cardRow">
                        <div className="DeckDetailPage__label">Back</div>
                        <div className="DeckDetailPage__value">{card.back}</div>
                      </div>

                      <div className="DeckDetailPage__tags">
                        {card.tags?.length ? (
                          card.tags.map((t) => (
                            <span key={t} className="DeckDetailPage__tag">
                              {t}
                            </span>
                          ))
                        ) : (
                          <span className="DeckDetailPage__muted">
                            Тегов нет
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {added ? (
        <div className="DeckDetailPage__bottomBar">
          <Button
            className="DeckDetailPage__practiseBtn"
            size="lg"
            variant="primary"
            disabled={!Number.isFinite(Number(practiseTargetId))}
            onClick={() => {
              const targetId = Number(practiseTargetId)
              navigate(`/decks/${targetId}/practise`, {
                state: { deck },
              })
            }}
          >
            Проверить себя
          </Button>
        </div>
      ) : null}
    </Content>
  )
}
