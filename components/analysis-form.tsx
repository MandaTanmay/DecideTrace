'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { Canvas } from '@react-three/fiber'
import { ProgressSphere } from '@/components/3d/progress-sphere'
import { SceneCanvas } from '@/components/3d/scene-canvas'

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transcript.trim() || !notes.trim()) return

    setLoading(true)
    setCompletedSteps([])
    setCurrentStep(1)

    // Animate steps 1-2 immediately (agents 1 & 2 run in parallel at start)
    setCurrentStep(1)

    try {
      // Run the real LangGraph pipeline — takes 15-30s
      // Animate progress steps during the API call to show meaningful feedback
      const animationPromise = (async () => {
        // Steps 1 & 2 complete after ~3s (parallel embedding + analysis)
        await new Promise(resolve => setTimeout(resolve, 3000))
        setCompletedSteps([1])
        setCurrentStep(2)
        await new Promise(resolve => setTimeout(resolve, 500))
        setCompletedSteps([1, 2])
        setCurrentStep(3)
        // Step 3 (conflict detection) takes longer — vector search + LLM per decision
        await new Promise(resolve => setTimeout(resolve, 8000))
        setCompletedSteps([1, 2, 3])
        setCurrentStep(4)
        // Steps 4 & 5 run in parallel
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

      // Mark all steps complete
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
                placeholder="Paste your meeting transcript here..."
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
