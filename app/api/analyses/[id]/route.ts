/**
 * app/api/analyses/[id]/route.ts
 *
 * GET    /api/analyses/[id]  — fetch a single analysis
 * PATCH  /api/analyses/[id]  — update the title
 * DELETE /api/analyses/[id]  — permanently delete
 */

import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { verifyToken } from '@/lib/auth'
import { getAnalysesCollection, mapResultsForClient } from '@/models/Analysis'

// ---------------------------------------------------------------------------
// Shared auth + ownership helper
// ---------------------------------------------------------------------------

async function resolveAnalysis(request: NextRequest, id: string) {
  const token = request.cookies.get('auth_token')?.value
  if (!token) return { error: NextResponse.json({ message: 'Not authenticated.' }, { status: 401 }) }

  const payload = verifyToken(token)
  if (!payload) return { error: NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 }) }

  if (!ObjectId.isValid(id)) return { error: NextResponse.json({ message: 'Invalid analysis ID.' }, { status: 400 }) }

  const userId = new ObjectId(payload.userId)
  const analysisId = new ObjectId(id)
  const coll = await getAnalysesCollection()
  const analysis = await coll.findOne({ _id: analysisId })

  if (!analysis || !analysis.userId.equals(userId)) {
    return { error: NextResponse.json({ message: 'Analysis not found.' }, { status: 404 }) }
  }

  return { userId, analysisId, coll, analysis }
}

// ---------------------------------------------------------------------------
// GET /api/analyses/[id]
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const resolved = await resolveAnalysis(request, id)
    if ('error' in resolved) return resolved.error

    const { analysis } = resolved
    const clientResults = mapResultsForClient(analysis.results)

    return NextResponse.json({
      id: analysis._id!.toHexString(),
      title: analysis.title,
      createdAt: analysis.createdAt.toISOString(),
      ...clientResults,
    }, { status: 200 })
  } catch (error) {
    console.error('[GET /api/analyses/[id]]', error)
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/analyses/[id]  — rename (update title)
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const resolved = await resolveAnalysis(request, id)
    if ('error' in resolved) return resolved.error

    const body = await request.json()
    const newTitle = typeof body.title === 'string' ? body.title.trim() : null
    if (!newTitle) {
      return NextResponse.json({ message: 'Title is required.' }, { status: 400 })
    }

    const { analysisId, coll } = resolved
    await coll.updateOne({ _id: analysisId }, { $set: { title: newTitle } })

    return NextResponse.json({ id, title: newTitle }, { status: 200 })
  } catch (error) {
    console.error('[PATCH /api/analyses/[id]]', error)
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/analyses/[id]  — permanent deletion
// ---------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const resolved = await resolveAnalysis(request, id)
    if ('error' in resolved) return resolved.error

    const { analysisId, coll } = resolved
    await coll.deleteOne({ _id: analysisId })

    return NextResponse.json({ message: 'Analysis deleted.' }, { status: 200 })
  } catch (error) {
    console.error('[DELETE /api/analyses/[id]]', error)
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 })
  }
}
