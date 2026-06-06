/**
 * src/agents/knowledgeUpdater.ts — Agent 5
 *
 * Compares topics from the meeting analysis against the user's existing notes.
 * For topics that are new or barely covered, it generates ready-to-paste
 * markdown note sections in a neutral, documentation style.
 *
 * Runs in parallel with Agent 4 (actionExtractor) after Agent 3 completes.
 */

import { ChatGroq } from '@langchain/groq'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import type { GraphStateType, KnowledgeUpdate } from '../graph/state'

function getGroqClient() {
  return new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: 'llama-3.3-70b-versatile',
    temperature: 0.3,
    maxTokens: 3000,
  })
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
}

export async function knowledgeUpdaterAgent(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  const { meetingAnalysis, existingNotes, transcript } = state

  console.log('[Agent 5] knowledgeUpdater starting...')

  if (!meetingAnalysis || meetingAnalysis.topics.length === 0) {
    console.log('[Agent 5] No topics to evaluate. Skipping.')
    return { knowledgeUpdates: [] }
  }

  const systemPrompt = `You are a precise knowledge base specialist. Your job is to identify
specific topics from a meeting that are missing or underdeveloped in
the existing notes and generate ready-to-paste markdown note sections.

Follow these steps exactly:

STEP 1 — Extract specific topics from the meeting:
Scan the transcript for every specific topic discussed including
tools, metrics, processes, layer names, methods, timelines, API
names, technical approaches, and decisions. Write a mental list
of every distinct specific thing mentioned.

STEP 2 — Check each topic against existing notes:
For each topic from step 1, check if it appears in the existing
notes. A topic needs a new note card if:
- It is completely absent from the existing notes
- It is only mentioned briefly in notes but discussed with specific
  detail in the meeting such as numbers, metrics, tool names,
  method names, or deadlines
- New concrete information was shared that is not captured anywhere

STEP 3 — Create one card per specific topic, never merge:
Generate exactly one separate card per specific topic. Never combine
two different topics into one card. Never create a broad overview
card that covers multiple things. Each card covers exactly one
specific subject.

These are GOOD specific card topics:
- "Layer 1 Categorizer Accuracy Target"
- "LangSmith Routing Trace Setup"
- "LLM-as-Judge Evaluation Method"
- "KTR Output Validation Layer"
- "Mock Tool Registry Design"
- "Client Demo Launch Timeline"

These are BAD broad card topics — never create these:
- "Evaluation Framework" — too broad, split by layer
- "Agent System Testing" — too vague, what specifically?
- "Project Updates" — meaningless, always too broad
- "Technical Decisions" — covers too many things at once

STEP 4 — Write specific detailed content per card:
For each card write the note content in clean markdown. Include
exact details from the meeting — specific numbers, exact tool names,
precise metrics, actual deadlines, named methods. Do not write
vague generic content. Write as if you are a technical writer
capturing exactly what was said in the meeting for someone who
was not there.

STEP 5 — Quantity requirement:
You must generate a minimum of 4 cards and a maximum of 8 cards.
Never return fewer than 4 cards even if the meeting seems simple.
If you find more than 8 distinct topics pick the 8 most important
and specific ones.

Return ONLY a valid JSON array, no markdown fences, no explanation:
[
  {
    "topic": "specific topic name in under 6 words",
    "suggestedNote": "full detailed markdown content ready to paste"
  }
]`

  const existingNotesSummary = existingNotes.length > 3000
    ? existingNotes.substring(0, 3000) + '\n\n[...truncated for length...]'
    : existingNotes

  const userPrompt = `MEETING TRANSCRIPT:
${transcript}

EXISTING NOTES:
${existingNotesSummary}`

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
    const knowledgeUpdates: KnowledgeUpdate[] = Array.isArray(parsed)
      ? parsed.map((item: any) => ({
          topic: item.topic || 'Unknown Topic',
          suggestedNote: item.suggestedNote || '',
        }))
      : []

    console.log(`[Agent 5] Done. Generated ${knowledgeUpdates.length} knowledge updates.`)
    return { knowledgeUpdates }
  } catch (error) {
    console.error('[Agent 5] Error:', error)
    return { knowledgeUpdates: [] }
  }
}
