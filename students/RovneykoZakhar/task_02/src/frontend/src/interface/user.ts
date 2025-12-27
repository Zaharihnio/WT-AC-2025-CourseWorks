export type UserRole = 'user' | 'admin'

export type User = {
  id: number
  email: string
  name: string
  role: UserRole
}
