import { useEffect, useMemo, useState, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import './DeckPractisePage.css'

import { envConfig } from '@/config/env'
import { Content } from '@/shared/ui/Content'
import { ErrorBlock } from '@/shared/ui/ErrorBlock'
import { Button } from '@/shared/ui/Button'

import { DeckPractiseGameStep } from './DeckPractiseGameStep'
import { DeckPractiseResultsStep } from './DeckPractiseResultsStep'

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

type PractiseResult = {
  card_id: number
  card_index: number
  front: string
  correct: string
  answer: string
  is_correct: boolean
  examples?: string
}

type LocationState = { deck?: DeckDetailDto }

const TOKEN_KEY = 'token'

function isAbortError(e: unknown): boolean {
  return e instanceof Error && e.name === 'AbortError'
}

type Step = 'intro' | 'game' | 'results'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function DeckPractisePage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const deckId = useMemo(() => Number(id), [id])

  const location = useLocation()
  const state = location.state as LocationState | null

  const [deck, setDeck] = useState<DeckDetailDto | null>(state?.deck ?? null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [step, setStep] = useState<Step>('intro')

  const [currentIndex, setCurrentIndex] = useState(0)
  const [order, setOrder] = useState<number[]>([])
  const [answer, setAnswer] = useState('')

  const [results, setResults] = useState<PractiseResult[]>([])

  const userDecksLoaded = useUserDecksStore((s) => s.loaded)
  const userDecksLoading = useUserDecksStore((s) => s.loading)
  const userDecksError = useUserDecksStore((s) => s.error)
  const loadUserDecks = useUserDecksStore((s) => s.load)

  const isInUserDecks = useUserDecksStore((s) =>
    Number.isFinite(deckId) ? s.has(deckId) : false
  )

  const testPostedRef = useRef(false)
  // const [testPending, setTestPending] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)

  function normalize(s: string) {
    return s.trim().toLowerCase().replace(/\s+/g, ' ')
  }

  function submitAnswer() {
    if (!deck?.cards?.length) return

    const cardIndex = order.length ? order[currentIndex] : currentIndex
    const card = deck.cards[cardIndex]

    const userAnswer = answer

    if (!normalize(userAnswer)) return

    const isCorrect = normalize(userAnswer) === normalize(card.back)

    const item: PractiseResult = {
      card_id: card.id,
      card_index: currentIndex + 1,
      front: card.front,
      correct: card.back,
      answer: userAnswer,
      is_correct: isCorrect,
      examples: card.examples,
    }

    const isLast = currentIndex + 1 >= deck.cards.length

    setResults((prev) => {
      const nextResults = [...prev, item]

      if (isLast) {
        console.log('=== PRACTISE RESULTS ===')
        console.table(nextResults)

        const ok = nextResults.filter((r) => r.is_correct).length
        console.log(`Правильных: ${ok}/${nextResults.length}`)
      }

      return nextResults
    })

    if (isLast) {
      setStep('results')
      return
    }

    setCurrentIndex((i) => i + 1)
    setAnswer('')
  }

  useEffect(() => {
    if (!userDecksLoaded && !userDecksLoading) void loadUserDecks()
  }, [userDecksLoaded, userDecksLoading, loadUserDecks])

  useEffect(() => {
    if (deck) return
    if (!Number.isFinite(deckId)) {
      setError('Некорректный id деки')
      return
    }

    const ac = new AbortController()

    async function load() {
      setPending(true)
      setError(null)

      try {
        const token = localStorage.getItem(TOKEN_KEY)

        const res = await fetch(`${envConfig.API_URL}/decks/${deckId}`, {
          method: 'GET',
          signal: ac.signal,
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })

        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(text || `Ошибка запроса: ${res.status}`)
        }

        const data = (await res.json()) as DeckDetailDto
        setDeck(data)
      } catch (e: unknown) {
        if (isAbortError(e)) return
        setError(e instanceof Error ? e.message : 'Неизвестная ошибка')
      } finally {
        setPending(false)
      }
    }

    void load()
    return () => ac.abort()
  }, [deck, deckId])

  useEffect(() => {
    if (step !== 'results') return
    if (!deck) return
    if (!Number.isFinite(deckId)) return

    if (results.length !== deck.cards.length) return

    if (!userDecksLoaded) return

    if (userDecksError) {
      setTestError(userDecksError)
      return
    }

    if (!isInUserDecks) {
      // setTestError(
      //   'Сначала добавь деку себе (в коллекцию), чтобы сохранить результат.'
      // )
      return
    }

    if (testPostedRef.current) return
    testPostedRef.current = true

    const total = deck.cards.length
    const score = results.filter((r) => r.is_correct).length

    const ac = new AbortController()

    async function postTest() {
      setTestError(null)

      try {
        const token = localStorage.getItem(TOKEN_KEY)

        const res = await fetch(`${envConfig.API_URL}/tests`, {
          method: 'POST',
          signal: ac.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            deck_id: deckId,
            total,
            score,
          }),
        })

        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(text || `Ошибка запроса: ${res.status}`)
        }
      } catch (e: unknown) {
        if (isAbortError(e)) return
        setTestError(e instanceof Error ? e.message : 'Неизвестная ошибка')
        // testPostedRef.current = false
      }
    }

    void postTest()
    return () => ac.abort()
  }, [
    step,
    deck,
    results,
    deckId,
    userDecksLoaded,
    userDecksError,
    isInUserDecks,
  ])

  const cardsCount = deck?.cards?.length ?? 0

  const currentCardIndex = order.length ? order[currentIndex] : currentIndex
  const currentCard = deck?.cards[currentCardIndex]

  return (
    <Content>
      <div className="DeckPractisePage">
        <div className="DeckPractisePage__top">
          <Button
            className="DeckPractisePage__back"
            onClick={() => navigate(deck ? `/decks/${deck.id}` : '/decks')}
          >
            ← Назад
          </Button>
        </div>

        {error && (
          <div className="DeckPractisePage__error">
            <ErrorBlock>{error}</ErrorBlock>
          </div>
        )}

        {testError && (
          <div className="DeckPractisePage__error">
            <ErrorBlock>{testError}</ErrorBlock>
          </div>
        )}

        {pending && (
          <div className="DeckPractisePage__loading">Загрузка...</div>
        )}

        {!pending && !error && deck && (
          <>
            {step === 'intro' && (
              <div className="DeckPractisePage__intro">
                <div className="DeckPractisePage__deckHeader">
                  <div className="DeckPractisePage__deckName">{deck.title}</div>

                  <div className="DeckPractisePage__deckMeta">
                    <span className="DeckPractisePage__deckMetaItem">
                      Карточек: <b>{cardsCount}</b>
                    </span>

                    <span className="DeckPractisePage__metaDot">•</span>

                    <span className="DeckPractisePage__deckMetaItem">
                      ID: <b>{deck.id}</b>
                    </span>
                  </div>
                </div>

                <div className="DeckPractisePage__rulesCard">
                  <h1 className="DeckPractisePage__rulesTitle">
                    Проверка знания
                  </h1>

                  <div className="DeckPractisePage__rulesText">
                    <p className="DeckPractisePage__text">
                      Тебе будет показываться карточка. Введи ответ в поле ввода
                      и проверь себя.
                    </p>

                    <ul className="DeckPractisePage__list">
                      <li>Показываем задание (front).</li>
                      <li>Ты вводишь ответ.</li>
                      <li>Сравниваем с правильным (back).</li>
                      <li>В конце покажем результаты.</li>
                    </ul>

                    <p className="DeckPractisePage__muted">
                      Нажми «Начать», когда будешь готов.
                    </p>
                  </div>

                  <div className="DeckPractisePage__actions">
                    <Button
                      size="lg"
                      variant="primary"
                      onClick={() => {
                        if (!deck?.cards?.length) return

                        const indices = deck.cards.map((_, i) => i)
                        setOrder(shuffle(indices))

                        testPostedRef.current = false
                        setTestError(null)

                        setResults([])
                        setCurrentIndex(0)
                        setAnswer('')
                        setStep('game')
                      }}
                      disabled={cardsCount === 0}
                    >
                      Начать
                    </Button>

                    {cardsCount === 0 && (
                      <div className="DeckPractisePage__hint">
                        В этой деке нет карточек — играть пока не во что.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 'game' && deck && (
              <>
                {deck.cards?.length ? (
                  <DeckPractiseGameStep
                    key={currentIndex}
                    index={currentIndex}
                    total={deck.cards.length}
                    front={currentCard?.front ?? ''}
                    answer={answer}
                    onAnswerChange={setAnswer}
                    onSubmit={submitAnswer}
                  />
                ) : (
                  <div className="DeckPractisePage__placeholder">
                    В этой деке нет карточек.
                  </div>
                )}

                <div className="DeckPractisePage__gameBottom">
                  <button
                    className="DeckPractisePage__gameBack"
                    onClick={() => setStep('intro')}
                  >
                    ← К правилам
                  </button>

                  <button
                    className="DeckPractisePage__gameNext"
                    onClick={submitAnswer}
                    disabled={!deck.cards?.length || !answer.trim()}
                  >
                    {currentIndex + 1 >= deck.cards.length
                      ? 'Завершить →'
                      : 'Ответить →'}
                  </button>
                </div>
              </>
            )}

            {step === 'results' && (
              <DeckPractiseResultsStep
                deckId={deckId}
                results={results}
                onRestart={() => {
                  testPostedRef.current = false
                  setTestError(null)
                  setStep('intro')
                }}
              />
            )}
          </>
        )}
      </div>
    </Content>
  )
}
