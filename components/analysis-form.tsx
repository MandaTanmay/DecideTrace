'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2 } from 'lucide-react'

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

    // Simulate analysis steps with delays
    for (let i = 1; i <= ANALYSIS_STEPS.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800))
      setCompletedSteps(prev => [...prev, i])
      if (i < ANALYSIS_STEPS.length) {
        setCurrentStep(i + 1)
      }
    }

    // Simulate analysis completion and return mock data
    await new Promise(resolve => setTimeout(resolve, 500))
    
    onAnalysisComplete({
      transcript,
      notes,
      summary: 'In this meeting, the team discussed Q1 priorities and made several key decisions regarding product roadmap and team structure. Key topics included feature prioritization, deadline discussions, and resource allocation.',
      decisions: [
        'Move mobile app redesign to Q2 instead of Q1',
        'Hire 2 additional backend engineers by end of Q2',
        'Implement new CI/CD pipeline by March 31st',
        'Reduce API response time to under 200ms'
      ],
      conflicts: [
        {
          id: 1,
          meetingDecision: 'We will complete the mobile redesign by end of Q1',
          conflictingNote: 'Mobile redesign pushed to Q2 due to resource constraints',
          confidence: 87,
          explanation: 'Timeline mismatch: Meeting commits to Q1 completion, but existing notes indicate Q2 target.'
        },
        {
          id: 2,
          meetingDecision: 'API response time must be under 200ms',
          conflictingNote: 'Current acceptable SLA is 500ms for API responses',
          confidence: 92,
          explanation: 'New requirement conflicts with previously documented performance SLA.'
        },
        {
          id: 3,
          meetingDecision: 'Team will expand by 2 backend engineers',
          conflictingNote: 'Hiring freeze announced last month, no new positions approved',
          confidence: 78,
          explanation: 'Hiring decision contradicts recent company-wide hiring freeze policy.'
        }
      ],
      actionItems: [
        { task: 'Schedule design sprint for mobile app', owner: 'Sarah Chen', deadline: '2024-02-15', priority: 'High' },
        { task: 'Prepare job descriptions for backend roles', owner: 'Mike Johnson', deadline: '2024-02-28', priority: 'High' },
        { task: 'Benchmark current API response times', owner: 'Alex Rodriguez', deadline: '2024-02-10', priority: 'Medium' },
        { task: 'Document new CI/CD pipeline requirements', owner: 'Emma Davis', deadline: '2024-02-20', priority: 'Medium' },
        { task: 'Review and update team capacity planning', owner: 'Sarah Chen', deadline: '2024-02-28', priority: 'Low' }
      ],
      knowledgeGaps: [
        {
          topic: 'Q2 Budget Allocation',
          suggestion: 'Add details about how budget was allocated across different departments and projects for Q2.'
        },
        {
          topic: 'Risk Assessment',
          suggestion: 'Document potential risks identified during the meeting, especially around the accelerated timeline.'
        }
      ]
    })

    setLoading(false)
    setCurrentStep(null)
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">New Meeting Analysis</h1>

      {loading && (
        <div className="mb-8 bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Processing your analysis...</h2>
          <div className="space-y-3">
            {ANALYSIS_STEPS.map((step) => (
              <div key={step.id} className="flex items-start gap-3">
                <div className="mt-1">
                  {completedSteps.includes(step.id) ? (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  ) : currentStep === step.id ? (
                    <Loader2 className="w-5 h-5 text-accent animate-spin" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-muted" />
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
                className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
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
                className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
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
