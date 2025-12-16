import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from './password'
import { checkRateLimit, isAccountLocked, incrementFailedLogin, resetFailedLogin } from './rateLimit'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user.passwordHash) {
          throw new Error('Invalid credentials')
        }

        // Check if account is locked
        const lockStatus = await isAccountLocked(user.id)
        if (lockStatus.locked) {
          throw new Error(`Account locked until ${new Date(lockStatus.until!).toLocaleString()}`)
        }

        const isValidPassword = await verifyPassword(credentials.password, user.passwordHash)

        if (!isValidPassword) {
          const attempts = await incrementFailedLogin(user.id)
          
          if (attempts >= 5) {
            await lockAccount(user.id)
            throw new Error('Account locked due to too many failed attempts. Please try again in 15 minutes.')
          }
          
          throw new Error(`Invalid credentials. ${5 - attempts} attempts remaining.`)
        }

        // Reset failed attempts on successful login
        await resetFailedLogin(user.id)

        if (!user.emailVerified) {
          throw new Error('Please verify your email address before signing in')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tier: user.tier,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.tier = user.tier
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
        session.user.tier = token.tier as string
      }
      return session
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' || account?.provider === 'github') {
        // Handle OAuth sign in
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! }
        })

        if (!existingUser) {
          // Create new user for OAuth
          await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name,
              profilePictureUrl: user.image,
              emailVerified: new Date(),
              tier: 'FREE',
            }
          })
        } else if (!existingUser.emailVerified) {
          // Verify email for existing user
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { emailVerified: new Date() }
          })
        }
      }
      return true
    }
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      if (isNewUser && (account?.provider === 'google' || account?.provider === 'github')) {
        // Send welcome email for OAuth sign ups
        // This would be implemented with the email service
        console.log(`New OAuth user signed in: ${user.email}`)
      }
    }
  }
}