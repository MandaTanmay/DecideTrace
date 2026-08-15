/**
 * lib/embeddings.ts
 *
 * Robust embedding pipeline for MeetMind.
 * Primary: @huggingface/transformers (Xenova/all-MiniLM-L6-v2) 384-dim embeddings.
 * Fallback: Deterministic 384-dim n-gram feature vector generator if native ONNX/transformers
 * fails to load in serverless environments (e.g. Vercel Lambda).
 */

let embeddingPipeline: any = null
let initPromise: Promise<any> | null = null
let useFallbackMode = false

/**
 * Deterministic fallback 384-dim vector generator.
 * Uses Murmur/hash distribution over word n-grams to produce normalized embeddings.
 */
function generateFallbackEmbedding(text: string): number[] {
  const VECTOR_DIM = 384
  const vector = new Float32Array(VECTOR_DIM)
  const cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
  const words = cleaned.split(/\s+/).filter(w => w.length > 0)

  if (words.length === 0) {
    return Array.from(vector)
  }

  // Generate word unigrams, bigrams, and trigrams
  const tokens: string[] = [...words]
  for (let i = 0; i < words.length - 1; i++) {
    tokens.push(`${words[i]}_${words[i + 1]}`)
  }
  for (let i = 0; i < words.length - 2; i++) {
    tokens.push(`${words[i]}_${words[i + 1]}_${words[i + 2]}`)
  }

  // Hash each token into vector dimensions
  for (const token of tokens) {
    let hash = 5381
    for (let i = 0; i < token.length; i++) {
      hash = ((hash << 5) + hash) + token.charCodeAt(i)
      hash = hash & hash // Convert to 32bit integer
    }

    const index = Math.abs(hash) % VECTOR_DIM
    const weight = 1.0 + (token.length > 5 ? 0.5 : 0)
    const sign = (hash & 1) === 0 ? 1 : -1
    vector[index] += sign * weight
  }

  // L2 normalize
  let normSum = 0
  for (let i = 0; i < VECTOR_DIM; i++) {
    normSum += vector[i] * vector[i]
  }

  const norm = Math.sqrt(normSum)
  if (norm > 0) {
    for (let i = 0; i < VECTOR_DIM; i++) {
      vector[i] /= norm
    }
  }

  return Array.from(vector)
}

/**
 * Initialize (or reuse) the Hugging Face embedding pipeline.
 */
async function getEmbeddingPipeline(): Promise<any> {
  if (useFallbackMode) return null
  if (embeddingPipeline) return embeddingPipeline
  if (initPromise) return initPromise

  initPromise = (async () => {
    try {
      console.log('[Embeddings] Loading @huggingface/transformers (Xenova/all-MiniLM-L6-v2)...')
      const { pipeline, env } = await import('@huggingface/transformers')
      
      // Configure cache directory for Vercel /tmp
      if (process.env.VERCEL) {
        env.cacheDir = '/tmp/.cache'
      }

      const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
      embeddingPipeline = pipe
      console.log('[Embeddings] HuggingFace model loaded successfully.')
      return embeddingPipeline
    } catch (err: any) {
      console.warn('[Embeddings] Could not load @huggingface/transformers on this runtime. Switching to fallback vector engine:', err?.message || err)
      useFallbackMode = true
      return null
    }
  })()

  return initPromise
}

/**
 * Embed a string into a 384-dim float array.
 */
export async function embedText(text: string): Promise<number[]> {
  try {
    const pipe = await getEmbeddingPipeline()
    if (pipe) {
      const output = await pipe(text, { pooling: 'mean', normalize: true })
      return Array.from(output.data as Float32Array)
    }
  } catch (err) {
    console.warn('[Embeddings] Pipeline error, using fallback:', err)
  }

  return generateFallbackEmbedding(text)
}

/**
 * Calculate cosine similarity between two embedding vectors.
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
