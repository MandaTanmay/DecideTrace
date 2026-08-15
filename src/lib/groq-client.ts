/**
 * src/lib/groq-client.ts
 *
 * Shared Groq client factory with automatic model fallback.
 * If the primary model hits a rate limit (429), retries with fallback models.
 *
 * Fallback chain:
 *   1. llama-3.3-70b-versatile  (best quality, 100k TPD)
 *   2. llama3-8b-8192            (fast, separate quota)
 *   3. gemma2-9b-it              (last resort, separate quota)
 */

import { ChatGroq } from '@langchain/groq'
import { BaseMessage } from '@langchain/core/messages'

const MODEL_FALLBACK_CHAIN = [
  'llama-3.3-70b-versatile',
  'llama3-8b-8192',
  'gemma2-9b-it',
]

function createGroqClient(model: string, maxTokens = 2048) {
  return new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model,
    temperature: 0.1,
    maxTokens,
  })
}

function isRateLimitError(error: any): boolean {
  return (
    error?.status === 429 ||
    error?.error?.error?.code === 'rate_limit_exceeded' ||
    String(error?.message ?? '').includes('rate_limit_exceeded') ||
    String(error?.message ?? '').includes('Rate limit')
  )
}

/**
 * Invoke Groq with automatic fallback on rate limit errors.
 * Tries each model in the fallback chain until one succeeds.
 */
export async function invokeGroqWithFallback(
  messages: BaseMessage[],
  maxTokens = 2048
): Promise<string> {
  let lastError: any

  for (const model of MODEL_FALLBACK_CHAIN) {
    try {
      if (model !== MODEL_FALLBACK_CHAIN[0]) {
        console.warn(`[Groq] Falling back to model: ${model}`)
      }
      const client = createGroqClient(model, maxTokens)
      const response = await client.invoke(messages)
      const text = typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content)
      return text
    } catch (error: any) {
      lastError = error
      if (isRateLimitError(error)) {
        console.warn(`[Groq] Rate limit hit on model "${model}". Trying next fallback...`)
        continue
      }
      // Non-rate-limit error — re-throw immediately
      throw error
    }
  }

  // All models exhausted
  throw new Error(
    `All Groq models exhausted. Last error: ${lastError?.message ?? String(lastError)}`
  )
}
