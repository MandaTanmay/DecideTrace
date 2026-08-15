import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { verifyToken } from '@/lib/auth'
import { getAnalysesCollection } from '@/models/Analysis'
import { maskGraphData } from '@/lib/data-masking'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value
    if (!token) return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 })

    const userId = new ObjectId(payload.userId)
    const analysesColl = await getAnalysesCollection()
    const pastAnalyses = await analysesColl.find({ userId }).toArray()

    const nodes: any[] = []
    const links: any[] = []

    const nodeSet = new Set<string>()

    const addNode = (id: string, name: string, group: number, val: number = 1, desc: string = '') => {
      if (!nodeSet.has(id)) {
        nodeSet.add(id)
        nodes.push({ id, name, group, val, desc })
      }
    }

    pastAnalyses.forEach(analysis => {
      const meetingId = analysis._id!.toHexString()
      
      // Meeting Node
      addNode(meetingId, analysis.title, 1, 15, `Meeting Date: ${new Date(analysis.createdAt).toLocaleDateString()}`)

      // Decisions
      analysis.results.decisions?.forEach(decision => {
        const decisionId = 'dec_' + crypto.createHash('md5').update(decision).digest('hex').substring(0, 8)
        addNode(decisionId, decision.length > 50 ? decision.substring(0, 50) + '...' : decision, 2, 5, decision)
        links.push({ source: meetingId, target: decisionId, type: 'produced' })
      })

      // Topics / Knowledge Updates
      analysis.results.knowledgeUpdates?.forEach(update => {
        const topicId = 'topic_' + update.topic.toLowerCase().replace(/[^a-z0-9]/g, '_')
        addNode(topicId, update.topic, 3, 8, update.suggestedNote)
        links.push({ source: meetingId, target: topicId, type: 'discussed' })
      })

      // Conflicts
      analysis.results.conflicts?.forEach(conflict => {
        const conflictId = 'conf_' + crypto.createHash('md5').update(conflict.decision).digest('hex').substring(0, 8)
        addNode(conflictId, `Conflict detected`, 4, 10, `${conflict.decision}\nvs\n${conflict.contradictingNote}`)
        links.push({ source: meetingId, target: conflictId, type: 'conflict', strength: conflict.confidence || 0.8 })
      })
    })

    // Apply data masking to protect sensitive information
    const maskedData = maskGraphData({ nodes, links })

    return NextResponse.json(maskedData, { status: 200 })
  } catch (error) {
    console.error('[GET /api/knowledge-graph]', error)
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 })
  }
}
