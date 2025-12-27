import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './AdminCreateDeckPage.css'

import { envConfig } from '@/config/env'
import { Content } from '@/shared/ui/Content'
import { Button } from '@/shared/ui/Button/Button'
import { ErrorBlock } from '@/shared/ui/ErrorBlock'

type CardDto = {
  id: number
  front: string
  back: string
  examples: string
  tags: string[]
  user_id: number
  created_at: string
}

type CreateDeckPayload = {
  title: string
  description: string
  card_ids: number[]
}

const TOKEN_KEY = 'token'

function parseTags(input: string): string[] {
  const parts = input
    .split(/[,|\n]/g)
    .map((s) => s.trim())
    .filter(Boolean)

  const seen = new Set<string>()
  const out: string[] = []

  for (const t of parts) {
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }

  return out
}

function toggleId(list: number[], id: number) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}

export const AdminCreateDeckPage = () => {
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedCardIds, setSelectedCardIds] = useState<number[]>([])

  const [cards, setCards] = useState<CardDto[]>([])
  const [cardsPending, setCardsPending] = useState(false)
  const [cardsError, setCardsError] = useState<string | null>(null)

  const [createPending, setCreatePending] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [nameQuery, setNameQuery] = useState('')
  const [tagsQuery, setTagsQuery] = useState('')

  async function loadCards() {
    setCardsPending(true)
    setCardsError(null)

    try {
      const token = localStorage.getItem(TOKEN_KEY)

      const res = await fetch(`${envConfig.API_URL}/cards`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `HTTP ${res.status}`)
      }

      const data = (await res.json()) as CardDto[]
      setCards(Array.isArray(data) ? data : [])
    } catch (e) {
      setCardsError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setCardsPending(false)
    }
  }

  useEffect(() => {
    void loadCards()
  }, [])

  const filteredCards = useMemo(() => {
    const q = nameQuery.trim().toLowerCase()
    const tagNeedles = parseTags(tagsQuery).map((t) => t.toLowerCase())

    return cards.filter((c) => {
      const matchesName =
        !q ||
        c.front.toLowerCase().includes(q) ||
        c.back.toLowerCase().includes(q)

      const matchesTags =
        tagNeedles.length === 0 ||
        tagNeedles.every((needle) =>
          (c.tags ?? []).some((t) => t.toLowerCase().includes(needle))
        )

      return matchesName && matchesTags
    })
  }, [cards, nameQuery, tagsQuery])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)

    const payload: CreateDeckPayload = {
      title: title.trim(),
      description: description.trim(),
      card_ids: selectedCardIds,
    }

    if (!payload.title) {
      setCreateError('Заполни title.')
      return
    }

    setCreatePending(true)
    try {
      const token = localStorage.getItem(TOKEN_KEY)

      const res = await fetch(`${envConfig.API_URL}/decks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `HTTP ${res.status}`)
      }

      // можно распарсить ответ и перейти на страницу деки
      navigate('/decks')
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setCreatePending(false)
    }
  }

  const selectedCount = selectedCardIds.length

  return (
    <Content>
      <div className="AdminCreateDeckPage">
        <header className="AdminCreateDeckPage__header">
          <div>
            <h1 className="AdminCreateDeckPage__title">Создание деки</h1>
            <div className="AdminCreateDeckPage__subtitle">
              Выбрано карточек: {selectedCount}
            </div>
          </div>

          <div className="AdminCreateDeckPage__headerActions">
            <Button type="button" onClick={() => navigate('/decks')}>
              Назад
            </Button>
          </div>
        </header>

        <div className="AdminCreateDeckPage__layout">
          {/* LEFT: form */}
          <section className="AdminCreateDeckPage__panel">
            <h2 className="AdminCreateDeckPage__panelTitle">Данные деки</h2>

            {createError && <ErrorBlock>{createError}</ErrorBlock>}

            <form className="AdminCreateDeckForm" onSubmit={onSubmit}>
              <label className="AdminField">
                <div className="AdminField__label">Title</div>
                <input
                  className="AdminField__input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Например: Present Simple"
                  required
                />
              </label>

              <label className="AdminField">
                <div className="AdminField__label">Description</div>
                <textarea
                  className="AdminField__textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Короткое описание деки…"
                  rows={5}
                />
              </label>

              <div className="AdminCreateDeckForm__actions">
                <Button type="submit" disabled={createPending}>
                  {createPending ? 'Создаю…' : 'Создать деку'}
                </Button>

                <Button
                  type="button"
                  disabled={createPending || selectedCardIds.length === 0}
                  onClick={() => setSelectedCardIds([])}
                >
                  Очистить выбор
                </Button>
              </div>
            </form>
          </section>

          {/* RIGHT: cards */}
          <section className="AdminCreateDeckPage__panel">
            <div className="AdminCreateDeckPage__panelTop">
              <h2 className="AdminCreateDeckPage__panelTitle">Карточки</h2>

              <Button type="button" onClick={loadCards} disabled={cardsPending}>
                {cardsPending ? 'Загрузка…' : 'Обновить'}
              </Button>
            </div>

            {cardsError && <ErrorBlock>{createError}</ErrorBlock>}

            <div className="CardFilters">
              <label className="AdminField">
                <div className="AdminField__label">
                  Поиск по названию (front/back)
                </div>
                <input
                  className="AdminField__input"
                  value={nameQuery}
                  onChange={(e) => setNameQuery(e.target.value)}
                  placeholder="например: go, apple, question…"
                />
              </label>

              <label className="AdminField">
                <div className="AdminField__label">
                  Поиск по тегам (через запятую)
                </div>
                <input
                  className="AdminField__input"
                  value={tagsQuery}
                  onChange={(e) => setTagsQuery(e.target.value)}
                  placeholder="например: grammar, a1, verbs"
                />
              </label>

              <div className="CardFilters__meta">
                Найдено: {filteredCards.length} / {cards.length}
              </div>
            </div>

            {!cardsError && !cardsPending && cards.length === 0 && (
              <div className="AdminEmpty">Карточек пока нет.</div>
            )}

            <div className="CardsList">
              {filteredCards.map((c) => {
                const checked = selectedCardIds.includes(c.id)

                return (
                  <label key={c.id} className="CardRow">
                    <input
                      className="CardRow__check"
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedCardIds((prev) => toggleId(prev, c.id))
                      }
                    />

                    <div className="CardRow__body">
                      <div className="CardRow__front">{c.front}</div>
                      <div className="CardRow__back">{c.back}</div>

                      {c.tags?.length ? (
                        <div className="CardRow__tags">
                          {c.tags.map((t) => (
                            <span key={`${c.id}-${t}`} className="TagChip">
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="CardRow__tags CardRow__tags--muted">
                          без тегов
                        </div>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </Content>
  )
}
