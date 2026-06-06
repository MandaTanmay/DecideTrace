/**
 * src/graph/state.ts
 *
 * LangGraph StateGraph schema for the MeetMind multi-agent pipeline.
 * Uses Annotation.Root to define the state shape with reducers.
 *
 * State flow:
 *   __start__ ─┬─► meetingAnalyzer  ─┐
 *              └─► knowledgeIndexer ─┴─► conflictDetector ─┬─► actionExtractor ─► __end__
 *                                                           └─► knowledgeUpdater ─► __end__
 */

import { Annotation } from '@langchain/langgraph'

// ---------------------------------------------------------------------------
// Sub-types (inline — avoids circular imports)
// ---------------------------------------------------------------------------

export interface NoteChunk {
  text: string
  embedding: number[]
}

export interface MeetingAnalysis {
  summary: string
  decisions: string[]
  topics: string[]
  speakers: string[]
}

export interface ConflictItem {
  decision: string
  contradictingNote: string
  confidence: number           // 0.0 – 1.0
  explanation: string
}

export interface ActionItem {
  task: string
  owner: string
  deadline: string
  priority: 'High' | 'Medium' | 'Low'
}

export interface KnowledgeUpdate {
  topic: string
  suggestedNote: string
}

// ---------------------------------------------------------------------------
// Graph state annotation
// ---------------------------------------------------------------------------

export const GraphState = Annotation.Root({
  /**
   * The meeting transcript pasted by the user.
   * Set once at graph entry — never mutated by agents.
   */
  transcript: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),

  /**
   * The user's existing notes pasted into the form.
   * Set once at graph entry — never mutated by agents.
   */
  existingNotes: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),

  /**
   * Aggregated text from all past analyses for this user, loaded from MongoDB
   * before the pipeline starts. Provides historical memory to agents.
   *
   * Format:
   *   "--- Analysis from [date] ---\nSummary: ...\nDecisions: ...\n---\n"
   *   (repeated for each past analysis, newest first)
   */
  pastMeetingContext: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),

  /**
   * In-memory vector index built by Agent 2 (knowledgeIndexer).
   * Each chunk contains the original text segment and its 384-dim embedding.
   * Only lives in memory during this request — never persisted.
   */
  noteChunks: Annotation<NoteChunk[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),

  /**
   * Structured meeting analysis produced by Agent 1 (meetingAnalyzer).
   * Null until Agent 1 completes.
   */
  meetingAnalysis: Annotation<MeetingAnalysis | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  /**
   * Conflicts detected by Agent 3 (conflictDetector).
   * Accumulated across all decisions — uses concat reducer.
   */
  conflicts: Annotation<ConflictItem[]>({
    reducer: (existing, next) => [...existing, ...next],
    default: () => [],
  }),

  /**
   * Action items extracted by Agent 4 (actionExtractor).
   */
  actionItems: Annotation<ActionItem[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),

  /**
   * Knowledge update suggestions produced by Agent 5 (knowledgeUpdater).
   */
  knowledgeUpdates: Annotation<KnowledgeUpdate[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),

  /**
   * Optional final report string (not currently used by frontend but available
   * for future streaming or markdown export).
   */
  finalReport: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
})

export type GraphStateType = typeof GraphState.State
