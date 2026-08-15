import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, LogOut, Brain, Network, Pencil, Trash2, Check, X } from 'lucide-react'

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
  onRenameAnalysis?: (id: string, newTitle: string) => void
  onDeleteAnalysis?: (id: string) => void
}

export function DashboardSidebar({
  user,
  analyses,
  selectedAnalysisId,
  onSelectAnalysis,
  onNewAnalysis,
  onShowGraph,
  onRenameAnalysis,
  onDeleteAnalysis,
}: DashboardSidebarProps) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close context menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Auto-focus input when editing starts
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  const startEdit = (analysis: Analysis) => {
    setMenuOpenId(null)
    setEditingId(analysis.id)
    setEditingTitle(analysis.title)
  }

  const confirmEdit = async () => {
    if (!editingId || !editingTitle.trim()) return
    try {
      const res = await fetch(`/api/analyses/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTitle.trim() }),
      })
      if (res.ok && onRenameAnalysis) {
        onRenameAnalysis(editingId, editingTitle.trim())
      }
    } catch (err) {
      console.error('Failed to rename analysis', err)
    } finally {
      setEditingId(null)
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingTitle('')
  }

  const startDelete = (id: string) => {
    setMenuOpenId(null)
    setDeletingId(id)
  }

  const confirmDelete = async () => {
    if (!deletingId) return
    try {
      const res = await fetch(`/api/analyses/${deletingId}`, { method: 'DELETE' })
      if (res.ok && onDeleteAnalysis) {
        onDeleteAnalysis(deletingId)
      }
    } catch (err) {
      console.error('Failed to delete analysis', err)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="w-72 glass rounded-none border-y-0 border-l-0 flex flex-col h-screen relative overflow-hidden z-20">
      {/* Background glow effect for sidebar */}
      <div className="absolute top-0 left-0 w-full h-32 bg-primary/10 blur-[50px] -z-10 pointer-events-none" />
      
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg gradient-border flex items-center justify-center glow-pulse bg-background/50 group-hover:scale-110 transition-transform">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white group-hover:text-primary transition-colors">DecideTrace</span>
        </Link>
      </div>

      <div className="p-4 space-y-3">
        <div className="gradient-border group rounded-lg">
          <Button onClick={onNewAnalysis} className="w-full justify-start gap-2 bg-background/50 hover:bg-transparent border-none text-white h-11">
            <Plus className="w-4 h-4 text-primary" />
            <span className="font-semibold">New Analysis</span>
          </Button>
        </div>
        {onShowGraph && (
          <Button 
            onClick={onShowGraph} 
            variant="outline" 
            className="w-full justify-start gap-2 h-11 glass hover:bg-primary/20 text-white border-white/5 hover:border-primary/50 transition-all group"
          >
            <Network className="w-4 h-4 text-accent group-hover:animate-pulse" />
            Knowledge Graph
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-2 flex items-center gap-2">
          <span className="w-1 h-1 rounded-full bg-muted-foreground/50"></span>
          Recent Analyses
        </div>
        <div className="space-y-1 relative" ref={menuRef}>
          {/* Vertical line connecting the history items */}
          <div className="absolute left-4 top-2 bottom-2 w-px bg-gradient-to-b from-white/10 via-white/5 to-transparent pointer-events-none" />
          
          {analyses.length === 0 ? (
            <p className="text-sm text-muted-foreground italic px-4 py-2">No past analyses</p>
          ) : (
            analyses.map((analysis) => {
              const isSelected = selectedAnalysisId === analysis.id
              const isEditing = editingId === analysis.id
              const isDeleting = deletingId === analysis.id

              return (
                <div key={analysis.id} className="relative">
                  {/* Delete confirmation */}
                  {isDeleting ? (
                    <div className="flex items-center gap-2 px-3 py-3 rounded-xl bg-red-500/10 border border-red-500/30 animate-in fade-in duration-200">
                      <Trash2 className="w-4 h-4 text-red-400 shrink-0" />
                      <span className="text-xs text-red-300 flex-1">Delete this analysis?</span>
                      <button
                        onClick={confirmDelete}
                        className="p-1 rounded bg-red-500/30 hover:bg-red-500/60 text-red-300 transition-colors"
                        title="Confirm delete"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/50 transition-colors"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : isEditing ? (
                    /* Inline rename input */
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/40 animate-in fade-in duration-200">
                      <input
                        ref={inputRef}
                        value={editingTitle}
                        onChange={e => setEditingTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') confirmEdit()
                          if (e.key === 'Escape') cancelEdit()
                        }}
                        className="flex-1 bg-transparent text-white text-sm outline-none min-w-0"
                        placeholder="Enter title..."
                      />
                      <button
                        onClick={confirmEdit}
                        className="p-1 rounded bg-primary/30 hover:bg-primary/60 text-primary transition-colors shrink-0"
                        title="Save"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/50 transition-colors shrink-0"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    /* Normal row */
                    <div className={`group flex items-center gap-2 px-3 py-3 rounded-xl text-sm transition-all relative ${
                      isSelected
                        ? 'bg-primary/10 text-white shadow-[inset_0_0_20px_rgba(99,102,241,0.15)] border border-primary/20'
                        : 'text-muted-foreground hover:bg-white/5 hover:text-white border border-transparent'
                    }`}>
                      {/* Indicator dot */}
                      <div className={`w-2 h-2 rounded-full shrink-0 z-10 transition-colors duration-300 ${isSelected ? 'bg-primary glow-pulse' : 'bg-muted-foreground/30 group-hover:bg-muted-foreground'}`} />
                      
                      <button
                        onClick={() => onSelectAnalysis(analysis.id)}
                        className="flex flex-col items-start min-w-0 flex-1 text-left"
                      >
                        <span className="truncate w-full font-medium">{analysis.title || 'Untitled Meeting'}</span>
                        <span className="text-[10px] uppercase tracking-wider opacity-60 mt-0.5 font-mono">{analysis.date}</span>
                      </button>

                      {/* Inline action icons — slide in on hover */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0 shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); startEdit(analysis) }}
                          className="p-1.5 rounded-lg text-white/30 hover:text-primary hover:bg-primary/15 transition-all"
                          title="Rename"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); startDelete(analysis.id) }}
                          className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/15 transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="p-4 border-t border-white/5 mt-auto bg-black/20 backdrop-blur-md space-y-2">
        {user ? (
          <div className="mb-4 px-3 py-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-xs font-bold text-white shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate text-white">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        ) : null}
        
        <button 
          onClick={() => {
            fetch('/api/auth/logout', { method: 'POST' }).then(() => {
              window.location.href = '/'
            })
          }}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-destructive/80 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors font-medium"
        >
          <LogOut className="w-4 h-4" />
          Disconnect
        </button>
      </div>
    </div>
  )
}
