import type { ReactNode } from 'react'

import './ErrorBlock.css'

interface IErrorBlockProps {
  children: ReactNode
}

export const ErrorBlock = ({ children }: IErrorBlockProps) => {
  return <div className="error">{children}</div>
}
