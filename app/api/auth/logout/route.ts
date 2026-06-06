/**
 * app/api/auth/logout/route.ts
 *
 * POST /api/auth/logout
 * Clears the auth_token cookie and returns success.
 */

import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ message: 'Logged out successfully.' }, { status: 200 })

  // Clear the cookie by setting maxAge to 0
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })

  return response
}
