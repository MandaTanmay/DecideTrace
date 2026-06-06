/**
 * models/User.ts
 *
 * TypeScript interface for the MongoDB users collection document.
 * Also exports a helper to get the typed collection.
 */

import { ObjectId, type Collection } from 'mongodb'
import { getDB } from '@/lib/mongodb'

export interface UserDocument {
  _id?: ObjectId
  name: string
  email: string               // unique index — enforced in MongoDB Atlas
  passwordHash: string
  createdAt: Date
}

/**
 * Serializable user object safe to send to the client (no passwordHash).
 */
export interface SafeUser {
  id: string
  name: string
  email: string
  createdAt: string
}

/**
 * Convert a MongoDB UserDocument to a client-safe object.
 */
export function toSafeUser(user: UserDocument): SafeUser {
  return {
    id: user._id!.toHexString(),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  }
}

/**
 * Returns the typed MongoDB collection for users.
 * Creates a unique index on email on first call (idempotent).
 */
export async function getUsersCollection(): Promise<Collection<UserDocument>> {
  const db = await getDB()
  const collection = db.collection<UserDocument>('users')

  // Ensure unique index exists (no-op if already created)
  await collection.createIndex({ email: 1 }, { unique: true })

  return collection
}
