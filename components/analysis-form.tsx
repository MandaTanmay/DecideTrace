'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2, Mic, Upload, FileAudio, X, AlertCircle, StopCircle, Paperclip } from 'lucide-react'
import { toast } from 'sonner'
import { SceneCanvas } from '@/components/3d/scene-canvas'
import { ProgressSphere } from '@/components/3d/progress-sphere'

const ANALYSIS_STEPS = [
  { id: 1, label: 'Analyzing meeting transcript...', agent: 'Agent 1' },
  { id: 2, label: 'Indexing your knowledge base...', agent: 'Agent 2' },
  { id: 3, label: 'Detecting conflicts...', agent: 'Agent 3' },
  { id: 4, label: 'Extracting action items...', agent: 'Agent 4' },
  { id: 5, label: 'Finding knowledge gaps...', agent: 'Agent 5' },
  { id: 6, label: 'Generating final report...', agent: 'Final' }
]

interface AnalysisFormProps {
  onAnalysisComplete: (data: any) => void
  onLoadingChange?: (isLoading: boolean) => void
}

export function AnalysisForm({ onAnalysisComplete, onLoadingChange }: AnalysisFormProps) {
  const [transcript, setTranscript] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [currentStep, setCurrentStep] = useState<number | null>(null)
  const [metrics, setMetrics] = useState<any>(null)
  const [showInspector, setShowInspector] = useState<string | null>(null)

  // Audio Upload & Recording State
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcribeError, setTranscribeError] = useState<string | null>(null)
  const [transcribeSuccess, setTranscribeSuccess] = useState(false)

  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Recording Logic ────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const file = new File([audioBlob], `recording-${new Date().toISOString().slice(0, 10)}.webm`, { type: 'audio/webm' })
        setAudioFile(file)

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      setTranscribeError(null)
      setTranscribeSuccess(false)

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

    } catch (err) {
      console.error('Error accessing microphone:', err)
      setTranscribeError('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // ── File Handling ──────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0])
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleFileSelection = (file: File) => {
    setTranscribeError(null)
    setTranscribeSuccess(false)

    // Check if it's a text/document file
    const textTypes = ['text/plain', 'text/markdown', 'text/csv', 'application/json']
    if (textTypes.includes(file.type) || file.name.match(/\.(txt|md|csv|json)$/i)) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        setNotes(prev => prev ? prev + '\n\n' + text : text)
        setTranscribeSuccess(true) // We reuse this state to show a "loaded" message temporarily
        setTimeout(() => setTranscribeSuccess(false), 3000)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
      reader.onerror = () => {
        setTranscribeError('Failed to read document.')
      }
      reader.readAsText(file)
      return
    }

    if (file.size > 25 * 1024 * 1024) {
      setTranscribeError('File is too large. Maximum size is 25MB.')
      return
    }

    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/webm', 'audio/ogg', 'video/mp4', 'video/webm']
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|mp4|wav|m4a|webm|ogg)$/i)) {
      setTranscribeError('Invalid file format. Supported: text files (.txt, .md), or audio/video (.mp3, .mp4, .wav).')
      return
    }

    setAudioFile(file)
  }

  const clearFile = () => {
    setAudioFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setTranscribeError(null)
    setTranscribeSuccess(false)
  }

  // ── Transcription ──────────────────────────────────────────────────────────
  const handleTranscribe = async () => {
    if (!audioFile) return

    setIsTranscribing(true)
    setTranscribeError(null)
    setTranscribeSuccess(false)

    try {
      const formData = new FormData()
      formData.append('file', audioFile)

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Transcription failed')
      }

      setTranscript(data.transcript)
      setTranscribeSuccess(true)
      setAudioFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: any) {
      console.error('Transcription error:', err)
      setTranscribeError(err.message || 'Failed to transcribe audio.')
    } finally {
      setIsTranscribing(false)
    }
  }

  // ── Analysis ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transcript.trim() || !notes.trim()) return

    setLoading(true)
    onLoadingChange?.(true)
    setCompletedSteps([])
    setCurrentStep(1)

    let stepCounter = 1
    const stepTimer = setInterval(() => {
      if (stepCounter < 5) {
        setCompletedSteps(prev => Array.from(new Set([...prev, stepCounter])))
        stepCounter += 1
        setCurrentStep(stepCounter)
      }
    }, 2500)

    try {
      const response = await fetch('/api/analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, existingNotes: notes }),
      })

      clearInterval(stepTimer)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Analysis failed')
      }

      const data = await response.json()

      setCurrentStep(6)
      setCompletedSteps([1, 2, 3, 4, 5, 6])
      if (data.metrics) {
        setMetrics(data.metrics)
      }
      await new Promise(resolve => setTimeout(resolve, 800))

      onAnalysisComplete(data)
    } catch (error: any) {
      clearInterval(stepTimer)
      console.error('Analysis error:', error)
      toast.error(error.message || 'Analysis failed. Please check your API keys and try again.')
    } finally {
      setLoading(false)
      onLoadingChange?.(false)
      setCurrentStep(null)
    }
  }

  return (
    <div>
      {!loading && (
        <div className="mb-10 fade-up">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">New Meeting Analysis</h1>
          <p className="text-muted-foreground">Upload audio, paste your transcript, and sync your knowledge base.</p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] w-full animate-in fade-in duration-1000 zoom-in-95">
          {/* Neural Network Loading Animation */}
          <div className="glass bg-deep-space border-white/10 rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(99,102,241,0.25)] fade-up w-full max-w-5xl relative flex items-center justify-center" style={{ height: 600 }}>
            <style>{`
              @keyframes af-orbit1  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
              @keyframes af-orbit2  { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
              @keyframes af-orbit3  { from{transform:rotate(45deg)} to{transform:rotate(405deg)} }
              @keyframes af-pulse   { 0%,100%{opacity:.2;transform:scale(1)} 50%{opacity:.5;transform:scale(1.1)} }
              @keyframes af-glow    { 0%,100%{box-shadow:0 0 20px rgba(99,102,241,0.6),0 0 60px rgba(99,102,241,0.3)} 50%{box-shadow:0 0 40px rgba(99,102,241,1),0 0 100px rgba(99,102,241,0.6)} }
              @keyframes af-float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
              @keyframes af-dot     { 0%,100%{opacity:.2} 50%{opacity:1} }
              @keyframes af-scan    { 0%{top:0%;opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{top:100%;opacity:0} }
              @keyframes af-text-fade { 0%,100%{opacity:0.6;transform:translateY(0)} 50%{opacity:1;transform:translateY(-3px)} }
              @keyframes af-particle-up { 0% { transform: translateY(100vh) scale(0); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(-10vh) scale(1); opacity: 0; } }
            `}</style>

            {/* Background Particles */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
              {[...Array(20)].map((_, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  left: `${Math.random() * 100}%`,
                  width: Math.random() * 4 + 1,
                  height: Math.random() * 4 + 1,
                  borderRadius: '50%',
                  background: ['#6366f1', '#22d3ee', '#10b981', '#fff'][Math.floor(Math.random() * 4)],
                  animation: `af-particle-up ${Math.random() * 4 + 3}s linear infinite`,
                  animationDelay: `${Math.random() * 5}s`,
                  opacity: 0
                }} />
              ))}
            </div>

            {/* Active Agent Text Animation */}
            <div style={{ position: 'absolute', top: 60, left: 0, right: 0, textAlign: 'center', zIndex: 10 }}>
              <p style={{
                color: '#fff', fontSize: 28, fontWeight: 'bold', letterSpacing: '0.05em',
                animation: 'af-text-fade 2.5s ease-in-out infinite', textShadow: '0 0 30px rgba(99,102,241,0.9)'
              }}>
                {currentStep ? ANALYSIS_STEPS[currentStep - 1]?.label : 'Initializing Agent Swarm...'}
              </p>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 16, fontFamily: 'monospace', textTransform: 'uppercase',
                background: 'rgba(0,0,0,0.3)', padding: '6px 16px', borderRadius: 30, border: '1px solid rgba(255,255,255,0.15)',
                backdropFilter: 'blur(8px)'
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22d3ee', animation: 'af-pulse 1s infinite', boxShadow: '0 0 10px #22d3ee' }} />
                {currentStep ? ANALYSIS_STEPS[currentStep - 1]?.agent : 'System Node 00'} Active
              </div>
            </div>

            {/* Background radial glow */}
            <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 80% 80% at 50% 50%, rgba(99,102,241,0.1) 0%, transparent 70%)' }} />

            {/* Scan line */}
            <div style={{ position:'absolute', left:0, right:0, height:2, background:'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.6) 50%, transparent 100%)', animation:'af-scan 4s ease-in-out infinite', filter: 'blur(1px)' }} />

            {/* Orbit system - Scaled up */}
            <div style={{ position:'relative', width:340, height:340, transform: 'scale(1.2)' }}>
              {/* Pulse ring 1 */}
              <div style={{ position:'absolute', inset:-30, borderRadius:'50%', border:'1px solid rgba(99,102,241,0.2)', animation:'af-pulse 3s ease-in-out infinite' }} />
              {/* Pulse ring 2 */}
              <div style={{ position:'absolute', inset:-10, borderRadius:'50%', border:'1px solid rgba(99,102,241,0.3)', animation:'af-pulse 2.5s ease-in-out infinite 0.5s' }} />

              {/* Outer orbit — 5 nodes */}
              <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'1px dashed rgba(255,255,255,0.1)', animation:'af-orbit1 15s linear infinite' }}>
                {[0,1,2,3,4].map(i => (
                  <div key={i} style={{
                    position:'absolute', width:14, height:14, borderRadius:'50%',
                    background: ['#3b82f6','#6366f1','#10b981','#f43f5e','#8b5cf6'][i],
                    boxShadow: `0 0 12px ${['#3b82f6','#6366f1','#10b981','#f43f5e','#8b5cf6'][i]}`,
                    top: `calc(50% + ${Math.sin(i * 72 * Math.PI/180) * 170}px - 7px)`,
                    left: `calc(50% + ${Math.cos(i * 72 * Math.PI/180) * 170}px - 7px)`,
                    animation: `af-dot 1.6s ease-in-out ${i * 0.3}s infinite`
                  }} />
                ))}
              </div>

              {/* Middle orbit — 3 nodes counter */}
              <div style={{ position:'absolute', inset:50, borderRadius:'50%', border:'1px dashed rgba(255,255,255,0.08)', animation:'af-orbit2 10s linear infinite' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    position:'absolute', width:12, height:12, borderRadius:'50%',
                    background: ['#06b6d4','#a855f7','#f59e0b'][i],
                    boxShadow: `0 0 10px ${['#06b6d4','#a855f7','#f59e0b'][i]}`,
                    top: `calc(50% + ${Math.sin(i * 120 * Math.PI/180) * 120}px - 6px)`,
                    left: `calc(50% + ${Math.cos(i * 120 * Math.PI/180) * 120}px - 6px)`,
                    animation: `af-dot 2s ease-in-out ${i * 0.4}s infinite`
                  }} />
                ))}
              </div>

              {/* Inner orbit — 2 nodes */}
              <div style={{ position:'absolute', inset:100, borderRadius:'50%', border:'1px dashed rgba(255,255,255,0.1)', animation:'af-orbit3 7s linear infinite' }}>
                {[0,1].map(i => (
                  <div key={i} style={{
                    position:'absolute', width:10, height:10, borderRadius:'50%',
                    background: ['#ec4899','#14b8a6'][i],
                    boxShadow: `0 0 8px ${['#ec4899','#14b8a6'][i]}`,
                    top: `calc(50% + ${Math.sin(i * 180 * Math.PI/180) * 70}px - 5px)`,
                    left: `calc(50% + ${Math.cos(i * 180 * Math.PI/180) * 70}px - 5px)`,
                    animation: `af-dot 1.4s ease-in-out ${i * 0.5}s infinite`
                  }} />
                ))}
              </div>

              {/* Core */}
              <div style={{
                position:'absolute', inset:140, borderRadius:'50%',
                background:'radial-gradient(circle, #fff 0%, rgba(180,180,255,0.9) 40%, rgba(99,102,241,0.8) 100%)',
                animation:'af-glow 2.5s ease-in-out infinite, af-float 4s ease-in-out infinite',
              }} />
            </div>

            {/* Progress bar */}
            <div style={{ position:'absolute', bottom:40, left:60, right:60 }}>
              <div style={{ height:4, background:'rgba(255,255,255,0.1)', borderRadius:8, overflow:'hidden' }}>
                <div style={{
                  height:'100%', borderRadius:8,
                  background:'linear-gradient(90deg, #6366f1, #3b82f6, #22d3ee, #10b981)',
                  backgroundSize: '200% 100%',
                  width: `${Math.max(5, (completedSteps.length / ANALYSIS_STEPS.length) * 100)}%`,
                  transition:'width 0.8s ease',
                  boxShadow:'0 0 15px rgba(99,102,241,0.8)',
                  animation: 'af-scan 2s linear infinite'
                }} />
              </div>
              <p style={{ textAlign:'center', marginTop:16, fontSize:14, color:'rgba(255,255,255,0.6)', letterSpacing:'0.1em', fontWeight: 'bold' }}>
                {completedSteps.length} / {ANALYSIS_STEPS.length} AGENTS COMPLETE
              </p>
            </div>
          </div>
        </div>
      )}

      {/* State Payload Inspector Modal */}
      {showInspector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <h3 className="font-semibold font-mono text-sm">State Payload Inspector: {showInspector}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowInspector(null)} className="h-8 w-8"><X className="w-4 h-4" /></Button>
            </div>
            <div className="p-4 bg-black/50 text-emerald-400 font-mono text-xs overflow-auto max-h-96">
              <pre>
{`{
  "node": "${showInspector}",
  "status": "COMPLETED",
  "latencyMs": ${metrics ? metrics[`${showInspector}Ms`] : 0},
  "diff": {
    "status": "State merged successfully",
    "payload_size_bytes": Math.floor(Math.random() * 5000 + 1000)
  }
}`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {!loading && (
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Unified Attachment Toolbar */}
          <div className="flex flex-wrap items-center gap-4 glass p-4">
            <div className="gradient-border rounded-md">
              <Button
                type="button"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="bg-background/80 hover:bg-transparent border-none text-white transition-all shadow-none"
              >
                <Paperclip className="w-4 h-4 mr-2 text-primary" />
                Attach File
              </Button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".txt,.md,.csv,.json,audio/*,video/*"
              className="hidden"
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={startRecording}
              disabled={isRecording}
              className="glass border-white/10 hover:bg-destructive/20 hover:text-destructive hover:border-destructive/50 transition-all text-white"
            >
              <Mic className="w-4 h-4 mr-2 text-destructive" />
              Record Voice
            </Button>
            <span className="text-xs text-muted-foreground ml-auto hidden sm:inline-block">
              Supports Audio (max 25MB) & Text files (.txt, .md)
            </span>
          </div>

          {/* Recording Status Bar */}
          {isRecording && (
            <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-4 flex items-center justify-between shadow-inner animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center animate-pulse">
                  <Mic className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-bold text-destructive">Recording Live Audio</p>
                  <p className="text-xl font-mono text-foreground">{formatTime(recordingTime)}</p>
                </div>
              </div>
              <Button type="button" variant="destructive" size="sm" onClick={stopRecording} className="animate-pulse">
                <StopCircle className="w-4 h-4 mr-2" />
                Stop
              </Button>
            </div>
          )}

          {/* Attached Audio Bar */}
          {audioFile && (
            <div className="border border-primary/30 bg-primary/5 rounded-lg p-4 flex items-center justify-between shadow-inner animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-4 overflow-hidden w-full sm:w-auto">
                <div className="w-10 h-10 rounded bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <FileAudio className="w-5 h-5 text-primary" />
                </div>
                <div className="truncate text-left flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{audioFile.name}</p>
                  <p className="text-xs text-muted-foreground font-medium">{(audioFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-shrink-0">
                <Button
                  type="button"
                  onClick={handleTranscribe}
                  disabled={isTranscribing}
                  size="sm"
                >
                  {isTranscribing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Transcribing...
                    </>
                  ) : (
                    'Transcribe'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={clearFile}
                  disabled={isTranscribing}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {transcribeError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm flex items-start gap-2 shadow-inner">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>{transcribeError}</p>
            </div>
          )}

          {transcribeSuccess && !audioFile && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-4 py-3 rounded-lg text-sm flex items-start gap-2 shadow-inner">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>Success! The content has been loaded into the text boxes below.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Meeting Transcript */}
            <div>
              <label htmlFor="transcript" className="block text-sm font-medium text-foreground mb-2">
                Meeting Transcript
              </label>
              <textarea
                id="transcript"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste your meeting transcript here, or upload audio above to auto-transcribe..."
                rows={12}
                className="w-full px-4 py-4 glass border-white/10 bg-black/40 text-white placeholder-white/30 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:bg-primary/5 resize-none transition-all duration-300 rounded-xl"
              />
            </div>

            {/* Existing Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-foreground mb-2">
                Your Existing Notes
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Paste your existing notes, previous decisions, documentation..."
                rows={12}
                className="w-full px-4 py-4 glass border-white/10 bg-black/40 text-white placeholder-white/30 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent focus:bg-accent/5 resize-none transition-all duration-300 rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-center pt-6">
            <div className={`gradient-border rounded-lg transition-transform duration-300 ${(!transcript.trim() || !notes.trim() || loading) ? 'opacity-50 grayscale' : 'hover:scale-105'}`}>
              <Button
                type="submit"
                size="lg"
                disabled={!transcript.trim() || !notes.trim() || loading}
                className="h-14 px-12 text-lg bg-background hover:bg-transparent border-none text-white shadow-none w-full sm:w-auto font-bold tracking-wide"
              >
                {loading ? 'Initializing Agents...' : 'Analyze Meeting Intelligence'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

function AgentNode({ id, name, step, currentStep, completedSteps, ms, onClick }: any) {
  const isCompleted = completedSteps.includes(step)
  const isRunning = currentStep === step
  const isIdle = !isCompleted && !isRunning

  let statusColor = 'border-muted bg-card text-muted-foreground'
  if (isRunning) statusColor = 'border-blue-500 bg-blue-500/10 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
  if (isCompleted) statusColor = 'border-emerald-500 bg-emerald-500/10 text-emerald-500'

  return (
    <div 
      onClick={isCompleted ? onClick : undefined}
      className={`relative w-40 flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-300 ${statusColor} ${isCompleted ? 'cursor-pointer hover:scale-105 hover:bg-emerald-500/20' : ''}`}
    >
      <span className="text-xs font-bold text-center leading-tight mb-1">{name}</span>
      
      {isIdle && <div className="w-2 h-2 rounded-full bg-muted-foreground/50 mt-1" />}
      {isRunning && <Loader2 className="w-4 h-4 animate-spin mt-1" />}
      {isCompleted && (
        <div className="flex items-center gap-1 mt-1">
          <CheckCircle2 className="w-3 h-3" />
          {ms !== undefined && <span className="text-[10px] font-mono">{ms}ms</span>}
        </div>
      )}
    </div>
  )
}
