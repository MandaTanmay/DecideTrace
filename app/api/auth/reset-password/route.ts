/**
 * app/api/auth/reset-password/route.ts
 *
 * POST /api/auth/reset-password
 * Resets a user's password given a valid reset token.
 */

import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'
import { getUsersCollection } from '@/models/User'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // ── Rate Limiting ─────────────────────────────────────────────────────
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1'
    if (checkRateLimit(`reset_${ip}`, 5, 60 * 1000)) {
      return NextResponse.json(
        { message: 'Too many reset attempts. Please try again in a minute.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { token, newPassword } = body

    // ── Input Validation ──────────────────────────────────────────────────
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { message: 'Reset token is required.' },
        { status: 400 }
      )
    }

    const hasUpperCase = /[A-Z]/.test(newPassword || '')
    const hasNumber = /[0-9]/.test(newPassword || '')
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword || '')

    if (
      !newPassword ||
      typeof newPassword !== 'string' ||
      newPassword.length < 8 ||
      !hasUpperCase ||
      !hasNumber ||
      !hasSpecialChar
    ) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters and include an uppercase letter, a number, and a special character.' },
        { status: 400 }
      )
    }

    // ── Find User by Token and Check Expiration ───────────────────────────
    const users = await getUsersCollection()
    const user = await users.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    })

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid or expired password reset token.' },
        { status: 400 }
      )
    }

    // ── Hash New Password & Clear Reset Token Fields ─────────────────────
    const newPasswordHash = await hashPassword(newPassword)

    await users.updateOne(
      { _id: user._id },
      {
        $set: { passwordHash: newPasswordHash },
        $unset: { resetPasswordToken: '', resetPasswordExpires: '' },
      }
    )

    return NextResponse.json(
      { message: 'Password has been reset successfully. You may now login.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('[POST /api/auth/reset-password]', error)
    return NextResponse.json(
      { message: 'An internal server error occurred.' },
      { status: 500 }
    )
  }
}
