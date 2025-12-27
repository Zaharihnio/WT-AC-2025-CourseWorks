import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './LoginPage.css'

import { Button } from '@/shared/ui/Button/Button'
import { FormField } from '@/shared/ui/FormField/FormField'
import { PasswordField } from '@/shared/ui/PasswordField'
import { ErrorBlock } from '@/shared/ui/ErrorBlock'
import { useAuthStore } from '@/shared/stores/authStore'

import { envConfig } from '@/config/env'

import type { User } from '@/interface/user'

type LoginResponse = {
  token?: string
  detail?: string
  user_data?: User
}

export function LoginPage() {
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
      password: String(fd.get('password') ?? ''),
    }

    try {
      const res = await fetch(`${envConfig.API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const json: LoginResponse = await res.json()

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
      setServerError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="login">
      <h1 className="login__title">Вход</h1>
      <p className="login__subtitle">
        Продолжай учить слова без потерь прогресса.
      </p>

      <form className="login__form" onSubmit={onSubmit}>
        <FormField
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />

        <PasswordField
          label="Пароль"
          name="password"
          required
          minLength={6}
          autoComplete="current-password"
          placeholder="••••••••"
        />

        {serverError && <ErrorBlock>{serverError}</ErrorBlock>}

        <div className="login__actions">
          <Button type="submit" disabled={pending}>
            {pending ? 'Входим...' : 'Войти'}
          </Button>
        </div>

        <div className="login__alt">
          <span className="login__alt-text">Нет аккаунта?</span>
          <Link
            className="login__alt-link"
            to="/register"
            state={{ from: redirectTo }}
          >
            Зарегистрироваться
          </Link>
        </div>
      </form>
    </div>
  )
}
