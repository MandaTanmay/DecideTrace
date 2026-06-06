/**
 * middleware.ts
 *
 * Next.js Edge Middleware for route protection.
 *
 * Protected routes:
 *  - /dashboard/**   → redirect to /login if no valid auth cookie
 *  - /api/analyses/* → return 401 JSON if no valid auth cookie
 *
 * Public routes (no auth required):
 *  - /api/auth/**    → always allowed
 *  - /               → landing page, always allowed
 *  - /login, /signup → always allowed
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

// Convert JWT_SECRET to a Uint8Array for jose (Edge runtime compatible)
// Note: jsonwebtoken is Node.js-only; jose works in the Edge runtime used by middleware
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not set')
  return new TextEncoder().encode(secret)
}

async function verifyTokenEdge(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getJwtSecret())
    return true
  } catch {
    return false
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Allow /api/auth/** without any authentication ─────────────────────
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // ── Protect /api/analyses/** routes ───────────────────────────────────
  if (pathname.startsWith('/api/analyses')) {
    const token = request.cookies.get('auth_token')?.value

    if (!token || !(await verifyTokenEdge(token))) {
      return NextResponse.json(
        { message: 'Authentication required.' },
        { status: 401 }
      )
    }

    return NextResponse.next()
  }

  // ── Protect /dashboard/** routes ──────────────────────────────────────
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('auth_token')?.value

    if (!token || !(await verifyTokenEdge(token))) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
  }

  // All other routes pass through
  return NextResponse.next()
}

export const config = {
  // Match all routes except Next.js internals and static files
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
