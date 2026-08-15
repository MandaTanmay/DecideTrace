/**
 * models/User.ts
 *
 * TypeScript interface for the MongoDB users collection document.
 * Also exports a helper to get the typed collection.
 */

import { ObjectId, type Collection } from 'mongodb'
import { getDB } from '@/lib/mongodb'
import { encrypt, decrypt } from '@/lib/encryption'

export interface UserDocument {
  _id?: ObjectId
  name: string
  email: string               // unique index — enforced in MongoDB Atlas
  passwordHash: string
  createdAt: Date
  resetPasswordToken?: string
  resetPasswordExpires?: Date
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
 * Decrypts encrypted fields if present.
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
 * Encrypt sensitive fields before saving to database
 */
export function encryptUserDocument(user: UserDocument): UserDocument {
  const encrypted = { ...user }
  
  // Encrypt reset token if present
  if (encrypted.resetPasswordToken) {
    encrypted.resetPasswordToken = encrypt(encrypted.resetPasswordToken)
  }
  
  return encrypted
}

/**
 * Decrypt sensitive fields after retrieving from database
 */
export function decryptUserDocument(user: UserDocument): UserDocument {
  const decrypted = { ...user }
  
  // Decrypt reset token if present
  if (decrypted.resetPasswordToken) {
    try {
      decrypted.resetPasswordToken = decrypt(decrypted.resetPasswordToken)
    } catch {
      // If decryption fails, keep original (might not be encrypted)
    }
  }
  
  return decrypted
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
