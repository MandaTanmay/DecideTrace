'use client'

import { useState, useEffect } from 'react'
import { DashboardSidebar, Analysis } from '@/components/dashboard-sidebar'
import { AnalysisForm } from '@/components/analysis-form'
import { AnalysisResults } from '@/components/analysis-results'

type ViewState = 'form' | 'results'

export default function DashboardPage() {
  const [viewState, setViewState] = useState<ViewState>('form')
  const [analyses, setAnalyses] = useState<Analysis[]>([
    {
      id: '1',
      title: 'Q1 Planning Meeting - Key roadmap and team structure decisions',
      date: 'Jan 15, 2024'
    },
    {
      id: '2',
      title: 'Budget Review Session - Q1 budget allocation and spending',
      date: 'Jan 10, 2024'
    }
  ])
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null)
  const [analysisData, setAnalysisData] = useState<any>(null)

  const handleNewAnalysis = () => {
    setViewState('form')
    setSelectedAnalysisId(null)
    setAnalysisData(null)
  }

  const handleSelectAnalysis = (id: string) => {
    setSelectedAnalysisId(id)
    // Mock loading of previous analysis
    setAnalysisData({
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
        }
      ],
      actionItems: [
        { task: 'Schedule design sprint for mobile app', owner: 'Sarah Chen', deadline: '2024-02-15', priority: 'High' },
        { task: 'Prepare job descriptions for backend roles', owner: 'Mike Johnson', deadline: '2024-02-28', priority: 'High' },
        { task: 'Benchmark current API response times', owner: 'Alex Rodriguez', deadline: '2024-02-10', priority: 'Medium' },
        { task: 'Document new CI/CD pipeline requirements', owner: 'Emma Davis', deadline: '2024-02-20', priority: 'Medium' }
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
    setViewState('results')
  }

  const handleAnalysisComplete = (data: any) => {
    // Add new analysis to the list
    const newAnalysis: Analysis = {
      id: Date.now().toString(),
      title: data.summary.substring(0, 60) + '...',
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    }
    
    setAnalyses([newAnalysis, ...analyses])
    setSelectedAnalysisId(newAnalysis.id)
    setAnalysisData(data)
    setViewState('results')
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <DashboardSidebar
        analyses={analyses}
        selectedAnalysisId={selectedAnalysisId}
        onSelectAnalysis={handleSelectAnalysis}
        onNewAnalysis={handleNewAnalysis}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          {viewState === 'form' ? (
            <AnalysisForm onAnalysisComplete={handleAnalysisComplete} />
          ) : (
            <AnalysisResults data={analysisData} onBack={handleNewAnalysis} />
          )}
        </div>
      </div>
    </div>
  )
}
