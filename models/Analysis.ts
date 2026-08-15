/**
 * models/Analysis.ts
 *
 * TypeScript interfaces for the MongoDB analyses collection document.
 * Stores all LangGraph pipeline results per user.
 */

import { ObjectId, type Collection } from 'mongodb'
import { getDB } from '@/lib/mongodb'

// ---------------------------------------------------------------------------
// Sub-document types
// ---------------------------------------------------------------------------

export interface ConflictResult {
  decision: string
  contradictingNote: string
  confidence: number          // 0.0 – 1.0
  explanation: string
}

export interface ActionItem {
  task: string
  owner: string
  deadline: string
  priority: 'High' | 'Medium' | 'Low'
  isCompleted?: boolean
}

export interface KnowledgeUpdate {
  topic: string
  suggestedNote: string
}

export interface MeetingAnalysisResult {
  summary: string
  decisions: string[]
  topics: string[]
  speakers: string[]
}

export interface PipelineMetrics {
  agent1Ms: number
  agent2Ms: number
  agent3Ms: number
  agent4Ms: number
  agent5Ms: number
  totalMs: number
}

export interface AnalysisResults {
  summary: string
  decisions: string[]
  conflicts: ConflictResult[]
  actionItems: ActionItem[]
  knowledgeUpdates: KnowledgeUpdate[]
  metrics?: PipelineMetrics
}

// ---------------------------------------------------------------------------
// Top-level document
// ---------------------------------------------------------------------------

export interface AnalysisDocument {
  _id?: ObjectId
  userId: ObjectId              // Reference to users collection
  title: string                 // Auto-generated from first 60 chars of summary
  transcript: string
  existingNotes: string
  results: AnalysisResults
  createdAt: Date
}

/**
 * Lightweight list item for the sidebar — excludes heavy text fields.
 */
export interface AnalysisListItem {
  id: string
  title: string
  date: string                  // Formatted date string for the UI
}

/**
 * Map internal AnalysisResults sub-document to client/UI format.
 */
export function mapResultsForClient(results: any) {
  return {
    summary: results?.summary || '',
    decisions: results?.decisions || [],
    conflicts: (results?.conflicts ?? []).map((c: ConflictResult, idx: number) => ({
      id: idx + 1,
      meetingDecision: c.decision,
      conflictingNote: c.contradictingNote,
      confidence: Math.round((c.confidence || 0) * 100),
      explanation: c.explanation || '',
    })),
    actionItems: results?.actionItems ?? [],
    knowledgeGaps: (results?.knowledgeUpdates ?? []).map((u: any) => ({
      topic: u.topic || 'Unknown Topic',
      suggestion: u.suggestedNote || '',
    })),
    metrics: results?.metrics,
  }
}

/**
 * Convert a full AnalysisDocument to a sidebar list item.
 */
export function toAnalysisListItem(doc: AnalysisDocument): AnalysisListItem {
  let dateObj = new Date()
  if (doc.createdAt) {
    dateObj = doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt)
  }

  return {
    id: doc._id!.toHexString(),
    title: doc.title || 'Untitled Analysis',
    date: dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
  }
}

/**
 * Returns the typed MongoDB collection for analyses.
 * Creates a userId index for efficient per-user queries.
 */
export async function getAnalysesCollection(): Promise<Collection<AnalysisDocument>> {
  const db = await getDB()
  const collection = db.collection<AnalysisDocument>('analyses')

  // Index for fetching all analyses by user (sorted by date)
  await collection.createIndex({ userId: 1, createdAt: -1 })

  return collection
}
