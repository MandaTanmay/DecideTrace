'use client'

import { useState, useEffect } from 'react'
import { DashboardSidebar, Analysis, User } from '@/components/dashboard-sidebar'
import { AnalysisForm } from '@/components/analysis-form'
import { AnalysisResults } from '@/components/analysis-results'

type ViewState = 'form' | 'results'

export default function DashboardPage() {
  const [viewState, setViewState] = useState<ViewState>('form')
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null)
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [user, setUser] = useState<User | null>(null)

  // Load analyses list and user profile on mount
  useEffect(() => {
    // Fetch analyses
    fetch('/api/analyses')
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => setAnalyses(data.analyses ?? []))
      .catch(err => console.error('Failed to load analyses:', err))

    // Fetch user profile
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => setUser(data.user ?? null))
      .catch(err => console.error('Failed to load user profile:', err))
  }, [])

  const handleNewAnalysis = () => {
    setViewState('form')
    setSelectedAnalysisId(null)
    setAnalysisData(null)
  }

  const handleSelectAnalysis = async (id: string) => {
    setSelectedAnalysisId(id)
    try {
      const response = await fetch(`/api/analyses/${id}`)
      if (!response.ok) {
        console.error('Failed to load analysis:', response.status)
        return
      }
      const data = await response.json()
      setAnalysisData(data)
      setViewState('results')
    } catch (error) {
      console.error('Error loading analysis:', error)
    }
  }

  const handleAnalysisComplete = (data: any) => {
    // Add new analysis to the sidebar list
    const newAnalysis: Analysis = {
      id: data.id ?? Date.now().toString(),
      title: data.title ?? (data.summary?.substring(0, 60) + '...'),
      date: data.createdAt
        ? new Date(data.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
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
        user={user}
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
