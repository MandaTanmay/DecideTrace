/**
 * lib/auth.ts
 *
 * Authentication helpers:
 *  - Password hashing/comparison via bcryptjs
 *  - JWT generation/verification via jsonwebtoken
 *  - Token revocation/blacklist support
 */

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const SALT_ROUNDS = 12

// ---------------------------------------------------------------------------
// Token blacklist (in-memory for development, use Redis in production)
// ---------------------------------------------------------------------------

interface BlacklistedToken {
  token: string
  expiresAt: number
}

declare global {
  // eslint-disable-next-line no-var
  var _tokenBlacklist: Map<string, number> | undefined
}

const tokenBlacklist = global._tokenBlacklist || new Map<string, number>()
if (process.env.NODE_ENV !== 'production') {
  global._tokenBlacklist = tokenBlacklist
}

/**
 * Add a token to the blacklist
 */
export function blacklistToken(token: string, expiresAt: number): void {
  tokenBlacklist.set(token, expiresAt)
}

/**
 * Check if a token is blacklisted
 */
export function isTokenBlacklisted(token: string): boolean {
  const expiresAt = tokenBlacklist.get(token)
  if (!expiresAt) return false

  // Remove expired tokens from blacklist
  if (Date.now() > expiresAt) {
    tokenBlacklist.delete(token)
    return false
  }

  return true
}

/**
 * Clean up expired tokens from blacklist
 */
function cleanupExpiredTokens(): void {
  const now = Date.now()
  for (const [token, expiresAt] of tokenBlacklist.entries()) {
    if (now > expiresAt) {
      tokenBlacklist.delete(token)
    }
  }
}

// Run cleanup periodically (every hour)
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredTokens, 60 * 60 * 1000)
}

// ---------------------------------------------------------------------------
// Password helpers
// ---------------------------------------------------------------------------

/**
 * Hash a plain-text password using bcrypt with 12 salt rounds.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Compare a plain-text password against a stored bcrypt hash.
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------

interface JwtPayload {
  userId: string
  iat?: number
  exp?: number
}

/**
 * Generate a signed JWT containing the userId.
 * Token expires in 7 days.
 */
export function generateToken(userId: string): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET environment variable is not set')
  return jwt.sign({ userId }, secret, { expiresIn: '7d' })
}

/**
 * Verify and decode a JWT.
 * Returns the payload { userId } on success, or null if invalid/expired/blacklisted.
 */
export function verifyToken(token: string): { userId: string } | null {
  const secret = process.env.JWT_SECRET
  if (!secret) return null

  // Check if token is blacklisted
  if (isTokenBlacklisted(token)) {
    return null
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload
    return { userId: decoded.userId }
  } catch {
    return null
  }
}

/**
 * Revoke a token by adding it to the blacklist
 */
export function revokeToken(token: string): void {
  try {
    const secret = process.env.JWT_SECRET
    if (!secret) return

    const decoded = jwt.verify(token, secret) as JwtPayload
    const expiresAt = decoded.exp ? decoded.exp * 1000 : Date.now() + 7 * 24 * 60 * 60 * 1000
    blacklistToken(token, expiresAt)
  } catch {
    // Token is invalid, no need to blacklist
  }
}
