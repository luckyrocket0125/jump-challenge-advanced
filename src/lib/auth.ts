import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { GOOGLE_SCOPES } from './google-oauth'

export const authOptions: NextAuthOptions = {
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authorization: {
          params: {
            scope: GOOGLE_SCOPES.join(' '),
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })
    ] : []),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      if (account && user) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.googleId = account.providerAccountId
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.accessToken = token.accessToken as string
        session.refreshToken = token.refreshToken as string
        session.user.googleId = token.googleId as string
      }
      return session
    },
    async signIn({ user, account, profile }) {
      // Store user data in database if available
      const hasDatabase = process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== ''
      
      if (hasDatabase && user?.email) {
        try {
          const { prisma } = await import('@/lib/prisma')
          
          // Check if user exists
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email }
          })

          // Create user if they don't exist
          if (!existingUser) {
            await prisma.user.create({
              data: {
                email: user.email,
                name: user.name,
                accessToken: account?.access_token,
                refreshToken: account?.refresh_token,
                googleId: account?.providerAccountId,
              }
            })
          } else {
            // Update tokens if user exists
            await prisma.user.update({
              where: { email: user.email },
              data: {
                accessToken: account?.access_token,
                refreshToken: account?.refresh_token,
              }
            })
          }
        } catch (error) {
          console.error('Failed to store user data:', error)
          // Continue with sign in even if database storage fails
        }
      }
      
      return true
    }
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
  },
}