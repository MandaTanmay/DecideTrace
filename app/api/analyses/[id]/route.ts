/**
 * app/api/analyses/[id]/route.ts
 *
 * GET /api/analyses/[id]
 * Fetches a single analysis by ID, verifying ownership.
 */

import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { verifyToken } from '@/lib/auth'
import { getAnalysesCollection, mapResultsForClient } from '@/models/Analysis'

// ---------------------------------------------------------------------------
// GET /api/analyses/[id]
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 })
    }

    // ── Validate ObjectId ─────────────────────────────────────────────────
    // Next.js 15+: params is a Promise and must be awaited
    const { id } = await params
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid analysis ID.' }, { status: 400 })
    }

    const userId = new ObjectId(payload.userId)
    const analysisId = new ObjectId(id)

    // ── Fetch analysis ────────────────────────────────────────────────────
    const analyses = await getAnalysesCollection()
    const analysis = await analyses.findOne({ _id: analysisId })

    if (!analysis) {
      return NextResponse.json({ message: 'Analysis not found.' }, { status: 404 })
    }

    // ── Ownership check ───────────────────────────────────────────────────
    if (!analysis.userId.equals(userId)) {
      // Return 404 instead of 403 to avoid leaking that the ID exists
      return NextResponse.json({ message: 'Analysis not found.' }, { status: 404 })
    }

    // ── Return full document ──────────────────────────────────────────────
    const clientResults = mapResultsForClient(analysis.results)

    return NextResponse.json({
      id: analysis._id!.toHexString(),
      title: analysis.title,
      createdAt: analysis.createdAt.toISOString(),
      ...clientResults,
    }, { status: 200 })
  } catch (error) {
    console.error('[GET /api/analyses/[id]]', error)
    return NextResponse.json(
      { message: 'An internal server error occurred.' },
      { status: 500 }
    )
  }
}
