import { useEffect, useMemo, useState } from 'react'
import './AdminCardsPage.css'

import { envConfig } from '@/config/env'
import { Content } from '@/shared/ui/Content'
import { Button } from '@/shared/ui/Button/Button'
import { FormField } from '@/shared/ui/FormField/FormField'
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

type CreateCardPayload = {
  front: string
  back: string
  examples: string
  tags: string[]
}

type UpdateCardPayload = {
  front: string
  back: string
  examples: string
  tags: string[]
}

const TOKEN_KEY = 'token'

function formatDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('ru-RU')
}

function parseTags(input: string): string[] {
  const parts = input
    .split(/[,|\n]/g)
    .map((s) => s.trim())
    .filter(Boolean)

  const seen = new Set<string>()
  const out: string[] = []
  for (const t of parts) {
    const key = t.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      out.push(t)
    }
  }
  return out
}

function tagsToText(tags: string[]) {
  return Array.isArray(tags) && tags.length ? tags.join(', ') : ''
}

export const AdminCardsPage = () => {
  const [cards, setCards] = useState<CardDto[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const [loading, setLoading] = useState(false)

  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [loadError, setLoadError] = useState<string | null>(null)

  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)

  const [updateError, setUpdateError] = useState<string | null>(null)
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null)

  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [detailsFormKey, setDetailsFormKey] = useState(0)

  const selectedCard = useMemo(
    () => cards.find((c) => c.id === selectedId) ?? null,
    [cards, selectedId]
  )

  function openCreateModal() {
    setCreateError(null)
    setIsCreateOpen(true)
  }

  function closeCreateModal() {
    setCreateError(null)
    setIsCreateOpen(false)
  }

  useEffect(() => {
    setUpdateError(null)
    setUpdateSuccess(null)
    setDeleteError(null)
    setDetailsFormKey((x) => x + 1)
  }, [selectedId])

  useEffect(() => {
    if (!isCreateOpen) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeCreateModal()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isCreateOpen])

  useEffect(() => {
    let alive = true
    const controller = new AbortController()

    async function load() {
      try {
        setLoading(true)
        setLoadError(null)

        const token = localStorage.getItem(TOKEN_KEY)

        const res = await fetch(`${envConfig.API_URL}/cards`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        })

        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(text || `Ошибка загрузки карточек (${res.status})`)
        }

        const json: unknown = await res.json()
        const list = Array.isArray(json) ? (json as CardDto[]) : []

        if (!alive) return
        setCards(list)
        if (list.length > 0) setSelectedId((prev) => prev ?? list[0].id)
      } catch (e) {
        if (!alive) return
        if (e instanceof DOMException && e.name === 'AbortError') return
        setLoadError(e instanceof Error ? e.message : 'Неизвестная ошибка')
      } finally {
        setLoading(false)
      }
    }

    void load()

    return () => {
      alive = false
      controller.abort()
    }
  }, [])

  async function onCreateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const form = e.currentTarget

    setCreateError(null)
    setCreateSuccess(null)

    const fd = new FormData(form)

    const payload: CreateCardPayload = {
      front: String(fd.get('front') ?? '').trim(),
      back: String(fd.get('back') ?? '').trim(),
      examples: String(fd.get('examples') ?? '').trim(),
      tags: parseTags(String(fd.get('tags') ?? '')),
    }

    if (!payload.front || !payload.back) {
      setCreateError('Front и Back обязательны')
      return
    }

    try {
      setCreating(true)

      const token = localStorage.getItem(TOKEN_KEY)

      const res = await fetch(`${envConfig.API_URL}/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Ошибка создания карточки (${res.status})`)
      }

      const created: CardDto = await res.json()

      setCards((prev) => [created, ...prev])
      setSelectedId(created.id)

      form.reset()
      setCreateSuccess(`Карточка #${created.id} создана`)
      closeCreateModal()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setCreating(false)
    }
  }

  async function onUpdateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedCard) return

    const form = e.currentTarget

    setUpdateError(null)
    setUpdateSuccess(null)

    const fd = new FormData(form)

    // ВАЖНО: отправляем ВСЕ поля целиком
    const payload: UpdateCardPayload = {
      front: String(fd.get('front') ?? '').trim(),
      back: String(fd.get('back') ?? '').trim(),
      examples: String(fd.get('examples') ?? '').trim(),
      tags: parseTags(String(fd.get('tags') ?? '')),
    }

    if (!payload.front || !payload.back) {
      setUpdateError('Front и Back обязательны')
      return
    }

    try {
      setUpdating(true)

      const token = localStorage.getItem(TOKEN_KEY)

      const res = await fetch(`${envConfig.API_URL}/cards/${selectedCard.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Ошибка сохранения карточки (${res.status})`)
      }

      const updated: CardDto = await res.json()

      setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      setUpdateSuccess('Сохранено')

      // обновим дефолт-значения (перемонтируем форму)
      setDetailsFormKey((x) => x + 1)
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setUpdating(false)
    }
  }

  async function onDeleteClick() {
    if (!selectedCard) return
    if (deleting) return

    const ok = window.confirm(`Удалить карточку #${selectedCard.id}?`)
    if (!ok) return

    setDeleteError(null)
    setUpdateError(null)
    setUpdateSuccess(null)

    try {
      setDeleting(true)

      const token = localStorage.getItem(TOKEN_KEY)

      const res = await fetch(`${envConfig.API_URL}/cards/${selectedCard.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Ошибка удаления карточки (${res.status})`)
      }

      // выберем следующую/предыдущую карточку
      const current = cards
      const idx = current.findIndex((c) => c.id === selectedCard.id)
      const nextList = current.filter((c) => c.id !== selectedCard.id)
      const nextId =
        nextList[idx]?.id ?? nextList[idx - 1]?.id ?? nextList[0]?.id ?? null

      setCards(nextList)
      setSelectedId(nextId)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Content>
      <div className="adminCardsPage">
        <header className="adminCardsHeader">
          <div className="adminCardsHeaderLeft">
            <h1 className="adminCardsTitle">Карточки</h1>
            <div className="adminCardsMeta">
              {loading ? 'Загрузка…' : `Всего: ${cards.length}`}
            </div>
          </div>

          <div className="adminCardsHeaderRight">
            <Button type="button" onClick={openCreateModal}>
              Создать карточку
            </Button>
          </div>
        </header>

        {loadError && (
          <div className="adminCardsBlock">
            <ErrorBlock>{loadError}</ErrorBlock>
          </div>
        )}

        {createSuccess && (
          <div className="adminCardsSuccess">{createSuccess}</div>
        )}

        <div className="adminCardsGrid">
          <aside className="adminCardsList">
            {loading && cards.length === 0 ? (
              <div className="adminCardsEmpty">Подтягиваем карточки…</div>
            ) : cards.length === 0 ? (
              <div className="adminCardsEmpty">Карточек пока нет</div>
            ) : (
              <ul className="adminCardsUl">
                {cards.map((card) => {
                  const isActive = card.id === selectedId
                  const tagsCount = Array.isArray(card.tags)
                    ? card.tags.length
                    : 0

                  return (
                    <li key={card.id}>
                      <button
                        type="button"
                        className={
                          isActive ? 'adminCardItem is-active' : 'adminCardItem'
                        }
                        onClick={() => setSelectedId(card.id)}
                      >
                        <div className="adminCardItemTop">
                          <span className="adminCardId">#{card.id}</span>
                          <span className="adminCardMetaRight">
                            user: {card.user_id}
                          </span>
                        </div>

                        <div className="adminCardPreview">
                          {card.front || '—'}
                        </div>

                        <div className="adminCardSubline">
                          <span className="adminCardSubText">
                            {formatDate(card.created_at)}
                          </span>
                          <span className="adminCardSubText">
                            теги: {tagsCount}
                          </span>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </aside>

          <section className="adminCardsRight">
            {!selectedCard ? (
              <div className="adminCardsEmpty">Выберите карточку слева</div>
            ) : (
              <div className="adminCardsDetails">
                <div className="adminDetailsTop">
                  <div className="adminDetailsTitle">
                    Детали и редактирование
                  </div>
                  <div className="adminDetailsMeta">
                    <span className="adminCardDetailsPill">
                      ID: {selectedCard.id}
                    </span>
                    <span className="adminCardDetailsPill">
                      User: {selectedCard.user_id}
                    </span>
                    <span className="adminCardDetailsPill">
                      {formatDate(selectedCard.created_at)}
                    </span>
                  </div>
                </div>

                {updateError && (
                  <div className="adminCardsBlock">
                    <ErrorBlock>{updateError}</ErrorBlock>
                  </div>
                )}

                {deleteError && (
                  <div className="adminCardsBlock">
                    <ErrorBlock>{deleteError}</ErrorBlock>
                  </div>
                )}

                {updateSuccess && (
                  <div className="adminCardsSuccess">{updateSuccess}</div>
                )}

                <form
                  key={`${selectedCard.id}-${detailsFormKey}`}
                  className="adminEditForm"
                  onSubmit={onUpdateSubmit}
                >
                  <FormField
                    label="Front *"
                    name="front"
                    required
                    defaultValue={selectedCard.front}
                    placeholder="Front"
                  />

                  <FormField
                    label="Back *"
                    name="back"
                    required
                    defaultValue={selectedCard.back}
                    placeholder="Back"
                  />

                  <FormField
                    label="Examples"
                    name="examples"
                    defaultValue={selectedCard.examples}
                    placeholder="Examples"
                  />

                  <FormField
                    label="Tags"
                    name="tags"
                    defaultValue={tagsToText(selectedCard.tags)}
                    placeholder="travel, business, ..."
                  />

                  <div className="adminDetailsActions">
                    <Button
                      type="button"
                      onClick={onDeleteClick}
                      disabled={deleting || updating}
                    >
                      {deleting ? 'Удаляем…' : 'Удалить'}
                    </Button>

                    <Button type="submit" disabled={updating || deleting}>
                      {updating ? 'Сохраняем…' : 'Сохранить'}
                    </Button>
                  </div>
                </form>

                <div className="adminDetailsPreview">
                  <div className="adminCardDetailsRow">
                    <div className="adminCardDetailsLabel">
                      Теги (как pills)
                    </div>
                    {selectedCard.tags?.length ? (
                      <div className="adminCardTags">
                        {selectedCard.tags.map((t, i) => (
                          <span key={`${t}-${i}`} className="adminCardTag">
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="adminCardDetailsHint">Тегов нет</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {isCreateOpen && (
          <div
            className="adminModalOverlay"
            role="dialog"
            aria-modal="true"
            onMouseDown={closeCreateModal}
          >
            <div
              className="adminModal"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="adminModalHeader">
                <h2 className="adminModalTitle">Создать карточку</h2>
                <button
                  type="button"
                  className="adminModalClose"
                  onClick={closeCreateModal}
                  aria-label="Закрыть"
                >
                  ×
                </button>
              </div>

              <div className="adminModalHint">
                Теги: через запятую или с новой строки
              </div>

              {createError && (
                <div className="adminCardsBlock">
                  <ErrorBlock>{createError}</ErrorBlock>
                </div>
              )}

              <form className="adminCreateForm" onSubmit={onCreateSubmit}>
                <FormField
                  label="Front *"
                  name="front"
                  required
                  placeholder="Например: to make ends meet"
                />

                <FormField
                  label="Back *"
                  name="back"
                  required
                  placeholder="Перевод / определение"
                />

                <FormField
                  label="Examples"
                  name="examples"
                  placeholder="Примеры употребления"
                />

                <FormField
                  label="Tags"
                  name="tags"
                  placeholder="travel, business, phrasal verbs"
                />

                <div className="adminModalActions">
                  <Button
                    type="button"
                    onClick={closeCreateModal}
                    disabled={creating}
                  >
                    Отмена
                  </Button>

                  <Button type="submit" disabled={creating}>
                    {creating ? 'Создаём…' : 'Создать'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Content>
  )
}
