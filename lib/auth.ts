/**
 * lib/auth.ts
 *
 * Authentication helpers:
 *  - Password hashing/comparison via bcryptjs
 *  - JWT generation/verification via jsonwebtoken
 */

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const SALT_ROUNDS = 12

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
 * Returns the payload { userId } on success, or null if invalid/expired.
 */
export function verifyToken(token: string): { userId: string } | null {
  const secret = process.env.JWT_SECRET
  if (!secret) return null
  try {
    const decoded = jwt.verify(token, secret) as JwtPayload
    return { userId: decoded.userId }
  } catch {
    return null
  }
}
