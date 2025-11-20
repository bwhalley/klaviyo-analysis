import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/encryption'
import { z } from 'zod'
import { KlaviyoService } from '@/services/klaviyo.service'

// GET /api/user/profile - Get user profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        timezone: true,
        defaultCohortPeriod: true,
        klaviyoApiKeyEncrypted: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        hasKlaviyoKey: !!user.klaviyoApiKeyEncrypted,
        klaviyoApiKeyEncrypted: undefined, // Don't send encrypted key
      },
    })
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

const updateProfileSchema = z.object({
  name: z.string().optional(),
  timezone: z.string().optional(),
  defaultCohortPeriod: z.enum(['day', 'week', 'month']).optional(),
  klaviyoApiKey: z.string().optional(),
})

// PATCH /api/user/profile - Update user profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateProfileSchema.parse(body)

    const updateData: any = {}

    if (validatedData.name) updateData.name = validatedData.name
    if (validatedData.timezone) updateData.timezone = validatedData.timezone
    if (validatedData.defaultCohortPeriod)
      updateData.defaultCohortPeriod = validatedData.defaultCohortPeriod

    // Handle Klaviyo API key
    if (validatedData.klaviyoApiKey) {
      // Basic validation: check format
      if (!validatedData.klaviyoApiKey.startsWith('pk_') && 
          !validatedData.klaviyoApiKey.startsWith('priv_')) {
        return NextResponse.json(
          { error: 'Invalid Klaviyo API key format. Key should start with "pk_" or "priv_"' },
          { status: 400 }
        )
      }

      // TODO: Validate the API key with Klaviyo (requires fixing Node.js fetch in Alpine)
      // For now, we trust the user to provide a valid key
      // They'll get errors when trying to run analyses if the key is invalid

      // Encrypt and store
      updateData.klaviyoApiKeyEncrypted = encrypt(validatedData.klaviyoApiKey)
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        timezone: true,
        defaultCohortPeriod: true,
        klaviyoApiKeyEncrypted: true,
      },
    })

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        hasKlaviyoKey: !!user.klaviyoApiKeyEncrypted,
        klaviyoApiKeyEncrypted: undefined,
      },
      message: 'Profile updated successfully',
    })
  } catch (error: any) {
    console.error('Update profile error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}

