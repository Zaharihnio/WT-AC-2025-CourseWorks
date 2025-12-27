import { forwardRef, useId } from 'react'
import './FormField.css'

type Props = {
  label?: string
  error?: string | null
  hint?: string

  className?: string
  labelClassName?: string
  inputClassName?: string

  rightSlot?: React.ReactNode
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'>

export const FormField = forwardRef<HTMLInputElement, Props>(function FormField(
  {
    label,
    error,
    hint,
    id,
    name,
    className,
    labelClassName,
    inputClassName,
    rightSlot,
    ...inputProps
  },
  ref
) {
  const uid = useId()
  const inputId = id ?? `${name ?? 'field'}-${uid}`
  const descrId = `${inputId}-descr`

  const isInvalid = Boolean(error)
  const hasRightSlot = Boolean(rightSlot)

  return (
    <div
      className={[
        'form-field',
        isInvalid ? 'form-field--invalid' : '',
        hasRightSlot ? 'form-field--with-right-slot' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label && (
        <label
          className={['form-field__label', labelClassName ?? '']
            .filter(Boolean)
            .join(' ')}
          htmlFor={inputId}
        >
          {label}
        </label>
      )}

      <div className="form-field__control">
        <input
          ref={ref}
          id={inputId}
          name={name}
          className={['form-field__input', inputClassName ?? '']
            .filter(Boolean)
            .join(' ')}
          aria-invalid={isInvalid}
          aria-describedby={error || hint ? descrId : undefined}
          {...inputProps}
        />

        {rightSlot && <div className="form-field__right-slot">{rightSlot}</div>}
      </div>

      {error ? (
        <p id={descrId} className="form-field__error">
          {error}
        </p>
      ) : hint ? (
        <p id={descrId} className="form-field__hint">
          {hint}
        </p>
      ) : null}
    </div>
  )
})
