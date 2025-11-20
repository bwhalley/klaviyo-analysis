import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/encryption'
import { auditLog } from '@/lib/audit'
import { z } from 'zod'

// Enhanced password validation
const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character')
  .refine(
    (password) => {
      // Check against common passwords
      const commonPasswords = [
        'password123', 'Password123!', 'admin123', 'welcome123',
        'qwerty123', 'letmein123', 'abc123456', '123456789',
      ]
      return !commonPasswords.some(common => 
        password.toLowerCase().includes(common.toLowerCase())
      )
    },
    'Password is too common or weak'
  )

const signupSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  name: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const validatedData = signupSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      await auditLog({
        action: 'auth.signup',
        result: 'failure',
        errorMessage: 'Email already exists',
        metadata: { email: validatedData.email },
        durationMs: Date.now() - startTime,
      })
      
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(validatedData.password)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        passwordHash,
        name: validatedData.name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    })

    await auditLog({
      userId: user.id,
      action: 'auth.signup',
      result: 'success',
      metadata: { email: validatedData.email },
      durationMs: Date.now() - startTime,
    })

    return NextResponse.json(
      {
        success: true,
        user,
        message: 'Account created successfully',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Signup error:', error)

    if (error instanceof z.ZodError) {
      await auditLog({
        action: 'auth.signup',
        result: 'failure',
        errorMessage: 'Validation failed',
        metadata: { errors: error.errors },
        durationMs: Date.now() - startTime,
      })
      
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    await auditLog({
      action: 'auth.signup',
      result: 'error',
      errorMessage: error.message,
      durationMs: Date.now() - startTime,
    })

    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}

