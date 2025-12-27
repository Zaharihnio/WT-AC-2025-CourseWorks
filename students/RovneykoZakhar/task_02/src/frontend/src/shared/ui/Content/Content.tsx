import type { ReactNode } from 'react'
import clsx from 'clsx'

import './Content.css'

type ContentProps = {
  children: ReactNode
  className?: string
}

export function Content({ children, className }: ContentProps) {
  return <div className={clsx('content', className)}>{children}</div>
}
