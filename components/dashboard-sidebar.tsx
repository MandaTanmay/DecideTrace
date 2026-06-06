'use client'

import { Brain, Plus, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export interface Analysis {
  id: string
  title: string
  date: string
}

interface DashboardSidebarProps {
  analyses: Analysis[]
  selectedAnalysisId: string | null
  onSelectAnalysis: (id: string) => void
  onNewAnalysis: () => void
}

export function DashboardSidebar({
  analyses,
  selectedAnalysisId,
  onSelectAnalysis,
  onNewAnalysis
}: DashboardSidebarProps) {
  const router = useRouter()

  return (
    <div className="w-60 bg-background border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border flex items-center gap-2 group hover:opacity-80 transition-opacity cursor-pointer">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center group-hover:scale-110 transition-transform">
          <Brain className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-lg">MeetMind</span>
      </div>

      {/* New Analysis Button */}
      <div className="p-6 border-b border-border">
        <Button onClick={onNewAnalysis} className="w-full" size="lg">
          <Plus className="w-4 h-4 mr-2" />
          New Analysis
        </Button>
      </div>

      {/* Past Analyses List */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Past Analyses
        </h3>
        <div className="space-y-2">
          {analyses.length === 0 ? (
            <p className="text-sm text-muted-foreground px-2">No analyses yet</p>
          ) : (
            analyses.map((analysis) => (
              <button
                key={analysis.id}
                onClick={() => onSelectAnalysis(analysis.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedAnalysisId === analysis.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-secondary'
                }`}
              >
                <div className="font-medium truncate">{analysis.title}</div>
                <div className="text-xs mt-1 opacity-75">{analysis.date}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-border space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
            JD
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">John Doe</div>
            <div className="text-xs text-muted-foreground">john@example.com</div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => router.push('/')}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  )
}
