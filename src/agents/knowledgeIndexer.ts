/**
 * src/agents/knowledgeIndexer.ts — Agent 2
 *
 * Builds the in-memory vector index from the user's notes + past meeting context.
 *
 * Steps:
 *  1. Combine existingNotes + pastMeetingContext into one text corpus
 *  2. Split into 200-word chunks with 50-word overlap
 *  3. Embed each chunk using local EmbeddingGemma (Xenova/all-MiniLM-L6-v2)
 *  4. Return { noteChunks } — array of { text, embedding } objects
 *
 * Runs in parallel with Agent 1 (meetingAnalyzer) from __start__.
 * Both agents must complete before Agent 3 (conflictDetector) starts.
 */

import { embedText } from '@/lib/embeddings'
import type { GraphStateType, NoteChunk } from '../graph/state'

// ---------------------------------------------------------------------------
// Text chunking utility
// ---------------------------------------------------------------------------

/**
 * Split text into overlapping word-based chunks.
 * @param text       Input text to chunk
 * @param chunkSize  Number of words per chunk (default: 200)
 * @param overlap    Number of words to overlap between consecutive chunks (default: 50)
 */
function chunkText(text: string, chunkSize = 200, overlap = 50): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return []

  const chunks: string[] = []
  let start = 0

  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length)
    chunks.push(words.slice(start, end).join(' '))
    start += chunkSize - overlap
    if (start >= words.length) break
  }

  return chunks
}

// ---------------------------------------------------------------------------
// Agent 2 node function
// ---------------------------------------------------------------------------

export async function knowledgeIndexerAgent(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  const { existingNotes, pastMeetingContext } = state

  console.log('[Agent 2] knowledgeIndexer starting...')

  // Combine current notes with historical context so past decisions
  // are also searchable during conflict detection
  const combinedText = [existingNotes, pastMeetingContext]
    .filter(Boolean)
    .join('\n\n')

  if (!combinedText.trim()) {
    console.log('[Agent 2] No text to index. Returning empty noteChunks.')
    return { noteChunks: [] }
  }

  const rawChunks = chunkText(combinedText, 200, 50)
  console.log(`[Agent 2] Chunked into ${rawChunks.length} segments. Embedding...`)

  // Embed all chunks in parallel — local model, no rate limits
  const noteChunks: NoteChunk[] = await Promise.all(
    rawChunks.map(async (text): Promise<NoteChunk> => {
      const embedding = await embedText(text)
      return { text, embedding }
    })
  )

  console.log(`[Agent 2] Done. Indexed ${noteChunks.length} chunks.`)
  return { noteChunks }
}
