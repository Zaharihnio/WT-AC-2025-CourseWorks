import './DeckCard.css'

type DeckDto = {
  id: number
  title: string
  description: string
  rating_avg: number | null
  rating_count: number | null
  created_at: string
}

type Props = {
  deck: DeckDto
  onClick?: () => void
  rightSlot?: React.ReactNode
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('ru-RU')
}

export function DeckCard({ deck, onClick }: Props) {
  return (
    <button type="button" className="DecksPage__card" onClick={onClick}>
      <div className="DecksPage__cardTop">
        <div className="DecksPage__cardTitle">{deck.title}</div>
        <div className="DecksPage__cardMeta">
          <span>⭐ {Number(deck.rating_avg ?? 0).toFixed(2)}</span>
          <span>({deck.rating_count ?? 0})</span>
        </div>
      </div>

      {deck.description ? (
        <div className="DecksPage__cardDesc">{deck.description}</div>
      ) : (
        <div className="DecksPage__cardDesc DecksPage__cardDesc--muted">
          Без описания
        </div>
      )}

      <div className="DecksPage__cardBottom">
        <span className="DecksPage__cardId">ID: {deck.id}</span>
        <span className="DecksPage__cardDate">
          {formatDate(deck.created_at)}
        </span>
      </div>
    </button>
  )
}
