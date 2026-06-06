/**
 * app/api/auth/signup/route.ts
 *
 * POST /api/auth/signup
 * Registers a new user, returns a JWT in an httpOnly cookie.
 */

import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, generateToken } from '@/lib/auth'
import { getUsersCollection, toSafeUser } from '@/models/User'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password } = body

    // ── Input validation ──────────────────────────────────────────────────
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { message: 'Name must be at least 2 characters.' },
        { status: 400 }
      )
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { message: 'A valid email address is required.' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters.' },
        { status: 400 }
      )
    }

    // ── Check for existing user ──────────────────────────────────────────
    const users = await getUsersCollection()
    const existing = await users.findOne({ email: email.toLowerCase().trim() })

    if (existing) {
      return NextResponse.json(
        { message: 'An account with this email already exists.' },
        { status: 409 }
      )
    }

    // ── Create user ──────────────────────────────────────────────────────
    const passwordHash = await hashPassword(password)
    const newUser = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      createdAt: new Date(),
    }

    const result = await users.insertOne(newUser)
    const createdUser = { ...newUser, _id: result.insertedId }
    const safeUser = toSafeUser(createdUser)

    // ── Issue JWT ────────────────────────────────────────────────────────
    const token = generateToken(safeUser.id)

    const response = NextResponse.json(
      { user: safeUser, token },
      { status: 201 }
    )

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
      path: '/',
    })

    return response
  } catch (error: any) {
    console.error('[POST /api/auth/signup]', error)
    // Handle duplicate key error from MongoDB (race condition)
    if (error?.code === 11000) {
      return NextResponse.json(
        { message: 'An account with this email already exists.' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { message: 'An internal server error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
