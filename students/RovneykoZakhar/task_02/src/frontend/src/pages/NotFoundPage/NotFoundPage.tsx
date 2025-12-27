import { useNavigate } from 'react-router-dom'
import './NotFoundPage.css'

import { Content } from '@/shared/ui/Content'
import { Button } from '@/shared/ui/Button/Button'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <Content>
      <div className="notfound">
        <div className="notfound__card">
          <div className="notfound__code">404</div>
          <h1 className="notfound__title">Страница не найдена</h1>
          <p className="notfound__text">
            Похоже, вы перешли по неверной ссылке или страница была удалена.
          </p>

          <div className="notfound__actions">
            <Button onClick={() => navigate('/')}>На главную</Button>
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Назад
            </Button>
          </div>
        </div>
      </div>
    </Content>
  )
}
