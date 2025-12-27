import { Content } from '@/shared/ui/Content'
import { AdminOnly } from '@/shared/lib/guards/AdminOnly'
import { AdminNavCard } from '@/shared/components/AdminNavCard'
import { UserDecksSection } from './UserDecksSection/'
import { TestsHistoryCta } from './TestsHistoryCta/'

export const HomePage = () => {
  return (
    <Content>
      <AdminOnly>
        <AdminNavCard />
      </AdminOnly>

      <UserDecksSection />

      <TestsHistoryCta />
    </Content>
  )
}
