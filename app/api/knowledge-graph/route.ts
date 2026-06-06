import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { verifyToken } from '@/lib/auth'
import { getAnalysesCollection } from '@/models/Analysis'
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

    const addNode = (id: string, name: string, group: number, val: number = 1) => {
      if (!nodeSet.has(id)) {
        nodeSet.add(id)
        nodes.push({ id, name, group, val })
      }
    }

    pastAnalyses.forEach(analysis => {
      const meetingId = analysis._id!.toHexString()
      
      // Meeting Node
      addNode(meetingId, analysis.title, 1, 15) // Group 1: Meetings, size 15

      // Decisions
      analysis.results.decisions?.forEach(decision => {
        const decisionId = 'dec_' + crypto.createHash('md5').update(decision).digest('hex').substring(0, 8)
        addNode(decisionId, decision, 2, 5) // Group 2: Decisions
        links.push({ source: meetingId, target: decisionId, type: 'produced' })
      })

      // Topics / Knowledge Updates
      analysis.results.knowledgeUpdates?.forEach(update => {
        const topicId = 'topic_' + update.topic.toLowerCase().replace(/[^a-z0-9]/g, '_')
        addNode(topicId, update.topic, 3, 8) // Group 3: Topics
        links.push({ source: meetingId, target: topicId, type: 'discussed' })
      })

      // Conflicts (We highlight them by creating a special node or a red link)
      analysis.results.conflicts?.forEach(conflict => {
        const conflictId = 'conf_' + crypto.createHash('md5').update(conflict.decision).digest('hex').substring(0, 8)
        addNode(conflictId, `Conflict: ${conflict.decision}`, 4, 10) // Group 4: Conflicts
        links.push({ source: meetingId, target: conflictId, type: 'conflict' })
      })
    })

    return NextResponse.json({ nodes, links }, { status: 200 })
  } catch (error) {
    console.error('[GET /api/knowledge-graph]', error)
    return NextResponse.json({ message: 'Failed to generate graph data.' }, { status: 500 })
  }
}
