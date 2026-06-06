/**
 * lib/embeddings.ts
 *
 * Singleton wrapper around @huggingface/transformers feature-extraction pipeline.
 * The model downloads once (~23MB for all-MiniLM-L6-v2) and is cached in Node.js
 * process memory across requests in the same serverless container.
 *
 * Model: Xenova/all-MiniLM-L6-v2
 *   - 384-dimensional embeddings
 *   - ~23MB download (very fast cold start)
 *   - Runs entirely in Node.js via ONNX Runtime — no API key, no cost, no rate limits
 *   - Mean pooling + L2 normalization applied automatically with normalize: true
 */

import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers'

// Module-level singleton — persists across requests in the same container
let embeddingPipeline: FeatureExtractionPipeline | null = null
let initPromise: Promise<FeatureExtractionPipeline> | null = null

/**
 * Initialize (or reuse) the embedding pipeline.
 * Thread-safe via promise caching — concurrent calls get the same promise.
 */
async function getEmbeddingPipeline(): Promise<FeatureExtractionPipeline> {
  if (embeddingPipeline) return embeddingPipeline

  // If already initializing, wait for the same promise (avoid double-loading)
  if (initPromise) return initPromise

  initPromise = (async () => {
    console.log('[Embeddings] Loading Xenova/all-MiniLM-L6-v2...')
    const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      // Cache model to default HF cache dir (~/.cache/huggingface)
      // On Vercel, /tmp is writable — use TRANSFORMERS_CACHE env var to point there
    })
    embeddingPipeline = pipe as FeatureExtractionPipeline
    console.log('[Embeddings] Model loaded and ready.')
    return embeddingPipeline
  })()

  return initPromise
}

/**
 * Embed a single string and return a normalized 384-dim float array.
 * Uses mean pooling across all token embeddings.
 */
export async function embedText(text: string): Promise<number[]> {
  const pipe = await getEmbeddingPipeline()

  // Run the model — output is a Tensor of shape [1, seqLen, hiddenSize]
  const output = await pipe(text, { pooling: 'mean', normalize: true })

  // Convert to a plain JS number array
  return Array.from(output.data as Float32Array)
}

/**
 * Calculate cosine similarity between two embedding vectors.
 * Both vectors must be the same length.
 * Returns a value between -1 and 1 (typically 0 to 1 for normalized embeddings).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0

  let dot = 0
  let magA = 0
  let magB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }

  const magnitude = Math.sqrt(magA) * Math.sqrt(magB)
  if (magnitude === 0) return 0
  return dot / magnitude
}
