/**
 * src/agents/conflictDetector.ts — Agent 3 (Core Agent)
 *
 * Detects contradictions between meeting decisions and existing notes
 * using a hybrid vector search + LLM reasoning approach.
 *
 * Algorithm per decision:
 *  1. Embed the decision text
 *  2. Cosine similarity against every noteChunk
 *  3. Sort by score, take top 3
 *  4. Skip if top score < 0.25 (no relevant note found)
 *  5. Ask Groq to analyze contradiction with the top 3 chunks as context
 *  6. Only record as a conflict if isConflict=true AND confidence > 0.65
 *
 * Runs after BOTH Agent 1 and Agent 2 complete (fan-in).
 */

import { ChatGroq } from '@langchain/groq'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { cosineSimilarity } from '@/lib/embeddings'
import { embedText } from '@/lib/embeddings'
import type { GraphStateType, ConflictItem, NoteChunk } from '../graph/state'

function getGroqClient() {
  return new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: 'llama-3.3-70b-versatile',
    temperature: 0.0,
    maxTokens: 1024,
  })
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
}

// ---------------------------------------------------------------------------
// Vector search helper
// ---------------------------------------------------------------------------

interface ScoredChunk {
  chunk: NoteChunk
  score: number
}

function searchTopChunks(
  queryEmbedding: number[],
  noteChunks: NoteChunk[],
  topK = 3
): ScoredChunk[] {
  return noteChunks
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

// ---------------------------------------------------------------------------
// Single-decision conflict check
// ---------------------------------------------------------------------------

async function checkDecisionForConflict(
  decision: string,
  noteChunks: NoteChunk[]
): Promise<ConflictItem | null> {
  // Step 1: Embed the decision
  const decisionEmbedding = await embedText(decision)

  // Step 2 & 3: Find top-3 most similar note chunks
  const topChunks = searchTopChunks(decisionEmbedding, noteChunks, 3)

  // Step 4: Skip if no meaningful match found
  if (topChunks.length === 0 || topChunks[0].score < 0.25) {
    console.log(`  [Agent 3] Decision "${decision.substring(0, 50)}..." — no related notes (top score: ${topChunks[0]?.score.toFixed(3) ?? 'N/A'})`)
    return null
  }

  const contextChunks = topChunks.map((r, i) =>
    `[Note Chunk ${i + 1} — similarity: ${r.score.toFixed(3)}]\n${r.chunk.text}`
  ).join('\n\n')

  // Step 5 & 6: LLM conflict analysis
  const systemPrompt = `You are a strict conflict detection expert analyzing meeting decisions
against existing notes and past meeting history.

STRICT RULES — read all before answering:

Rule 1 — Tool mentions for specific purposes are NOT conflicts:
If a decision mentions using a tool or service for a specific secondary
purpose such as backups, caching, payments, or logging, that does NOT
conflict with a different tool being used as the main system for a
different purpose. Two tools can coexist in the same project for
different roles. Only flag a conflict if the SAME role is being
assigned to two different tools.

Not a conflict example:
Decision: "Set up MongoDB Atlas backups"
Note: "PostgreSQL is our main database"
Reason: backups and main database are different roles, no conflict.

Real conflict example:
Decision: "Use MongoDB as our main database"
Note: "We agreed PostgreSQL is our main database"
Reason: same role being assigned to two different tools, real conflict.

Rule 2 — Task assignments and deadlines are NOT conflicts:
If the decision is about assigning a task, setting a deadline, or
scheduling work, it cannot conflict with an architectural or strategic
note. Only compare decisions of the same category — architecture vs
architecture, strategy vs strategy, timeline vs timeline.

Rule 3 — Intentional updates are NOT conflicts:
If the decision sounds like a deliberate revision or update to
something previously decided, it may be an intentional change and
not an unintentional contradiction. Only flag if the team appears
unaware of the previous decision.

Rule 4 — Confidence scoring must be strict:
Only assign confidence above 0.65 if the contradiction is completely
clear and unambiguous with no alternative interpretation possible.
If you are uncertain whether it is a real conflict, assign confidence
below 0.65 so it gets correctly filtered out.

Rule 5 — Default to no conflict when uncertain:
False positives destroy user trust more than missed conflicts. When
in doubt always return isConflict: false. It is always better to
miss a borderline conflict than to flag something incorrectly.

Return ONLY valid JSON, no markdown, no text outside the JSON:
{
  "isConflict": true or false,
  "confidence": 0.0 to 1.0,
  "contradictingNote": "exact conflicting note text or empty string",
  "explanation": "one clear sentence explaining the conflict or empty string"
}`

  const userPrompt = `MEETING DECISION:
"${decision}"

RELEVANT NOTES AND PAST CONTEXT:
${contextChunks}

Your job is to determine if the meeting decision DIRECTLY and CLEARLY
contradicts the existing notes.`

  try {
    const groq = getGroqClient()
    const response = await groq.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ])

    const rawText = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content)

    const parsed = JSON.parse(stripCodeFences(rawText))

    // Step 8: Filter by isConflict AND confidence threshold
    if (parsed.isConflict === true && parsed.confidence > 0.65) {
      return {
        decision,
        contradictingNote: parsed.contradictingNote || '',
        confidence: Math.min(1.0, Math.max(0.0, parsed.confidence)),
        explanation: parsed.explanation || '',
      }
    }

    return null
  } catch (error) {
    console.error(`[Agent 3] Error analyzing decision: "${decision.substring(0, 50)}..."`, error)
    return null
  }
}

// ---------------------------------------------------------------------------
// Agent 3 node function
// ---------------------------------------------------------------------------

export async function conflictDetectorAgent(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  const { meetingAnalysis, noteChunks } = state

  console.log('[Agent 3] conflictDetector starting...')

  if (!meetingAnalysis || meetingAnalysis.decisions.length === 0) {
    console.log('[Agent 3] No decisions to check. Skipping.')
    return { conflicts: [] }
  }

  if (noteChunks.length === 0) {
    console.log('[Agent 3] No note chunks indexed. Skipping.')
    return { conflicts: [] }
  }

  console.log(`[Agent 3] Checking ${meetingAnalysis.decisions.length} decisions against ${noteChunks.length} note chunks...`)

  // Process decisions sequentially to respect Groq rate limits
  const conflicts: ConflictItem[] = []
  for (const decision of meetingAnalysis.decisions) {
    const conflict = await checkDecisionForConflict(decision, noteChunks)
    if (conflict) {
      conflicts.push(conflict)
      console.log(`  [Agent 3] Conflict found: "${decision.substring(0, 50)}..." (confidence: ${conflict.confidence.toFixed(2)})`)
    }
  }

  console.log(`[Agent 3] Done. Found ${conflicts.length} conflicts.`)
  return { conflicts }
}
