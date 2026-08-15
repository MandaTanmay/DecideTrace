/**
 * src/agents/actionExtractor.ts — Agent 4
 *
 * Extracts specific, actionable tasks from the meeting transcript.
 * Each task includes the owner, deadline, and priority.
 *
 * Runs in parallel with Agent 5 (knowledgeUpdater) after Agent 3 completes.
 */

import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { invokeGroqWithFallback } from '../lib/groq-client'
import type { GraphStateType, ActionItem } from '../graph/state'

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
}

export async function actionExtractorAgent(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  const { transcript, meetingAnalysis } = state

  console.log('[Agent 4] actionExtractor starting...')

  const decisionsContext = meetingAnalysis?.decisions.length
    ? `\nKey decisions made:\n${meetingAnalysis.decisions.map((d, i) => `${i + 1}. ${d}`).join('\n')}`
    : ''

  const systemPrompt = `You are an expert at extracting action items from meeting transcripts.

Extract every concrete, actionable task that was assigned or agreed upon. Include both explicit assignments ("John will do X") and implicit commitments ("We need to do Y by Z").

Always respond with ONLY a valid JSON array — no markdown, no explanation:
[
  {
    "task": "specific, actionable description of what needs to be done",
    "owner": "Person's Name (or 'Team' if a group task, or 'TBD' if unassigned)",
    "deadline": "specific date like '2024-03-31' or relative like 'End of week', 'Next sprint', or 'TBD'",
    "priority": "High" or "Medium" or "Low"
  }
]

Priority guidelines:
- High: Blocking tasks, client commitments, immediate deadlines, safety/security issues
- Medium: Important but not urgent, short-term goals, process improvements
- Low: Nice-to-haves, long-term goals, documentation, follow-ups

Return an empty array [] if no action items are found.`

  const userPrompt = `Meeting transcript:${decisionsContext}

${transcript}`

  try {
    const rawText = await invokeGroqWithFallback([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ], 2048)

    const parsed = JSON.parse(stripCodeFences(rawText))
    const actionItems: ActionItem[] = Array.isArray(parsed) ? parsed.map((item: any) => ({
      task: item.task || '',
      owner: item.owner || 'TBD',
      deadline: item.deadline || 'TBD',
      priority: ['High', 'Medium', 'Low'].includes(item.priority) ? item.priority : 'Medium',
    })) : []

    console.log(`[Agent 4] Done. Extracted ${actionItems.length} action items.`)
    return { actionItems }
  } catch (error) {
    console.error('[Agent 4] Error:', error)
    return { actionItems: [] }
  }
}
