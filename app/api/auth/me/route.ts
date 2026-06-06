/**
 * app/api/auth/me/route.ts
 *
 * GET /api/auth/me
 * Returns the currently authenticated user based on the JWT cookie.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getUsersCollection, toSafeUser } from '@/models/User'
import { ObjectId } from 'mongodb'

export async function GET(request: NextRequest) {
  try {
    // ── Read and verify token ─────────────────────────────────────────────
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 })
    }

    // ── Fetch user from DB ────────────────────────────────────────────────
    const users = await getUsersCollection()
    const user = await users.findOne({ _id: new ObjectId(payload.userId) })

    if (!user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 })
    }

    return NextResponse.json({ user: toSafeUser(user) }, { status: 200 })
  } catch (error) {
    console.error('[GET /api/auth/me]', error)
    return NextResponse.json(
      { message: 'An internal server error occurred.' },
      { status: 500 }
    )
  }
}
