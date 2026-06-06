/**
 * lib/mongodb.ts
 *
 * MongoClient singleton for Next.js serverless functions.
 * Fully lazy — the MongoClient is only instantiated on the first connectDB() call,
 * not at module evaluation time. This prevents build failures when MONGODB_URI
 * is not yet configured in .env.local.
 */

import { MongoClient, type Db } from 'mongodb'

// Use a global to preserve the connection across Next.js hot-reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

/**
 * Returns a connected MongoClient.
 * The connection is created lazily on first call and cached globally.
 * If the connection fails, the cache is cleared so the next call retries.
 */
export async function connectDB(): Promise<MongoClient> {
  // Return cached promise if available
  if (global._mongoClientPromise) {
    return global._mongoClientPromise
  }

  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set')
  }

  const client = new MongoClient(uri)
  const promise = client.connect()

  // Cache the promise
  global._mongoClientPromise = promise

  // If connection fails, clear the cache so the next request retries fresh
  promise.catch(() => {
    global._mongoClientPromise = undefined
  })

  return promise
}

/**
 * Returns the MeetMind database instance.
 * Convenience helper used by models and API routes.
 */
export async function getDB(): Promise<Db> {
  const client = await connectDB()
  return client.db('meetmind')
}

