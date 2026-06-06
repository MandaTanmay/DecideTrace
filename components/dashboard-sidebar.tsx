import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, LayoutDashboard, Settings, LogOut, FileText, Brain, Network } from 'lucide-react'

export interface User {
  name: string
  email: string
}

export interface Analysis {
  id: string
  title: string
  date: string
}

interface DashboardSidebarProps {
  user: User | null
  analyses: Analysis[]
  selectedAnalysisId: string | null
  onSelectAnalysis: (id: string) => void
  onNewAnalysis: () => void
  onShowGraph?: () => void
}

export function DashboardSidebar({
  user,
  analyses,
  selectedAnalysisId,
  onSelectAnalysis,
  onNewAnalysis,
  onShowGraph
}: DashboardSidebarProps) {
  return (
    <div className="w-64 border-r border-border bg-card/50 flex flex-col h-screen">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-primary font-semibold">
          <Brain className="w-5 h-5" />
          MeetMind
        </Link>
      </div>

      <div className="p-4 space-y-2">
        <Button onClick={onNewAnalysis} className="w-full justify-start gap-2">
          <Plus className="w-4 h-4" />
          New Analysis
        </Button>
        {onShowGraph && (
          <Button onClick={onShowGraph} variant="outline" className="w-full justify-start gap-2 border-primary/20 text-primary hover:bg-primary/10 hover:text-primary">
            <Network className="w-4 h-4" />
            Knowledge Graph
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Recent Analyses
        </div>
        <div className="space-y-1">
          {analyses.length === 0 ? (
            <p className="text-sm text-muted-foreground italic px-2">No analyses yet</p>
          ) : (
            analyses.map((analysis) => (
              <button
                key={analysis.id}
                onClick={() => onSelectAnalysis(analysis.id)}
                className={`w-full flex flex-col items-start px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedAnalysisId === analysis.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2 w-full">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="truncate">{analysis.title || 'Untitled Meeting'}</span>
                </div>
                <span className="text-[10px] opacity-70 ml-6 mt-0.5">{analysis.date}</span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="p-4 border-t border-border mt-auto space-y-1">
        {user ? (
          <div className="mb-4 px-2">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        ) : null}
        
        <button 
          onClick={() => {
            fetch('/api/auth/logout', { method: 'POST' }).then(() => {
              window.location.href = '/'
            })
          }}
          className="w-full flex items-center gap-2 px-2 py-2 text-sm text-destructive/80 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  )
}
