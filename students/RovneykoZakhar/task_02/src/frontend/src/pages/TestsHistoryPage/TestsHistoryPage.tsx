import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import './TestsHistoryPage.css'

import { envConfig } from '@/config/env'
import { Content } from '@/shared/ui/Content'
import { ErrorBlock } from '@/shared/ui/ErrorBlock'
import { Button } from '@/shared/ui/Button'

import { useUserDecksStore } from '@/shared/stores/userDecksStore'

type TestHistoryItem = {
  id: number
  user_id: number
  deck_id: number
  score: number
  total: number
  percentage: number
  created_at: string
}

type UserDecksStoreState = ReturnType<typeof useUserDecksStore.getState>

const TOKEN_KEY = 'token'

function formatDateTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })
}

function formatDay(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('ru-RU', { dateStyle: 'full' })
}

function clampPct(n: number) {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function TestsHistoryPage() {
  const [items, setItems] = useState<TestHistoryItem[]>([])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const decks = useUserDecksStore((s: UserDecksStoreState) => s.decks ?? [])
  const deckTitleById = useMemo(() => {
    const m = new Map<number, string>()
    for (const d of decks) {
      const title = (d.title ?? '').trim()
      m.set(d.id, title.length > 0 ? title : `Дек #${d.id}`)
    }
    return m
  }, [decks])
  const knownDeckIds = useMemo(() => new Set(decks.map((d) => d.id)), [decks])

  const [deckFilter, setDeckFilter] = useState<number | 'all'>('all')

  const visibleItems = useMemo(() => {
    if (decks.length === 0) return items
    return items.filter((it) => knownDeckIds.has(it.deck_id))
  }, [items, knownDeckIds, decks.length])
  const filtered = useMemo(() => {
    if (deckFilter === 'all') return visibleItems
    return visibleItems.filter((x) => x.deck_id === deckFilter)
  }, [visibleItems, deckFilter])

  const deckOptions = useMemo(() => {
    const ids = Array.from(new Set(visibleItems.map((x) => x.deck_id)))
    ids.sort((a, b) => a - b)
    return ids
  }, [visibleItems])

  const grouped = useMemo(() => {
    const m = new Map<string, TestHistoryItem[]>()
    for (const it of filtered) {
      const key = formatDay(it.created_at)
      const arr = m.get(key) ?? []
      arr.push(it)
      m.set(key, arr)
    }
    return Array.from(m.entries())
  }, [filtered])

  async function load() {
    setPending(true)
    setError(null)

    const ac = new AbortController()
    try {
      const token = localStorage.getItem(TOKEN_KEY)
      const res = await fetch(`${envConfig.API_URL}/tests/history`, {
        signal: ac.signal,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Ошибка запроса: ${res.status}`)
      }

      const data = (await res.json()) as TestHistoryItem[]
      data.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))

      setItems(data)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg || 'Не удалось загрузить историю')
    } finally {
      setPending(false)
    }

    return () => ac.abort()
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <Content className="pb-10">
      <div className="TestsHistoryPage__toolbar">
        <div className="TestsHistoryPage__filters">
          <label className="TestsHistoryPage__label">
            Дек:
            <select
              className="TestsHistoryPage__select"
              value={deckFilter}
              onChange={(e) => {
                const v = e.target.value
                setDeckFilter(v === 'all' ? 'all' : Number(v))
              }}
            >
              <option value="all">Все</option>
              {deckOptions.map((id) => (
                <option key={id} value={id}>
                  {deckTitleById.get(id) ?? `Дек #${id}`}
                </option>
              ))}
            </select>
          </label>
        </div>

        <Button onClick={load} disabled={pending}>
          {pending ? 'Обновляем…' : 'Обновить'}
        </Button>
      </div>

      {error && <ErrorBlock>{error}</ErrorBlock>}

      {!pending && !error && filtered.length === 0 ? (
        <div className="TestsHistoryPage__empty">Пока нет результатов.</div>
      ) : null}

      <div className="TestsHistoryPage__groups">
        {grouped.map(([day, list]) => (
          <section key={day} className="TestsHistoryPage__group">
            <div className="TestsHistoryPage__groupTitle">{day}</div>

            <div className="TestsHistoryPage__list">
              {list.map((it) => {
                const pct = clampPct(it.percentage)
                const deckTitle =
                  deckTitleById.get(it.deck_id) ?? `Дек #${it.deck_id}`

                return (
                  <div key={it.id} className="TestHistoryItem">
                    <div className="TestHistoryItem__top">
                      <div className="TestHistoryItem__left">
                        <Link
                          className="TestHistoryItem__deck"
                          to={`/decks/${it.deck_id}`}
                        >
                          {deckTitle}
                        </Link>
                        <div className="TestHistoryItem__date">
                          {formatDateTime(it.created_at)}
                        </div>
                      </div>

                      <div className="TestHistoryItem__right">
                        <div className="TestHistoryItem__score">
                          {it.score}/{it.total}
                        </div>
                        <div className="TestHistoryItem__pct">{pct}%</div>
                      </div>
                    </div>

                    <div className="TestHistoryItem__bar">
                      <div
                        className="TestHistoryItem__barFill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </Content>
  )
}
