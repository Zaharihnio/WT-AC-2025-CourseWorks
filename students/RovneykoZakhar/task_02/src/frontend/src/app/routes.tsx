import type { RouteObject } from 'react-router-dom'
// import { Navigate } from 'react-router-dom'

import { AppLayout } from './layouts/AppLayout'
import { AuthLayout } from './layouts/AuthLayout'
import { AdminLayout } from './layouts/AdminLayout/AdminLayout'

import { HomePage } from '@/pages/HomePage/'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { AdminCardsPage } from '@/pages/Admin/AdminCardsPage'
import { DecksCardsPage } from '@/pages/Admin/DecksCardsPage'
import { AdminCreateDeckPage } from '@/pages/Admin/AdminCreateDeckPage/AdminCreateDeckPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { DecksPage } from '@/pages/DecksPage'
import { DeckDetailPage } from '@/pages/DeckDetailPage'
import { DeckPractisePage } from '@/pages/DeckPractisePage'
import { TestsHistoryPage } from '@/pages/TestsHistoryPage'

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },

      { path: 'decks', element: <DecksPage /> },
      { path: 'decks/:id', element: <DeckDetailPage /> },
      { path: 'decks/:id/practise', element: <DeckPractisePage /> },
      { path: 'tests/history', element: <TestsHistoryPage /> },
    ],
  },

  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <AdminLayout />,
    children: [
      { path: '/admin/cards', element: <AdminCardsPage /> },
      { path: '/admin/decks', element: <DecksCardsPage /> },
      { path: '/admin/decks/create', element: <AdminCreateDeckPage /> },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
]
