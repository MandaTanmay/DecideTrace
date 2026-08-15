/**
 * app/api/analyses/route.ts
 *
 * GET  /api/analyses  — List all analyses for the authenticated user
 * POST /api/analyses  — Run the LangGraph pipeline and save results
 */

import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { verifyToken } from '@/lib/auth'
import { getAnalysesCollection, toAnalysisListItem, mapResultsForClient } from '@/models/Analysis'
import { buildGraph } from '@/src/graph/graph'
import type { AnalysisDocument, ConflictResult } from '@/models/Analysis'

// ── Vercel: allow up to 60s for the pipeline ─────────────────────────────────
export const maxDuration = 60

// ---------------------------------------------------------------------------
// Helper: build pastMeetingContext from prior analyses
// ---------------------------------------------------------------------------

function buildPastMeetingContext(
  pastAnalyses: AnalysisDocument[]
): string {
  if (pastAnalyses.length === 0) return ''

  const sections = pastAnalyses.map((analysis) => {
    const date = analysis.createdAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const decisions = analysis.results.decisions
      .map((d) => `  - ${d}`)
      .join('\n')

    const conflicts = analysis.results.conflicts
      .map((c) => `  - ${c.decision} (contradicts: "${c.contradictingNote}")`)
      .join('\n')

    const unresolvedActionItems = analysis.results.actionItems?.filter(item => !item.isCompleted) || []
    const unresolvedTasks = unresolvedActionItems
      .map(t => `  - [ ] ${t.task} (Owner: ${t.owner}, Deadline: ${t.deadline})`)
      .join('\n')

    return [
      `--- Analysis from ${date} ---`,
      `Summary: ${analysis.results.summary}`,
      decisions ? `Decisions made:\n${decisions}` : 'Decisions: none recorded',
      conflicts ? `Conflicts found:\n${conflicts}` : 'Conflicts: none detected',
      unresolvedTasks ? `Unresolved Action Items from this meeting:\n${unresolvedTasks}` : 'Unresolved Action Items: none',
      '---',
    ].join('\n')
  })

  return 'PAST MEETING DECISIONS AND CONFLICTS:\n\n' + sections.join('\n\n')
}



