'use client'

import { useState, useEffect } from 'react'
import { DashboardSidebar, Analysis, User } from '@/components/dashboard-sidebar'
import { AnalysisForm } from '@/components/analysis-form'
import { AnalysisResults } from '@/components/analysis-results'
import { KnowledgeGraphView } from '@/components/knowledge-graph-view'

type ViewState = 'form' | 'results' | 'graph'

export default function DashboardPage() {
  const [viewState, setViewState] = useState<ViewState>('form')
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null)
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

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

  const handleShowGraph = () => {
    setViewState('graph')
    setSelectedAnalysisId(null)
  }

  const handleRenameAnalysis = (id: string, newTitle: string) => {
    setAnalyses(prev => prev.map(a => a.id === id ? { ...a, title: newTitle } : a))
    // If the open report is the renamed one, update its title too
    if (analysisData && (analysisData.id === id || analysisData._id === id || selectedAnalysisId === id)) {
      setAnalysisData((prev: any) => ({ ...prev, title: newTitle }))
    }
  }

  const handleDeleteAnalysis = (id: string) => {
    setAnalyses(prev => prev.filter(a => a.id !== id))
    // If the deleted analysis is currently open, go back to form
    if (selectedAnalysisId === id) {
      setViewState('form')
      setSelectedAnalysisId(null)
      setAnalysisData(null)
    }
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
      {!isAnalyzing && (
        <DashboardSidebar
          user={user}
          analyses={analyses}
          selectedAnalysisId={selectedAnalysisId}
          onSelectAnalysis={handleSelectAnalysis}
          onNewAnalysis={handleNewAnalysis}
          onShowGraph={handleShowGraph}
          onRenameAnalysis={handleRenameAnalysis}
          onDeleteAnalysis={handleDeleteAnalysis}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          {viewState === 'form' ? (
            <AnalysisForm onAnalysisComplete={handleAnalysisComplete} onLoadingChange={setIsAnalyzing} />
          ) : viewState === 'results' ? (
            <AnalysisResults data={analysisData} onBack={handleNewAnalysis} />
          ) : (
            <div>
              <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Knowledge Graph</h1>
                <p className="text-muted-foreground text-sm">Visualize your decisions, topics, and conflicts over time.</p>
              </div>
              <KnowledgeGraphView />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
