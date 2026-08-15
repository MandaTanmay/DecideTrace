/**
 * lib/encryption.ts
 *
 * Data encryption utilities for sensitive data at rest.
 * Uses AES-256-GCM encryption for field-level encryption.
 * 
 * Note: For production, consider using MongoDB Client-Side Field Level Encryption
 * or a dedicated key management service (AWS KMS, Azure Key Vault, etc.)
 */

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16 // 128 bits
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const TAG_POSITION = SALT_LENGTH + IV_LENGTH
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH

/**
 * Derive encryption key from password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256')
}

/**
 * Get encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }
  
  // Ensure key is exactly 32 bytes for AES-256
  if (key.length !== 32) {
    // Hash the key to get exactly 32 bytes
    return crypto.createHash('sha256').update(key).digest()
  }
  
  return Buffer.from(key)
}

/**
 * Encrypt sensitive data
 * Returns base64 encoded string with salt, IV, and auth tag
 */
export function encrypt(text: string): string {
  if (!text) return text
  
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const salt = crypto.randomBytes(SALT_LENGTH)
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  // Combine salt + iv + authTag + encrypted
  const combined = Buffer.concat([
    salt,
    iv,
    authTag,
    Buffer.from(encrypted, 'hex')
  ])
  
  return combined.toString('base64')
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return encryptedData
  
  try {
    const key = getEncryptionKey()
    const combined = Buffer.from(encryptedData, 'base64')
    
    const salt = combined.subarray(0, SALT_LENGTH)
    const iv = combined.subarray(SALT_LENGTH, TAG_POSITION)
    const authTag = combined.subarray(TAG_POSITION, ENCRYPTED_POSITION)
    const encrypted = combined.subarray(ENCRYPTED_POSITION)
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    
    return decrypted.toString('utf8')
  } catch (error) {
    console.error('Decryption failed:', error)
    throw new Error('Failed to decrypt data')
  }
}

/**
 * Encrypt object fields recursively
 */
export function encryptFields<T extends Record<string, any>>(
  obj: T,
  fieldsToEncrypt: (keyof T)[]
): T {
  const encrypted = { ...obj }
  
  for (const field of fieldsToEncrypt) {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[field] = encrypt(encrypted[field] as string) as T[typeof field]
    }
  }
  
  return encrypted
}

/**
 * Decrypt object fields recursively
 */
export function decryptFields<T extends Record<string, any>>(
  obj: T,
  fieldsToDecrypt: (keyof T)[]
): T {
  const decrypted = { ...obj }
  
  for (const field of fieldsToDecrypt) {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      try {
        decrypted[field] = decrypt(decrypted[field] as string) as T[typeof field]
      } catch {
        // If decryption fails, keep original value
        // This handles cases where data isn't encrypted
      }
    }
  }
  
  return decrypted
}

/**
 * Hash sensitive data for comparison (one-way)
 * Use for checking if data matches without storing the actual data
 */
export function hashData(data: string): string {
  const key = getEncryptionKey()
  const hmac = crypto.createHmac('sha256', key)
  hmac.update(data)
  return hmac.digest('hex')
}

/**
 * Generate a secure random key for encryption
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex')
}
