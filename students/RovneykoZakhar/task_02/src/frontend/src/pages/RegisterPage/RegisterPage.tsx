import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './RegisterPage.css'

import { Button } from '@/shared/ui/Button/Button'
import { FormField } from '@/shared/ui/FormField/FormField'
import { PasswordField } from '@/shared/ui/PasswordField/PasswordField'
import { ErrorBlock } from '@/shared/ui/ErrorBlock'

import { envConfig } from '@/config/env'
import { useAuthStore } from '@/shared/stores/authStore'

import type { User } from '@/interface/user'

type RegisterResponse = {
  token?: string
  detail?: string
  user_data?: User
}

export function RegisterPage() {
  const setUser = useAuthStore((s) => s.setUser)

  const [pending, setPending] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const location = useLocation() as { state?: { from?: string } }
  const redirectTo = location.state?.from ?? '/'

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const form = e.currentTarget
    if (!form.checkValidity()) {
      form.reportValidity()
      return
    }

    setPending(true)
    setServerError(null)

    const fd = new FormData(form)
    const payload = {
      email: String(fd.get('email') ?? ''),
      name: String(fd.get('name') ?? ''),
      password: String(fd.get('password') ?? ''),
      role: 'user',
    }

    try {
      const res = await fetch(`${envConfig.API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const json: RegisterResponse = await res.json()

      if (!res.ok) {
        throw new Error(json.detail)
      }

      if (json.token) {
        localStorage.setItem('token', json.token)
      }

      if (json.user_data) {
        const user = {
          id: json.user_data.id,
          email: json.user_data.email,
          name: json.user_data.name,
          role: json.user_data.role,
        } as const

        setUser(user)
      }

      return
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Register failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="register">
      <h1 className="register__title">Регистрация</h1>
      <p className="register__subtitle">Создай аккаунт и начни учить слова.</p>

      <form className="register__form" onSubmit={onSubmit}>
        <FormField
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />

        <FormField
          label="Имя"
          name="name"
          type="text"
          required
          minLength={2}
          autoComplete="name"
          placeholder="Иван"
        />

        <PasswordField
          label="Пароль"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="••••••••"
        />

        {serverError && <ErrorBlock>{serverError}</ErrorBlock>}

        <div className="register__actions">
          <Button type="submit" disabled={pending}>
            {pending ? 'Создаём...' : 'Создать аккаунт'}
          </Button>
        </div>

        <div className="register__alt">
          <span className="register__alt-text">Уже есть аккаунт?</span>
          <Link
            className="register__alt-link"
            to="/login"
            state={{ from: redirectTo }}
          >
            Войти
          </Link>
        </div>
      </form>
    </div>
  )
}
