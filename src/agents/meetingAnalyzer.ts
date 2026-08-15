/**
 * src/agents/meetingAnalyzer.ts — Agent 1
 *
 * Analyzes the meeting transcript and extracts:
 *  - A 2-3 sentence summary
 *  - Concrete decisions made
 *  - Topics discussed
 *  - Speaker names (if identifiable)
 *
 * Uses pastMeetingContext as background knowledge so recurring themes
 * and past decisions inform the analysis.
 *
 * Runs in parallel with Agent 2 (knowledgeIndexer) from __start__.
 */

import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { invokeGroqWithFallback } from '../lib/groq-client'
import type { GraphStateType, MeetingAnalysis } from '../graph/state'

// ---------------------------------------------------------------------------
// Helper: strip markdown code fences before JSON.parse
// ---------------------------------------------------------------------------

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
}

// ---------------------------------------------------------------------------
// Agent 1 node function
// ---------------------------------------------------------------------------

export async function meetingAnalyzerAgent(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  const { transcript, pastMeetingContext } = state

  console.log('[Agent 1] meetingAnalyzer starting...')

  const systemPrompt = `You are an expert meeting analyst. Your job is to carefully analyze meeting transcripts and extract structured information.

Always respond with ONLY valid JSON — no markdown, no explanation, no code fences. The JSON must match this exact schema:
{
  "summary": "2-3 sentence meeting summary",
  "decisions": ["specific decision 1", "specific decision 2"],
  "topics": ["topic 1", "topic 2"],
  "speakers": ["Speaker Name 1", "Speaker Name 2"]
}

Rules:
- summary: 2-3 sentences capturing the meeting's purpose and outcome
- decisions: only CONCRETE decisions made, not discussions or suggestions
- topics: broad subject areas covered
- speakers: real names found in the transcript; omit if none identifiable
- Return empty arrays [] if a field has no data
- NEVER include markdown, explanation, or any text outside the JSON object`

  const userPrompt = pastMeetingContext
    ? `HISTORICAL CONTEXT (past meetings for this user):
${pastMeetingContext}

---

CURRENT MEETING TRANSCRIPT TO ANALYZE:
${transcript}`
    : `MEETING TRANSCRIPT TO ANALYZE:
${transcript}`

  try {
    const rawText = await invokeGroqWithFallback([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ], 2048)

    const cleaned = stripCodeFences(rawText)
    const parsed: MeetingAnalysis = JSON.parse(cleaned)

    // Validate required fields
    const result: MeetingAnalysis = {
      summary: parsed.summary || 'No summary available.',
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      speakers: Array.isArray(parsed.speakers) ? parsed.speakers : [],
    }

    console.log(`[Agent 1] Done. Found ${result.decisions.length} decisions, ${result.topics.length} topics.`)

    return { meetingAnalysis: result }
  } catch (error) {
    console.error('[Agent 1] Error:', error)
    // Return a safe fallback rather than crashing the graph
    return {
      meetingAnalysis: {
        summary: 'Analysis failed — could not parse LLM response.',
        decisions: [],
        topics: [],
        speakers: [],
      },
    }
  }
}
