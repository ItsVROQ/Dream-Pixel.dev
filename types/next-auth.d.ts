import 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    email: string
    name?: string | null
    tier: string
  }

  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      tier: string
    }
  }

  interface JWT {
    sub: string
    email: string
    name?: string | null
    tier: string
  }
}