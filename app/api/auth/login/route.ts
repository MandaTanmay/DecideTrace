/**
 * app/api/auth/login/route.ts
 *
 * POST /api/auth/login
 * Authenticates a user, returns a JWT in an httpOnly cookie.
 */

import { NextRequest, NextResponse } from 'next/server'
import { comparePassword, generateToken } from '@/lib/auth'
import { getUsersCollection, toSafeUser } from '@/models/User'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAuthSuccess, logAuthFailure, getClientIP, getUserAgent } from '@/lib/audit-logger'

export async function POST(request: NextRequest) {
  try {
    // ── Rate Limiting ─────────────────────────────────────────────────────
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1'
    const userAgent = getUserAgent(request)
    
    if (await checkRateLimit(`login_${ip}`, 5, 60 * 1000)) { // 5 attempts per minute
      return NextResponse.json(
        { message: 'Too many login attempts. Please try again in a minute.' },
        { status: 429 }
      )
    }

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

    if (!user) {
      logAuthFailure(email, ip, 'User not found', userAgent)
      return NextResponse.json(
        { message: 'Invalid email or password.' },
        { status: 401 }
      )
    }

    // ── Verify password ───────────────────────────────────────────────────
    const isValid = await comparePassword(password, user.passwordHash)
    if (!isValid) {
      logAuthFailure(email, ip, 'Invalid password', userAgent)
      return NextResponse.json(
        { message: 'Invalid email or password.' },
        { status: 401 }
      )
    }

    // ── Issue JWT ─────────────────────────────────────────────────────────
    const safeUser = toSafeUser(user)
    const token = generateToken(safeUser.id)

    // Log successful authentication
    logAuthSuccess(safeUser.id, ip, userAgent)

    const response = NextResponse.json({ user: safeUser }, { status: 200 })

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
