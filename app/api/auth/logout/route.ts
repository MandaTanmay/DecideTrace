/**
 * app/api/auth/logout/route.ts
 *
 * POST /api/auth/logout
 * Clears the auth_token cookie and returns success.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, revokeToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 })
    }

    // Revoke the token by adding it to the blacklist
    revokeToken(token)

    const response = NextResponse.json({ message: 'Logged out successfully.' }, { status: 200 })
    response.cookies.delete('auth_token')

    return response
  } catch (error) {
    console.error('[POST /api/auth/logout]', error)
    return NextResponse.json(
      { message: 'An internal server error occurred.' },
      { status: 500 }
    )
  }
}
