import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getAnalysesCollection } from '@/models/Analysis'
import { verifyToken } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || !payload.userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const userId = payload.userId

    const resolvedParams = await params
    const analysisId = resolvedParams.id
    if (!ObjectId.isValid(analysisId)) {
      return NextResponse.json({ message: 'Invalid analysis ID' }, { status: 400 })
    }

    const body = await request.json()
    const { itemIndex, isCompleted } = body

    if (typeof itemIndex !== 'number' || typeof isCompleted !== 'boolean') {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 })
    }

    const analyses = await getAnalysesCollection()
    
    // Create the update path dynamically for the specific array element
    const updatePath = `results.actionItems.${itemIndex}.isCompleted`

    const result = await analyses.updateOne(
      { _id: new ObjectId(analysisId), userId: new ObjectId(userId) },
      { $set: { [updatePath]: isCompleted } }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: 'Analysis not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Action item updated' })
  } catch (error) {
    console.error('[PATCH /api/analyses/[id]/action-items]', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
