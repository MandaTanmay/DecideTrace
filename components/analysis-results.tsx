'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Copy, AlertCircle, CheckCircle2, Download, MessageSquare, Send, Sparkles, Bot, User as UserIcon, Loader2, Target } from 'lucide-react'
import { InteractiveCard3D } from '@/components/3d/interactive-card-3d'
import { generateAnalysisPDF } from '@/src/lib/exportPdf'
import { toast } from 'sonner'
import { useEffect } from 'react'

interface AnalysisResultsProps {
  data: any
  onBack: () => void
}

export function AnalysisResults({ data, onBack }: AnalysisResultsProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'conflicts' | 'action-items' | 'knowledge' | 'chatbot'>('summary')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [actionItems, setActionItems] = useState<any[]>(data.actionItems || [])

  // Chatbot State per Report ID (persistent across report switches)
  const [chatHistories, setChatHistories] = useState<
    Record<string, Array<{ role: 'user' | 'assistant'; content: string }>>
  >({})
  const [inputMessage, setInputMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  const activeReportId = data?.id || 'temp'
  const chatMessages = chatHistories[activeReportId] || []

  useEffect(() => {
    setActionItems(data?.actionItems || [])
    setInputMessage('')
  }, [data?.id, data?.summary])

  const handleToggleActionItem = async (index: number) => {
    if (!data.id) {
      toast.error("Cannot update action items before analysis is saved.")
      return
    }
    
    const item = actionItems[index]
    const newStatus = !item.isCompleted
    
    // Optimistic update
    const newItems = [...actionItems]
    newItems[index] = { ...item, isCompleted: newStatus }
    setActionItems(newItems)

    try {
      const response = await fetch(`/api/analyses/${data.id}/action-items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIndex: index, isCompleted: newStatus })
      })
      if (!response.ok) throw new Error('Failed to update')
    } catch (err) {
      // Revert on error
      const revertItems = [...actionItems]
      revertItems[index] = { ...item, isCompleted: !newStatus }
      setActionItems(revertItems)
      toast.error('Failed to update action item.')
    }
  }

  const handleSendMessage = async (promptText?: string) => {
    const textToSend = promptText || inputMessage
    if (!textToSend.trim() || isSending) return

    if (!data.id) {
      toast.error("Save or select an analysis to use the AI chatbot.")
      return
    }

    const currentHistory = chatHistories[activeReportId] || []
    const userMsg = { role: 'user' as const, content: textToSend.trim() }
    const updatedHistory = [...currentHistory, userMsg]

    // Save user message immediately in report history map
    setChatHistories((prev) => ({
      ...prev,
      [activeReportId]: updatedHistory,
    }))

    if (!promptText) setInputMessage('')
    setIsSending(true)

    try {
      const response = await fetch(`/api/analyses/${data.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend.trim(), messages: updatedHistory }),
      })

      const resData = await response.json()
      if (!response.ok) throw new Error(resData.message || 'Failed to generate response')

      const finalHistory = [
        ...updatedHistory,
        { role: 'assistant' as const, content: resData.response },
      ]

      setChatHistories((prev) => ({
        ...prev,
        [activeReportId]: finalHistory,
      }))
    } catch (err: any) {
      console.error('Chat error:', err)
      toast.error(err.message || 'Failed to send message.')
    } finally {
      setIsSending(false)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleExport = async () => {
    try {
      setIsExporting(true)
      // Small timeout to allow UI to update to "Generating..."
      await new Promise(resolve => setTimeout(resolve, 100))
      generateAnalysisPDF(data)
    } catch (error) {
      console.error('Failed to generate PDF:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const TABS = [
    { id: 'summary', label: 'Summary' },
    { id: 'conflicts', label: `Conflicts (${data.conflicts.length})`, badge: true, badgeColor: 'text-destructive' },
    { id: 'action-items', label: 'Action Items' },
    { id: 'knowledge', label: 'Knowledge Updates' },
    { id: 'chatbot', label: 'Meeting Chatbot 💬' }
  ]

  const QUICK_PROMPTS = [
    '✉️ Draft a professional email summary for stakeholders',
    '📌 List high-priority tasks with assigned owners',
    '⚠️ Explain detected conflicts in detail',
    '💡 What were the key technical decisions made?'
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start gap-4 fade-up">
        <div className="pr-4">
          <h1 className="text-2xl font-extrabold mb-1 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">{data.title || data.summary?.split('.')[0] || 'Analysis Report'}</h1>
          <p className="text-muted-foreground text-[10px] font-mono tracking-widest uppercase flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 glow-pulse"></span>
            Analysis completed on {data.createdAt ? new Date(data.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}
          </p>
        </div>
        <div className="gradient-border rounded-lg shrink-0">
          <Button onClick={handleExport} disabled={isExporting} className="bg-background/80 hover:bg-transparent border-none text-white shadow-none transition-all">
            {isExporting ? 'Generating...' : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10 mb-8 flex gap-2 overflow-x-auto fade-up p-1" style={{ animationDelay: '0.1s' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all shrink-0 uppercase tracking-wider ${
              activeTab === tab.id
                ? 'border-primary text-primary bg-primary/10 rounded-t-xl'
                : 'border-transparent text-muted-foreground hover:text-white hover:bg-white/5 rounded-t-xl'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="space-y-6">
        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="space-y-4 fade-up max-w-5xl mx-auto" style={{ animationDelay: '0.2s' }}>
            <div className="glass p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <h2 className="text-lg font-bold mb-3 text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Meeting Intelligence Summary
              </h2>
              <p className="text-white/80 leading-relaxed text-sm">{data.summary}</p>
            </div>

            <div className="glass p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-accent" />
              <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-accent" />
                Architectural & Strategic Decisions
              </h2>
              <ol className="space-y-3">
                {data.decisions.map((decision: string, idx: number) => (
                  <li key={idx} className="flex gap-3 items-start bg-black/20 p-3 rounded-xl border border-white/5 hover:border-accent/30 transition-colors">
                    <span className="font-mono font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded text-xs shrink-0">{(idx + 1).toString().padStart(2, '0')}</span>
                    <span className="text-white/80 leading-relaxed pt-0.5 text-sm">{decision}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {/* Conflicts Tab */}
        {activeTab === 'conflicts' && (
          <div className="space-y-4 fade-up max-w-5xl mx-auto" style={{ animationDelay: '0.2s' }}>
            {data.conflicts.length === 0 ? (
              <div className="glass border-emerald-500/30 bg-emerald-500/5 rounded-xl p-5 flex items-center justify-center gap-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 glow-pulse flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-emerald-400 mb-0.5 text-base">System Integrity Verified</h3>
                  <p className="text-white/70 text-xs">Your meeting decisions align perfectly with your existing notes.</p>
                </div>
              </div>
            ) : (
              data.conflicts.map((conflict: any) => (
                <InteractiveCard3D key={conflict.id}>
                  <div className="glass border-l-4 border-l-destructive/80 p-5 space-y-4 hover:border-l-destructive transition-all hover:bg-white/[0.03] rounded-xl">
                    {/* Side-by-Side 2-Column Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch relative">
                      {/* Left: Meeting Decision */}
                      <div className="space-y-1.5 p-3.5 rounded-lg bg-destructive/5 border border-destructive/15 flex flex-col">
                        <p className="text-[10px] font-bold text-destructive/90 uppercase tracking-widest flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-destructive glow-pulse"></span>
                          Meeting Decision
                        </p>
                        <p className="text-white/90 font-medium text-sm leading-relaxed">{conflict.meetingDecision}</p>
                      </div>

                      {/* Right: Contradicts Note */}
                      <div className="space-y-1.5 p-3.5 rounded-lg bg-white/[0.02] border border-white/10 flex flex-col">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-white/40"></span>
                          Contradicts Your Note
                        </p>
                        <p className="text-white/80 text-xs leading-relaxed">{conflict.conflictingNote}</p>
                      </div>
                    </div>

                    {/* Footer Explanation */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-3 border-t border-white/5 gap-3">
                      <p className="text-xs text-white/60 flex-1 leading-snug">{conflict.explanation}</p>
                      <div className="bg-destructive/10 text-destructive border border-destructive/20 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0">
                        {conflict.confidence}% Match
                      </div>
                    </div>
                  </div>
                </InteractiveCard3D>
              ))
            )}
          </div>
        )}

        {/* Action Items Tab */}
        {activeTab === 'action-items' && (
          <div className="overflow-x-auto glass rounded-2xl fade-up" style={{ animationDelay: '0.2s' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-black/40">
                  <th className="text-left py-4 px-6 w-12 rounded-tl-2xl"></th>
                  <th className="text-left py-4 px-6 font-bold text-muted-foreground uppercase tracking-wider text-xs">Task</th>
                  <th className="text-left py-4 px-6 font-bold text-muted-foreground uppercase tracking-wider text-xs">Owner</th>
                  <th className="text-left py-4 px-6 font-bold text-muted-foreground uppercase tracking-wider text-xs">Deadline</th>
                  <th className="text-left py-4 px-6 font-bold text-muted-foreground uppercase tracking-wider text-xs rounded-tr-2xl">Priority</th>
                </tr>
              </thead>
              <tbody>
                {actionItems.map((item: any, idx: number) => (
                  <tr key={idx} className={`border-b border-white/5 transition-colors hover:bg-white/5 ${idx % 2 === 0 ? 'bg-white/[0.02]' : ''} ${item.isCompleted ? 'opacity-40 grayscale' : ''}`}>
                    <td className="py-5 px-6 text-center">
                      <input 
                        type="checkbox" 
                        checked={!!item.isCompleted} 
                        onChange={() => handleToggleActionItem(idx)}
                        className="w-5 h-5 accent-emerald-500 cursor-pointer transition-transform hover:scale-110 bg-black/50 border-white/20 rounded"
                      />
                    </td>
                    <td className={`py-5 px-6 text-white font-medium ${item.isCompleted ? 'line-through text-muted-foreground' : ''}`}>{item.task}</td>
                    <td className="py-5 px-6 text-white/80">{item.owner}</td>
                    <td className="py-5 px-6 text-white/80 font-mono text-xs">{item.deadline}</td>
                    <td className="py-5 px-6">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          item.priority === 'High'
                            ? 'bg-destructive/20 text-destructive border border-destructive/30'
                            : item.priority === 'Medium'
                            ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {item.priority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Knowledge Updates Tab */}
        {activeTab === 'knowledge' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 fade-up max-w-7xl mx-auto" style={{ animationDelay: '0.2s' }}>
            {data.knowledgeGaps.map((gap: any, idx: number) => (
              <InteractiveCard3D key={idx}>
                <div className="space-y-3 glass p-5 border-white/5 hover:border-cyan-400/30 transition-colors h-full flex flex-col">
                  <h3 className="font-bold text-cyan-400 flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 glow-pulse"></span>
                    {gap.topic}
                  </h3>
                  <p className="text-white/80 text-xs leading-relaxed flex-1">{gap.suggestion}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(gap.suggestion, `gap-${idx}`)}
                    className="w-full bg-white/5 hover:bg-white/10 text-white border-white/10"
                  >
                    {copiedId === `gap-${idx}` ? (
                      <>
                        <Check className="w-4 h-4 mr-2 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy to Clipboard
                      </>
                    )}
                  </Button>
                </div>
              </InteractiveCard3D>
            ))}
          </div>
        )}

        {/* Meeting Chatbot Tab */}
        {activeTab === 'chatbot' && (
          <div className="glass rounded-xl flex flex-col h-[600px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border-white/10 fade-up" style={{ animationDelay: '0.2s' }}>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10 bg-black/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 glow-pulse">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Meeting AI Assistant</h3>
                  <p className="text-xs text-white/60">Ask follow-up questions or draft summaries based on this meeting</p>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-transparent to-black/20">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary glow-pulse">
                    <Bot className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xl text-white mb-2">How can I assist you?</h4>
                    <p className="text-sm text-white/60 max-w-md leading-relaxed">
                      Ask me to draft emails, analyze specific speaker points, explain decisions, or detail high-priority tasks.
                    </p>
                  </div>

                  {/* Quick Prompts */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl pt-4">
                    {QUICK_PROMPTS.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(prompt)}
                        className="text-left text-sm p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50 text-white/90 transition-all duration-300 hover:-translate-y-1"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs shrink-0 border ${
                        msg.role === 'user' ? 'bg-accent/20 text-accent border-accent/30' : 'bg-primary/20 text-primary border-primary/30'
                      }`}
                    >
                      {msg.role === 'user' ? <UserIcon className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                    </div>

                    <div
                      className={`max-w-[80%] rounded-2xl p-5 text-sm whitespace-pre-wrap leading-relaxed shadow-lg ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-tr-none border border-indigo-400/50'
                          : 'glass border-white/10 text-white/90 rounded-tl-none bg-black/40'
                      }`}
                    >
                      {msg.content}

                      {msg.role === 'assistant' && (
                        <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
                          <button
                            onClick={() => copyToClipboard(msg.content, `chat-${idx}`)}
                            className="text-xs text-white/50 hover:text-white flex items-center gap-1.5 transition-colors"
                          >
                            {copiedId === `chat-${idx}` ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> Copy
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {isSending && (
                <div className="flex items-center gap-4 fade-up">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0 border border-primary/30">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="glass border-white/10 bg-black/40 rounded-2xl rounded-tl-none p-4 text-sm text-white/60 flex items-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    Processing network request...
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-white/10 bg-black/40">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSendMessage()
                }}
                className="flex gap-3"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask a question or request a draft based on this meeting..."
                  disabled={isSending}
                  className="flex-1 glass border-white/10 bg-black/60 px-5 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary rounded-xl transition-all"
                />
                <div className="gradient-border rounded-xl">
                  <Button type="submit" disabled={!inputMessage.trim() || isSending} size="lg" className="h-full bg-background/80 hover:bg-transparent border-none text-white shadow-none px-6">
                    {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Back Button */}
      <div className="mt-12 pt-8 border-t border-white/10 flex justify-center fade-up" style={{ animationDelay: '0.4s' }}>
        <Button variant="ghost" onClick={onBack} className="glass text-white/80 hover:text-white border-white/10 hover:bg-white/10 px-8 py-6 h-auto">
          &larr; Back to Dashboard
        </Button>
      </div>
    </div>
  )
}
