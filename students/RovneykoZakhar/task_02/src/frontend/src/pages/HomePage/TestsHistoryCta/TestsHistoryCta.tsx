import { useNavigate } from 'react-router-dom'
import './TestsHistoryCta.css'

import { Button } from '@/shared/ui/Button'

export function TestsHistoryCta() {
  const navigate = useNavigate()

  return (
    <div className="TestsHistoryCta">
      <div className="TestsHistoryCta__text">
        <div className="TestsHistoryCta__title">История прохождений</div>
        <div className="TestsHistoryCta__desc">
          Посмотри прошлые результаты тестов, прогресс и проценты по декам.
        </div>
      </div>

      <Button onClick={() => navigate('/tests/history')}>Открыть</Button>
    </div>
  )
}
