import * as React from 'react'
import clsx from 'clsx'

import './Button.css'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  isSubmitting?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  isSubmitting = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || isSubmitting}
      aria-busy={isSubmitting || undefined}
      className={clsx(
        'btn',
        `btn--${size}`,
        `btn--${variant}`,
        isSubmitting && 'btn--submitting',
        className
      )}
    >
      {children}
    </button>
  )
}
