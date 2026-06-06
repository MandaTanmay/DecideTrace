'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2, Mic, Upload, FileAudio, X, AlertCircle, StopCircle } from 'lucide-react'
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
}

export function AnalysisForm({ onAnalysisComplete }: AnalysisFormProps) {
  const [transcript, setTranscript] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [currentStep, setCurrentStep] = useState<number | null>(null)

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
    
    if (file.size > 25 * 1024 * 1024) {
      setTranscribeError('File is too large. Maximum size is 25MB.')
      return
    }

    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/webm', 'audio/ogg', 'video/mp4', 'video/webm']
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|mp4|wav|m4a|webm|ogg)$/i)) {
      setTranscribeError('Invalid file format. Supported: mp3, mp4, wav, m4a, webm, ogg.')
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
    setCompletedSteps([])
    setCurrentStep(1)

    try {
      const animationPromise = (async () => {
        await new Promise(resolve => setTimeout(resolve, 3000))
        setCompletedSteps([1])
        setCurrentStep(2)
        await new Promise(resolve => setTimeout(resolve, 500))
        setCompletedSteps([1, 2])
        setCurrentStep(3)
        await new Promise(resolve => setTimeout(resolve, 8000))
        setCompletedSteps([1, 2, 3])
        setCurrentStep(4)
        await new Promise(resolve => setTimeout(resolve, 5000))
        setCompletedSteps([1, 2, 3, 4])
        setCurrentStep(5)
        await new Promise(resolve => setTimeout(resolve, 2000))
        setCompletedSteps([1, 2, 3, 4, 5])
        setCurrentStep(6)
      })()

      const apiPromise = fetch('/api/analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, existingNotes: notes }),
      })

      const [response] = await Promise.all([apiPromise, animationPromise])

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Analysis failed')
      }

      const data = await response.json()

      setCompletedSteps([1, 2, 3, 4, 5, 6])
      await new Promise(resolve => setTimeout(resolve, 500))

      onAnalysisComplete(data)
    } catch (error: any) {
      console.error('Analysis error:', error)
      alert(error.message || 'Analysis failed. Please check your API keys and try again.')
    } finally {
      setLoading(false)
      setCurrentStep(null)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">New Meeting Analysis</h1>

      {loading && (
        <div className="mb-8 space-y-6">
          {/* 3D Progress Sphere */}
          <div className="bg-card border border-border rounded-lg p-8 flex justify-center">
            <div style={{ width: '300px', height: '300px' }}>
              <SceneCanvas className="w-full h-full">
                <ProgressSphere progress={completedSteps.length / ANALYSIS_STEPS.length} />
              </SceneCanvas>
            </div>
          </div>
          
          {/* Analysis Steps */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Processing your analysis...</h2>
            <div className="space-y-3">
              {ANALYSIS_STEPS.map((step) => (
                <div key={step.id} className="flex items-start gap-3 group">
                  <div className="mt-1">
                    {completedSteps.includes(step.id) ? (
                      <CheckCircle2 className="w-5 h-5 text-primary animate-bounce" />
                    ) : currentStep === step.id ? (
                      <Loader2 className="w-5 h-5 text-accent animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-muted group-hover:border-primary transition-colors" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={completedSteps.includes(step.id) ? 'text-foreground' : 'text-muted-foreground'}>
                      {step.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{step.agent}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && (
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Premium Audio Upload / Recording Zone */}
          <div className="relative group/upload">
            {/* Animated Glow Backdrop */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30 rounded-xl blur-xl opacity-20 group-hover/upload:opacity-50 transition duration-1000 group-hover/upload:duration-200 animate-gradient-xy"></div>
            
            <div className="relative bg-card/80 backdrop-blur-xl border border-white/10 rounded-xl p-8 overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Mic className="w-32 h-32 text-primary" />
              </div>
              
              <div className="relative z-10 space-y-6">
                <div>
                  <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Meeting Recording</h2>
                  <p className="text-sm text-muted-foreground mt-1">Upload audio/video or record directly to auto-generate your transcript.</p>
                </div>
                
                {!audioFile && !isRecording && (
                  <div 
                    className="border border-dashed border-white/20 bg-black/20 rounded-xl p-10 flex flex-col items-center justify-center text-center hover:bg-black/40 hover:border-primary/50 transition-all cursor-pointer group backdrop-blur-sm relative overflow-hidden"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="audio/*,video/*"
                      className="hidden"
                    />
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary to-secondary/50 border border-white/5 shadow-inner flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(var(--primary),0.3)] transition-all duration-300">
                      <Upload className="w-8 h-8 text-primary/80 group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-base font-semibold text-foreground mb-2">Drag & Drop your recording</p>
                    <p className="text-sm text-muted-foreground mb-8">or click to browse your files (Max 25MB)</p>
                    
                    <div className="flex items-center gap-6 w-full max-w-sm mb-8 opacity-60">
                      <div className="h-px bg-gradient-to-r from-transparent to-border flex-1" />
                      <span className="text-xs font-bold tracking-widest uppercase">OR</span>
                      <div className="h-px bg-gradient-to-l from-transparent to-border flex-1" />
                    </div>

                    <Button 
                      type="button" 
                      className="w-full max-w-xs bg-white/5 hover:bg-white/10 text-foreground border border-white/10 backdrop-blur-md shadow-lg shadow-black/20 transition-all hover:scale-105"
                      onClick={(e) => {
                        e.stopPropagation()
                        startRecording()
                      }}
                    >
                      <div className="w-2 h-2 rounded-full bg-red-500 mr-3 animate-pulse"></div>
                      Record Live Audio
                    </Button>
                  </div>
                )}

                {isRecording && (
                  <div className="border border-primary/30 bg-black/40 backdrop-blur-xl rounded-xl p-12 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-[inset_0_0_50px_rgba(0,0,0,0.5)]">
                    <div className="absolute inset-0 bg-gradient-to-t from-destructive/10 to-transparent animate-pulse"></div>
                    
                    <div className="relative">
                      <div className="absolute -inset-4 bg-destructive/20 rounded-full blur-xl animate-pulse"></div>
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-destructive/20 to-destructive/5 border border-destructive/20 flex items-center justify-center mb-6 relative z-10 shadow-[0_0_30px_rgba(239,68,68,0.3)] animate-bounce-subtle">
                        <Mic className="w-10 h-10 text-destructive" />
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-foreground mb-3 relative z-10">Recording in Progress</h3>
                    <div className="bg-black/50 px-6 py-2 rounded-full border border-white/5 mb-8 relative z-10 backdrop-blur-md shadow-inner">
                      <p className="text-4xl font-mono font-light tracking-wider text-primary">{formatTime(recordingTime)}</p>
                    </div>
                    
                    <Button 
                      type="button" 
                      variant="destructive" 
                      onClick={stopRecording}
                      className="relative z-10 shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] transition-all hover:scale-105 px-8"
                    >
                      <StopCircle className="w-5 h-5 mr-2" />
                      Finish Recording
                    </Button>
                  </div>
                )}

                {audioFile && (
                  <div className="border border-white/10 bg-black/40 backdrop-blur-md rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-inner">
                    <div className="flex items-center gap-4 overflow-hidden w-full sm:w-auto">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(var(--primary),0.1)]">
                        <FileAudio className="w-7 h-7 text-primary" />
                      </div>
                      <div className="truncate text-left flex-1 min-w-0">
                        <p className="text-base font-semibold text-foreground truncate">{audioFile.name}</p>
                        <p className="text-sm text-primary/70 font-medium">{(audioFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end flex-shrink-0">
                      <Button 
                        type="button" 
                        onClick={handleTranscribe}
                        disabled={isTranscribing}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] transition-all flex-1 sm:flex-none"
                      >
                        {isTranscribing ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Transcribing...
                          </>
                        ) : (
                          'Transcribe Audio'
                        )}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon"
                        onClick={clearFile}
                        disabled={isTranscribing}
                        className="border-white/10 hover:bg-destructive/20 hover:text-destructive hover:border-destructive/30 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                )}

                {transcribeError && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive px-5 py-4 rounded-xl text-sm flex items-start gap-3 backdrop-blur-sm shadow-inner animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <p className="font-medium leading-relaxed">{transcribeError}</p>
                  </div>
                )}

                {transcribeSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-5 py-4 rounded-xl text-sm flex items-start gap-3 backdrop-blur-sm shadow-inner animate-in fade-in slide-in-from-top-2">
                    <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <p className="font-medium leading-relaxed">Transcription complete! The text has been inserted below for your review.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

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
                className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50 resize-none transition-all shadow-lg shadow-primary/5 hover:shadow-lg hover:shadow-primary/10"
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
                className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/50 resize-none transition-all shadow-lg shadow-accent/5 hover:shadow-lg hover:shadow-accent/10"
              />
            </div>
          </div>

          <div className="flex justify-center">
            <Button 
              type="submit" 
              size="lg"
              disabled={!transcript.trim() || !notes.trim() || loading}
            >
              {loading ? 'Analyzing...' : 'Analyze Meeting'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