// ---------------------------------------------------------------------------
// GET /api/analyses
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    // Auth
    const token = request.cookies.get('auth_token')?.value
    if (!token) return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 })

    const userId = new ObjectId(payload.userId)
    const analyses = await getAnalysesCollection()

    // Fetch list — project only lightweight fields (exclude transcript, notes, full results)
    const docs = await analyses
      .find({ userId }, { projection: { transcript: 0, existingNotes: 0, results: 0 } })
      .sort({ createdAt: -1 })
      .toArray()

    const list = docs.map(toAnalysisListItem)
    return NextResponse.json({ analyses: list }, { status: 200 })
  } catch (error) {
    console.error('[GET /api/analyses]', error)
    return NextResponse.json(
      { message: 'An internal server error occurred.' }, 
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST /api/analyses
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const token = request.cookies.get('auth_token')?.value
    if (!token) return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 })

    const userId = new ObjectId(payload.userId)

    // ── Input validation ──────────────────────────────────────────────────
    const body = await request.json()
    const { transcript, existingNotes } = body

    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      return NextResponse.json({ message: 'Meeting transcript is required.' }, { status: 400 })
    }

    if (!existingNotes || typeof existingNotes !== 'string' || !existingNotes.trim()) {
      return NextResponse.json({ message: 'Existing notes are required.' }, { status: 400 })
    }

    // ── Input size limits (prevent DoS attacks) ────────────────────────────
    const MAX_TRANSCRIPT_SIZE = 1 * 1024 * 1024 // 1MB
    const MAX_NOTES_SIZE = 512 * 1024 // 512KB

    if (transcript.length > MAX_TRANSCRIPT_SIZE) {
      return NextResponse.json({ message: 'Transcript exceeds maximum size limit (1MB).' }, { status: 400 })
    }

    if (existingNotes.length > MAX_NOTES_SIZE) {
      return NextResponse.json({ message: 'Existing notes exceed maximum size limit (512KB).' }, { status: 400 })
    }

    // ── Load past analyses for historical context ──────────────────────────
    const analysesCollection = await getAnalysesCollection()
    const pastAnalyses = await analysesCollection
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)             // Cap at 10 past analyses to keep context manageable
      .toArray()

    const pastMeetingContext = buildPastMeetingContext(pastAnalyses)

    console.log(`[POST /api/analyses] User ${userId}: ${pastAnalyses.length} past analyses loaded.`)

    // ── Build and invoke LangGraph pipeline ───────────────────────────────
    const graph = buildGraph()

    const initialState = {
      transcript: transcript.trim(),
      existingNotes: existingNotes.trim(),
      pastMeetingContext,
      noteChunks: [],
      meetingAnalysis: null,
      conflicts: [],
      actionItems: [],
      knowledgeUpdates: [],
      finalReport: null,
    }

    console.log('[POST /api/analyses] Starting LangGraph pipeline (streamed for telemetry)...')
    const startTime = Date.now()
    const metrics = {
      agent1Ms: 0,
      agent2Ms: 0,
      agent3Ms: 0,
      agent4Ms: 0,
      agent5Ms: 0,
      totalMs: 0,
    }

    const stream = await graph.stream(initialState)
    let finalState = initialState as any

    for await (const chunk of stream) {
      const now = Date.now()
      const elapsed = now - startTime
      
      // Update state and record latency per agent
      for (const [nodeName, stateUpdate] of Object.entries(chunk)) {
        finalState = { ...finalState, ...stateUpdate as any }
        
        switch (nodeName) {
          case 'meetingAnalyzer': metrics.agent1Ms = elapsed; break;
          case 'knowledgeIndexer': metrics.agent2Ms = elapsed; break;
          case 'conflictDetector': metrics.agent3Ms = elapsed; break;
          case 'actionExtractor': metrics.agent4Ms = elapsed; break;
          case 'knowledgeUpdater': metrics.agent5Ms = elapsed; break;
        }
      }
    }
    
    metrics.totalMs = Date.now() - startTime
    console.log(`[POST /api/analyses] Pipeline complete in ${metrics.totalMs}ms.`)

    // ── Extract results from final state ──────────────────────────────────
    const meetingAnalysis = finalState.meetingAnalysis ?? {
      summary: 'Analysis could not be completed.',
      decisions: [],
      topics: [],
      speakers: [],
    }

    const results = {
      summary: meetingAnalysis.summary,
      decisions: meetingAnalysis.decisions,
      conflicts: finalState.conflicts ?? [],
      actionItems: finalState.actionItems ?? [],
      knowledgeUpdates: finalState.knowledgeUpdates ?? [],
      metrics,
    }

    // ── Auto-generate title ───────────────────────────────────────────────
    const rawTitle = results.summary.replace(/\s+/g, ' ').trim()
    const title = rawTitle.length > 60
      ? rawTitle.substring(0, 60) + '...'
      : rawTitle

    // ── Save to MongoDB ───────────────────────────────────────────────────
    const analysisDoc: AnalysisDocument = {
      userId,
      title,
      transcript: transcript.trim(),
      existingNotes: existingNotes.trim(),
      results,
      createdAt: new Date(),
    }

    const insertResult = await analysesCollection.insertOne(analysisDoc)
    const savedId = insertResult.insertedId.toHexString()

    // ── Return client-mapped result ───────────────────────────────────────
    const clientResults = mapResultsForClient(results)

    return NextResponse.json({
      id: savedId,
      title,
      createdAt: analysisDoc.createdAt.toISOString(),
      ...clientResults,
    }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/analyses]', error)
    return NextResponse.json(
      { message: 'An internal server error occurred.' },
      { status: 500 }
    )
  }
}
