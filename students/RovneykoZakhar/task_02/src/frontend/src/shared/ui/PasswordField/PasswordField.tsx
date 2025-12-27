import { useState } from 'react'
import { FormField } from '@/shared/ui/FormField/FormField'

type Props = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'className'
> & {
  label: string
  error?: string | null
  hint?: string
  className?: string
  labelClassName?: string
  inputClassName?: string
}

export function PasswordField({
  label,
  error,
  hint,
  disabled,
  ...props
}: Props) {
  const [visible, setVisible] = useState(false)

  return (
    <FormField
      label={label}
      error={error}
      hint={hint}
      type={visible ? 'text' : 'password'}
      disabled={disabled}
      rightSlot={
        <button
          type="button"
          className="form-field__icon-btn"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
          aria-pressed={visible}
          disabled={disabled}
        >
          {visible ? 'Скрыть' : 'Показать'}
        </button>
      }
      {...props}
    />
  )
}
