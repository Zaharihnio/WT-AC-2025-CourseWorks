import './DeckPractiseGameStep.css'
import { FormField } from '@/shared/ui/FormField'

type Props = {
  index: number
  total: number
  front: string
  answer: string
  onAnswerChange: (value: string) => void
  onSubmit: () => void
}

export function DeckPractiseGameStep({
  index,
  total,
  front,
  answer,
  onAnswerChange,
  onSubmit,
}: Props) {
  return (
    <div className="DeckPractiseGameStep">
      <div className="DeckPractiseGameStep__shell">
        <div className="DeckPractiseGameStep__card">
          <div className="DeckPractiseGameStep__content">
            <div className="DeckPractiseGameStep__num">
              Карточка <b>{index + 1}</b> / {total}
            </div>

            <div className="DeckPractiseGameStep__stack">
              <div className="DeckPractiseGameStep__answerBlock">
                <div className="DeckPractiseGameStep__label">Вопрос</div>
                <div className="DeckPractiseGameStep__front">{front}</div>
              </div>

              {/* ✅ оборачиваем ответ в form -> Enter отправит */}
              <form
                className="DeckPractiseGameStep__answerBlock"
                onSubmit={(e) => {
                  e.preventDefault()
                  onSubmit()
                }}
              >
                <div className="DeckPractiseGameStep__label">Ответ</div>
                <div className="DeckPractiseGameStep__inputWrap">
                  <FormField
                    value={answer}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      onAnswerChange(e.target.value)
                    }
                    placeholder="Введи ответ…"
                  />
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
