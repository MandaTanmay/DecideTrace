/**
 * app/api/analyses/[id]/chat/route.ts
 *
 * POST /api/analyses/[id]/chat
 * Context-aware AI chatbot assistant for a specific meeting analysis.
 */

import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { verifyToken } from '@/lib/auth'
import { getAnalysesCollection } from '@/models/Analysis'
import { ChatGroq } from '@langchain/groq'
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages'

export const maxDuration = 60

function getGroqClient() {
  return new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: 'llama-3.3-70b-versatile',
    temperature: 0.2,
    maxTokens: 1500,
  })
}

export async function POST(
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
    if (!payload || !payload.userId) {
      return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 })
    }

    const userId = new ObjectId(payload.userId)
    const { id } = await params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid analysis ID.' }, { status: 400 })
    }

    const analysisId = new ObjectId(id)

    // ── Fetch analysis document ───────────────────────────────────────────
    const analysesColl = await getAnalysesCollection()
    const analysis = await analysesColl.findOne({ _id: analysisId, userId })

    if (!analysis) {
      return NextResponse.json({ message: 'Analysis not found.' }, { status: 404 })
    }

    // ── Parse request body ────────────────────────────────────────────────
    const body = await request.json()
    const { message, messages = [] } = body

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ message: 'Message is required.' }, { status: 400 })
    }

    // ── Build Context System Prompt ───────────────────────────────────────
    const decisionsText = analysis.results.decisions?.length
      ? analysis.results.decisions.map((d) => `- ${d}`).join('\n')
      : 'None recorded'

    const actionItemsText = analysis.results.actionItems?.length
      ? analysis.results.actionItems.map((a) => `- [${a.priority}] ${a.task} (Owner: ${a.owner}, Deadline: ${a.deadline})`).join('\n')
      : 'None recorded'

    const conflictsText = analysis.results.conflicts?.length
      ? analysis.results.conflicts.map((c) => `- Decision: "${c.decision}" contradicts note: "${c.contradictingNote}" (${c.explanation})`).join('\n')
      : 'None detected'

    const systemPrompt = `You are MeetMind Assistant, an intelligent meeting analyst and advisor.
You are helping the user discuss and explore their meeting analysis.

MEETING DETAILS:
Title: ${analysis.title}
Date: ${analysis.createdAt.toLocaleDateString()}

MEETING SUMMARY:
${analysis.results.summary}

KEY DECISIONS MADE:
${decisionsText}

ACTION ITEMS & TASKS:
${actionItemsText}

CONFLICTS DETECTED:
${conflictsText}

EXISTING NOTES SNIPPET:
${analysis.existingNotes ? analysis.existingNotes.substring(0, 2000) : 'None provided'}

MEETING TRANSCRIPT SNIPPET:
${analysis.transcript ? analysis.transcript.substring(0, 3000) : 'None provided'}

RULES FOR YOUR RESPONSES:
1. Base your answers on the meeting context provided above.
2. If asked to draft an email, memo, or summary, provide a clean, professional, ready-to-send markdown response.
3. Be clear, concise, and helpful.`

    // ── Build Chat History ────────────────────────────────────────────────
    const langchainMessages: (SystemMessage | HumanMessage | AIMessage)[] = [
      new SystemMessage(systemPrompt),
    ]

    // Append up to last 10 chat messages
    const recentHistory = Array.isArray(messages) ? messages.slice(-10) : []
    for (const msg of recentHistory) {
      if (msg.role === 'user') {
        langchainMessages.push(new HumanMessage(msg.content))
      } else if (msg.role === 'assistant') {
        langchainMessages.push(new AIMessage(msg.content))
      }
    }

    // Append current user message if not already in history
    if (recentHistory.length === 0 || recentHistory[recentHistory.length - 1].content !== message) {
      langchainMessages.push(new HumanMessage(message))
    }

    // ── Invoke Groq LLM ───────────────────────────────────────────────────
    const groq = getGroqClient()
    const response = await groq.invoke(langchainMessages)

    const reply = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content)

    return NextResponse.json({ response: reply }, { status: 200 })
  } catch (error: any) {
    console.error('[POST /api/analyses/[id]/chat]', error)
    return NextResponse.json(
      { message: 'Failed to generate AI chat response.', error: error?.message || String(error) },
      { status: 500 }
    )
  }
}
