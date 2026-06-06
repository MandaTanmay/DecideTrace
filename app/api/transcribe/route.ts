import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const token = request.cookies.get('auth_token')?.value
    if (!token) return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 })

    // ── Read form data ────────────────────────────────────────────────────
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded.' }, { status: 400 })
    }

    // ── Validate file type and size ───────────────────────────────────────
    // Groq Whisper max size is 25MB
    const MAX_SIZE = 25 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ message: 'File is too large. Maximum size is 25MB.' }, { status: 400 })
    }

    const validTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/wav', 'audio/x-wav', 
      'audio/m4a', 'audio/webm', 'audio/ogg', 'video/mp4', 'video/webm'
    ]
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|mp4|wav|m4a|webm|ogg)$/i)) {
      return NextResponse.json({ message: 'Invalid file format. Supported formats: mp3, mp4, wav, m4a, webm, ogg.' }, { status: 400 })
    }

    // ── Send to Groq Whisper ──────────────────────────────────────────────
    const groqFormData = new FormData()
    groqFormData.append('file', file)
    groqFormData.append('model', 'whisper-large-v3-turbo')
    groqFormData.append('response_format', 'json')
    groqFormData.append('language', 'en')

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: groqFormData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[POST /api/transcribe] Groq API error:', errorText)
      return NextResponse.json({ message: 'Failed to transcribe audio with Groq API.' }, { status: 500 })
    }

    const data = await response.json()

    if (!data.text) {
      return NextResponse.json({ message: 'Groq API returned an empty transcription.' }, { status: 500 })
    }

    return NextResponse.json({ transcript: data.text }, { status: 200 })

  } catch (error) {
    console.error('[POST /api/transcribe]', error)
    return NextResponse.json(
      { message: 'An internal server error occurred while processing the audio.' },
      { status: 500 }
    )
  }
}
