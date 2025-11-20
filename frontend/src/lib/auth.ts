import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from './prisma'
import { verifyPassword } from './encryption'
import { auditLog } from './audit'
import { getConfig } from './env'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const startTime = Date.now()
        const config = getConfig()
        
        if (!credentials?.email || !credentials?.password) {
          await auditLog({
            action: 'auth.login_failed',
            result: 'failure',
            errorMessage: 'Missing credentials',
            metadata: { email: credentials?.email },
            durationMs: Date.now() - startTime,
          })
          throw new Error('Please enter an email and password')
        }

        // Find user with lockout info
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            isActive: true,
            role: true,
            failedLoginAttempts: true,
            lockedUntil: true,
          },
        })

        // Check if account exists and is active
        if (!user || !user.isActive) {
          await auditLog({
            action: 'auth.login_failed',
            result: 'failure',
            errorMessage: 'Invalid credentials',
            metadata: { email: credentials.email },
            durationMs: Date.now() - startTime,
          })
          throw new Error('Invalid email or password')
        }

        // Check if account is locked
        if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
          const minutesRemaining = Math.ceil(
            (new Date(user.lockedUntil).getTime() - Date.now()) / 60000
          )
          await auditLog({
            userId: user.id,
            action: 'auth.login_failed',
            result: 'failure',
            errorMessage: 'Account locked',
            metadata: { email: credentials.email, minutesRemaining },
            durationMs: Date.now() - startTime,
          })
          throw new Error(
            `Account temporarily locked. Please try again in ${minutesRemaining} minute(s).`
          )
        }

        // Verify password
        const isPasswordValid = await verifyPassword(
          credentials.password,
          user.passwordHash
        )

        if (!isPasswordValid) {
          // Increment failed attempts and potentially lock account
          const newFailedAttempts = (user.failedLoginAttempts || 0) + 1
          const shouldLock = newFailedAttempts >= config.MAX_FAILED_LOGIN_ATTEMPTS
          
          await prisma.$executeRaw`
            UPDATE users 
            SET failed_login_attempts = ${newFailedAttempts},
                last_failed_login_at = NOW(),
                locked_until = CASE 
                  WHEN ${shouldLock} THEN NOW() + INTERVAL '${config.ACCOUNT_LOCKOUT_DURATION_MINUTES} minutes'
                  ELSE locked_until
                END
            WHERE id = ${user.id}::uuid
          `

          await auditLog({
            userId: user.id,
            action: shouldLock ? 'auth.account_locked' : 'auth.login_failed',
            result: 'failure',
            errorMessage: 'Invalid password',
            metadata: {
              email: credentials.email,
              failedAttempts: newFailedAttempts,
              locked: shouldLock,
            },
            durationMs: Date.now() - startTime,
          })

          if (shouldLock) {
            throw new Error(
              `Account locked due to too many failed attempts. Please try again in ${config.ACCOUNT_LOCKOUT_DURATION_MINUTES} minutes.`
            )
          }

          throw new Error('Invalid email or password')
        }

        // Successful login - reset failed attempts and update last login
        await prisma.$executeRaw`
          UPDATE users 
          SET last_login_at = NOW(),
              failed_login_attempts = 0,
              locked_until = NULL,
              last_failed_login_at = NULL
          WHERE id = ${user.id}::uuid
        `

        await auditLog({
          userId: user.id,
          action: 'auth.login',
          result: 'success',
          metadata: { email: credentials.email },
          durationMs: Date.now() - startTime,
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name || '',
          role: user.role,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

