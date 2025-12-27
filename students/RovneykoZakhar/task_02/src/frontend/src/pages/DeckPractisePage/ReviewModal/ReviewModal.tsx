import { useState } from 'react'
import { Star } from '@/shared/icons/Star'

import './ReviewModal.css'

export function ReviewModal({
  title = 'Оцените деку',
  initialRating = 0,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  title?: string
  initialRating?: number
  pending?: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (rating: number) => void
}) {
  const [rating, setRating] = useState(() => initialRating)
  const [hover, setHover] = useState(0)

  const visual = hover || rating

  return (
    <div
      className="DeckPractiseResultsStep__modalOverlay"
      role="dialog"
      aria-modal="true"
    >
      <div className="DeckPractiseResultsStep__modal">
        <div className="DeckPractiseResultsStep__modalTitle">{title}</div>

        <div
          className="DeckPractiseResultsStep__starsRow"
          aria-label="Выбор рейтинга"
        >
          {Array.from({ length: 5 }).map((_, i) => {
            const v = i + 1
            return (
              <Star
                key={v}
                filled={v <= visual}
                title={`${v} из 5`}
                onMouseEnter={() => setHover(v)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(v)}
              />
            )
          })}
        </div>

        <div className="DeckPractiseResultsStep__modalHint">
          Выбрано: <b>{rating}</b> / 5
        </div>

        {error ? (
          <div className="DeckPractiseResultsStep__modalError">{error}</div>
        ) : null}

        <div className="DeckPractiseResultsStep__modalActions">
          <button
            type="button"
            className="DeckPractiseResultsStep__modalBtn DeckPractiseResultsStep__modalBtn--ghost"
            onClick={onClose}
            disabled={pending}
          >
            Отмена
          </button>

          <button
            type="button"
            className="DeckPractiseResultsStep__modalBtn"
            onClick={() => onSubmit(rating)}
            disabled={pending || rating < 1}
          >
            {pending ? 'Отправляем...' : 'Отправить'}
          </button>
        </div>
      </div>
    </div>
  )
}
