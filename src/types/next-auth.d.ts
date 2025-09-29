import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    refreshToken?: string
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      googleId?: string
    }
  }

  interface User {
    googleId?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    googleId?: string
  }
}