/**
 * app/api/auth/forgot-password/route.ts
 *
 * POST /api/auth/forgot-password
 * Generates a password reset token for the specified user email.
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getUsersCollection } from '@/models/User'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // ── Rate Limiting ─────────────────────────────────────────────────────
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1'
    if (await checkRateLimit(`forgot_${ip}`, 5, 60 * 1000)) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again in a minute.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { email } = body

    // ── Input validation ──────────────────────────────────────────────────
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { message: 'A valid email address is required.' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    const users = await getUsersCollection()
    const user = await users.findOne({ email: normalizedEmail })

    // Generic response message to prevent email enumeration
    const genericSuccessMessage = 'If an account exists with this email address, a password reset link has been generated.'

    if (!user) {
      return NextResponse.json({ message: genericSuccessMessage }, { status: 200 })
    }

    // ── Generate Token (1 Hour Expiration) ───────────────────────────────
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          resetPasswordToken: resetToken,
          resetPasswordExpires: resetExpires,
        },
      }
    )

    const origin = request.headers.get('origin') || request.nextUrl.origin || 'http://localhost:3000'
    const resetUrl = `${origin}/reset-password?token=${resetToken}`

    console.log(`[Forgot Password] Reset URL for ${normalizedEmail}: ${resetUrl}`)

    return NextResponse.json(
      { 
        message: genericSuccessMessage,
        devResetUrl: resetUrl
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[POST /api/auth/forgot-password]', error)
    return NextResponse.json(
      { message: 'An internal server error occurred.' },
      { status: 500 }
    )
  }
}
