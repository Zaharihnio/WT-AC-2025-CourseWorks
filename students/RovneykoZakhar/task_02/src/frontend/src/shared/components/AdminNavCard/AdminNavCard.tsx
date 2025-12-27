import { Link } from 'react-router-dom'
import './AdminNavCard.css'

export function AdminNavCard() {
  return (
    <div className="adminNavCard">
      <div className="adminNavCard__header">
        <div>
          <h3 className="adminNavCard__title">Админ-панель</h3>
          <p className="adminNavCard__subtitle">
            Быстрые переходы к управлению контентом.
          </p>
        </div>

        <span className="adminNavCard__badge">admin</span>
      </div>

      <div className="adminNavCard__actions">
        <Link to="/admin/cards" className="adminNavCard__link">
          Карточки
        </Link>

        <Link to="/admin/decks" className="adminNavCard__link">
          Колоды
        </Link>
      </div>
    </div>
  )
}
