/**
 * app/api/auth/login/route.ts
 *
 * POST /api/auth/login
 * Authenticates a user, returns a JWT in an httpOnly cookie.
 */

import { NextRequest, NextResponse } from 'next/server'
import { comparePassword, generateToken } from '@/lib/auth'
import { getUsersCollection, toSafeUser } from '@/models/User'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // ── Input validation ──────────────────────────────────────────────────
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { message: 'Email is required.' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { message: 'Password is required.' },
        { status: 400 }
      )
    }

    // ── Find user ─────────────────────────────────────────────────────────
    const users = await getUsersCollection()
    const user = await users.findOne({ email: email.toLowerCase().trim() })

    // Use the same error message for both "user not found" and "wrong password"
    // to avoid leaking whether an email is registered
    if (!user) {
      return NextResponse.json(
        { message: 'Invalid email or password.' },
        { status: 401 }
      )
    }

    // ── Verify password ───────────────────────────────────────────────────
    const isValid = await comparePassword(password, user.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { message: 'Invalid email or password.' },
        { status: 401 }
      )
    }

    // ── Issue JWT ─────────────────────────────────────────────────────────
    const safeUser = toSafeUser(user)
    const token = generateToken(safeUser.id)

    const response = NextResponse.json({ user: safeUser, token }, { status: 200 })

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[POST /api/auth/login]', error)
    return NextResponse.json(
      { message: 'An internal server error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
