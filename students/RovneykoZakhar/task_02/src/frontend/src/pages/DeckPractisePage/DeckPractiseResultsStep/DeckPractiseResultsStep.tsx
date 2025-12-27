import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import './DeckPractiseResultsStep.css'

import { ReviewModal } from '../ReviewModal'
import { envConfig } from '@/config/env'

type PractiseResult = {
  card_id: number
  card_index: number
  front: string
  correct: string
  examples?: string
  answer: string
  is_correct: boolean
}

type Props = {
  deckId?: number | string
  results: PractiseResult[]
  onRestart?: () => void
}

type DeckReviewStatusDto = {
  deck_id: number
  rating_avg: number
  rating_count: number
  user_rating: number | null
}

const TOKEN_KEY = 'token'

function toNumberId(v: number | string | undefined) {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export function DeckPractiseResultsStep({ deckId, results, onRestart }: Props) {
  const total = results.length
  const correctCount = results.filter((r) => r.is_correct).length
  const wrongCount = total - correctCount

  const numericDeckId = useMemo(() => toNumberId(deckId), [deckId])

  const [reviewChecked, setReviewChecked] = useState(false)
  const [existingRating, setExistingRating] = useState<number | null>(null)
  const [reviewCheckError, setReviewCheckError] = useState<string | null>(null)

  const [ratingAvg, setRatingAvg] = useState<number | null>(null)
  const [ratingCount, setRatingCount] = useState<number | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [postPending, setPostPending] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)

  const hasReview = existingRating !== null

  useEffect(() => {
    if (!numericDeckId) return
    if (total === 0) return

    let cancelled = false

    async function loadReview() {
      setReviewChecked(false)
      setReviewCheckError(null)

      try {
        const token = localStorage.getItem(TOKEN_KEY)

        const res = await fetch(
          `${envConfig.API_URL}/reviews/deck/${numericDeckId}`,
          {
            method: 'GET',
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        )

        if (!res.ok) {
          if (!cancelled) {
            const text = await res.text().catch(() => '')
            setReviewCheckError(
              text || `Не удалось проверить отзыв: ${res.status}`
            )
            setReviewChecked(true)
            setExistingRating(null)
            setRatingAvg(null)
            setRatingCount(null)
          }
          return
        }

        const data = (await res
          .json()
          .catch(() => null)) as DeckReviewStatusDto | null

        if (cancelled) return

        const ur = data?.user_rating ?? null
        setExistingRating(typeof ur === 'number' ? ur : null)

        setRatingAvg(
          typeof data?.rating_avg === 'number' ? data.rating_avg : null
        )
        setRatingCount(
          typeof data?.rating_count === 'number' ? data.rating_count : null
        )

        setReviewChecked(true)
      } catch {
        if (!cancelled) {
          setExistingRating(null)
          setRatingAvg(null)
          setRatingCount(null)
          setReviewChecked(true)
          setReviewCheckError('Ошибка сети при проверке отзыва')
        }
      }
    }

    loadReview()
    return () => {
      cancelled = true
    }
  }, [numericDeckId, total])

  async function submitReview(rating: number) {
    if (!numericDeckId) return
    if (rating < 1 || rating > 5) return

    setPostPending(true)
    setPostError(null)

    try {
      const token = localStorage.getItem(TOKEN_KEY)

      const res = await fetch(`${envConfig.API_URL}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          deck_id: numericDeckId,
          rating,
        }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Ошибка запроса: ${res.status}`)
      }

      setExistingRating(rating)
      setModalOpen(false)
    } catch (e: unknown) {
      setPostError(
        e instanceof Error ? e.message : 'Не удалось отправить отзыв'
      )
    } finally {
      setPostPending(false)
    }
  }

  return (
    <>
      <div className="DeckPractiseResultsStep">
        <div className="DeckPractiseResultsStep__header">
          <div className="DeckPractiseResultsStep__title">Результаты</div>

          <div className="DeckPractiseResultsStep__stats">
            <div className="DeckPractiseResultsStep__chip">
              Всего: <b>{total}</b>
            </div>
            <div className="DeckPractiseResultsStep__chip DeckPractiseResultsStep__chip--ok">
              Верных: <b>{correctCount}</b>
            </div>
            <div className="DeckPractiseResultsStep__chip DeckPractiseResultsStep__chip--bad">
              Неверных: <b>{wrongCount}</b>
            </div>
          </div>
        </div>

        {total === 0 ? (
          <div className="DeckPractiseResultsStep__empty">
            Нет результатов — пройди проверку, чтобы увидеть итог.
          </div>
        ) : (
          <div className="DeckPractiseResultsStep__list">
            {results.map((r, i) => {
              const delay = `${i * 260}ms`

              const style = { '--d': delay } as CSSProperties &
                Record<'--d', string>

              return (
                <div
                  key={`${r.card_id}-${r.card_index}`}
                  className={[
                    'DeckPractiseResultsStep__item',
                    r.is_correct
                      ? 'DeckPractiseResultsStep__item--ok'
                      : 'DeckPractiseResultsStep__item--bad',
                  ].join(' ')}
                  style={style}
                >
                  <div className="DeckPractiseResultsStep__inner">
                    <div className="DeckPractiseResultsStep__innerContent">
                      <div className="DeckPractiseResultsStep__topRow">
                        <div className="DeckPractiseResultsStep__idx">
                          #{r.card_index}
                        </div>

                        <div
                          className={[
                            'DeckPractiseResultsStep__badge',
                            r.is_correct
                              ? 'DeckPractiseResultsStep__badge--ok'
                              : 'DeckPractiseResultsStep__badge--bad',
                          ].join(' ')}
                        >
                          {r.is_correct ? '✅ Верно' : '❌ Неверно'}
                        </div>
                      </div>

                      <div className="DeckPractiseResultsStep__block">
                        <div className="DeckPractiseResultsStep__label">
                          Вопрос
                        </div>
                        <div className="DeckPractiseResultsStep__text">
                          {r.front}
                        </div>
                      </div>

                      <div className="DeckPractiseResultsStep__block">
                        <div className="DeckPractiseResultsStep__label">
                          Правильный ответ
                        </div>
                        <div className="DeckPractiseResultsStep__text DeckPractiseResultsStep__text--accent">
                          {r.correct}
                        </div>
                      </div>

                      {r.examples ? (
                        <div className="DeckPractiseResultsStep__examples">
                          <div className="DeckPractiseResultsStep__label">
                            Examples
                          </div>
                          <div className="DeckPractiseResultsStep__examplesText">
                            {r.examples}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {numericDeckId && total > 0 ? (
          <div className="DeckPractiseResultsStep__reviewBar">
            {!reviewChecked ? (
              <div className="DeckPractiseResultsStep__reviewHint">
                Проверяем отзыв...
              </div>
            ) : hasReview ? (
              <div className="DeckPractiseResultsStep__reviewDone">
                Ваш рейтинг: <b>{existingRating}</b>/5
              </div>
            ) : (
              <button
                type="button"
                className="DeckPractiseResultsStep__reviewBtn"
                onClick={() => {
                  setPostError(null)
                  setModalOpen(true)
                }}
              >
                Оцените деку
              </button>
            )}

            {ratingAvg !== null && ratingCount !== null ? (
              <div className="DeckPractiseResultsStep__reviewHint">
                Средняя: <b>{ratingAvg}</b> ({ratingCount})
              </div>
            ) : null}

            {reviewCheckError ? (
              <div className="DeckPractiseResultsStep__reviewError">
                {reviewCheckError}
              </div>
            ) : null}
          </div>
        ) : null}

        {onRestart && (
          <div className="DeckPractiseResultsStep__bottom">
            <button
              className="DeckPractiseResultsStep__restart"
              onClick={onRestart}
            >
              Пройти ещё раз
            </button>
          </div>
        )}
      </div>

      {modalOpen ? (
        <ReviewModal
          initialRating={0}
          pending={postPending}
          error={postError}
          onClose={() => setModalOpen(false)}
          onSubmit={submitReview}
        />
      ) : null}
    </>
  )
}
