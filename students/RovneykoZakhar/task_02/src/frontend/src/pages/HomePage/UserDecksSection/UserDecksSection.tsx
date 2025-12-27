import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import './UserDecksSection.css'

import { Button } from '@/shared/ui/Button'
import { ErrorBlock } from '@/shared/ui/ErrorBlock'
import { useUserDecksStore } from '@/shared/stores/userDecksStore'
import { DeckCard } from '@/shared/components/DeckCard/DeckCard'

type Props = {
  maxVisible?: number
  browsePath?: string
  title?: string
}

const DEFAULT_BROWSE_PATH = '/decks'

export function UserDecksSection({
  maxVisible,
  browsePath = DEFAULT_BROWSE_PATH,
  title = 'Мои деки',
}: Props) {
  const navigate = useNavigate()

  const loaded = useUserDecksStore((s) => s.loaded)
  const loading = useUserDecksStore((s) => s.loading)
  const error = useUserDecksStore((s) => s.error)
  const decks = useUserDecksStore((s) => s.decks)

  const items = useMemo(() => {
    // если нужно — сортируй как хочешь (по created_at, по id, и т.д.)
    const sorted = [...decks].sort((a, b) => b.id - a.id)
    if (!maxVisible) return sorted
    return sorted.slice(0, Math.max(0, maxVisible))
  }, [decks, maxVisible])

  const totalCount = decks.length
  const hiddenCount = maxVisible ? Math.max(0, totalCount - items.length) : 0

  return (
    <section className="UserDecksSection">
      <div className="UserDecksSection__header">
        <div className="UserDecksSection__headLeft">
          <div className="UserDecksSection__title">{title}</div>
          <div className="UserDecksSection__subtitle">
            {totalCount > 0
              ? `В библиотеке: ${totalCount}`
              : 'Пока нет добавленных дек'}
          </div>
        </div>

        <div className="UserDecksSection__actions">
          <Button variant="secondary" onClick={() => navigate(browsePath)}>
            Найти больше дек
          </Button>
        </div>
      </div>

      {error ? (
        <div className="UserDecksSection__error">
          <ErrorBlock>{error}</ErrorBlock>
        </div>
      ) : null}

      {!loaded && loading ? (
        <div className="UserDecksSection__loading">Загрузка...</div>
      ) : null}

      {loaded && !loading && !error && totalCount === 0 ? (
        <div className="UserDecksSection__empty">
          <div className="UserDecksSection__emptyText">
            Добавь пару дек из каталога — и они появятся здесь.
          </div>

          <Button onClick={() => navigate(browsePath)}>
            Перейти в каталог дек
          </Button>
        </div>
      ) : null}

      {loaded && !loading && !error && totalCount > 0 ? (
        <>
          <div className="DecksPage__grid">
            {items.map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                onClick={() => navigate(`/decks/${deck.id}/`)}
              />
            ))}

            <button
              type="button"
              className="DecksPage__card UserDecksSection__browseCard"
              onClick={() => navigate(browsePath)}
            >
              <div className="UserDecksSection__browseTitle">
                ➕ Найти ещё деки
              </div>
              <div className="UserDecksSection__browseDesc">
                Перейти в каталог и добавить новые
              </div>

              <div className="UserDecksSection__browseHint">
                {hiddenCount > 0
                  ? `Сейчас показано: ${items.length}, скрыто: ${hiddenCount}`
                  : 'Открыть /decks →'}
              </div>
            </button>
          </div>

          {hiddenCount > 0 ? (
            <div className="UserDecksSection__footer">
              Показано {items.length} из {totalCount}. Хочешь все — убери{' '}
              <b>maxVisible</b>.
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
