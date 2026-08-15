'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Copy, AlertCircle, CheckCircle2, Download, MessageSquare, Send, Sparkles, Bot, User as UserIcon, Loader2 } from 'lucide-react'
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
      <div className="mb-8 flex justify-between items-start">
        <div className="pr-4">
          <h1 className="text-3xl font-bold mb-2 leading-tight">{data.summary.split('.')[0]}</h1>
          <p className="text-muted-foreground text-sm">Analysis completed on {data.createdAt ? new Date(data.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</p>
        </div>
        <Button onClick={handleExport} disabled={isExporting} variant="outline">
          {isExporting ? 'Generating...' : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </>
          )}
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-8 flex gap-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors shrink-0 ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
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
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-3">Meeting Summary</h2>
              <p className="text-foreground leading-relaxed">{data.summary}</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4">Key Decisions</h2>
              <ol className="space-y-3">
                {data.decisions.map((decision: string, idx: number) => (
                  <li key={idx} className="flex gap-3">
                    <span className="font-semibold text-primary min-w-6">{idx + 1}.</span>
                    <span className="text-foreground">{decision}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {/* Conflicts Tab */}
        {activeTab === 'conflicts' && (
          <div className="space-y-4">
            {data.conflicts.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-6 flex items-start gap-4">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-primary mb-1">No conflicts detected</h3>
                  <p className="text-muted-foreground">Your meeting decisions align perfectly with your existing notes.</p>
                </div>
              </div>
            ) : (
              data.conflicts.map((conflict: any) => (
                <InteractiveCard3D key={conflict.id}>
                  <div className="border-l-4 border-l-destructive pl-4 space-y-4">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Meeting Decision</p>
                      <p className="text-foreground">{conflict.meetingDecision}</p>
                    </div>

                    <div className="flex justify-center">
                      <AlertCircle className="w-5 h-5 text-destructive animate-pulse" />
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contradicts Your Note</p>
                      <p className="text-foreground">{conflict.conflictingNote}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <p className="text-sm text-muted-foreground">{conflict.explanation}</p>
                      <div className="bg-destructive/20 text-destructive px-3 py-1 rounded text-sm font-semibold">
                        {conflict.confidence}% confidence
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 w-12"></th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Task</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Owner</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Deadline</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Priority</th>
                </tr>
              </thead>
              <tbody>
                {actionItems.map((item: any, idx: number) => (
                  <tr key={idx} className={`border-b border-border ${idx % 2 === 0 ? 'bg-secondary/20' : ''} ${item.isCompleted ? 'opacity-50' : ''}`}>
                    <td className="py-4 px-4 text-center">
                      <input 
                        type="checkbox" 
                        checked={!!item.isCompleted} 
                        onChange={() => handleToggleActionItem(idx)}
                        className="w-5 h-5 accent-primary cursor-pointer transition-transform hover:scale-110"
                      />
                    </td>
                    <td className={`py-4 px-4 text-foreground ${item.isCompleted ? 'line-through' : ''}`}>{item.task}</td>
                    <td className="py-4 px-4 text-foreground">{item.owner}</td>
                    <td className="py-4 px-4 text-foreground text-sm">{item.deadline}</td>
                    <td className="py-4 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          item.priority === 'High'
                            ? 'bg-destructive/20 text-destructive'
                            : item.priority === 'Medium'
                            ? 'bg-yellow-500/20 text-yellow-500'
                            : 'bg-blue-500/20 text-blue-500'
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.knowledgeGaps.map((gap: any, idx: number) => (
              <InteractiveCard3D key={idx}>
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground text-accent">{gap.topic}</h3>
                  <p className="text-muted-foreground text-sm">{gap.suggestion}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(gap.suggestion, `gap-${idx}`)}
                    className="w-full"
                  >
                    {copiedId === `gap-${idx}` ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
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
          <div className="border border-border rounded-xl bg-card/50 flex flex-col h-[600px] overflow-hidden shadow-2xl">
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-card/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Meeting AI Assistant</h3>
                  <p className="text-xs text-muted-foreground">Ask follow-up questions or draft summaries based on this meeting</p>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">How can I assist you with this meeting?</h4>
                    <p className="text-xs text-muted-foreground max-w-md">
                      Ask me to draft emails, analyze specific speaker points, explain decisions, or detail high-priority tasks.
                    </p>
                  </div>

                  {/* Quick Prompts */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg pt-2">
                    {QUICK_PROMPTS.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(prompt)}
                        className="text-left text-xs p-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary hover:border-primary/50 text-foreground transition-all duration-200"
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
                    className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 ${
                        msg.role === 'user' ? 'bg-accent/20 text-accent' : 'bg-primary/20 text-primary'
                      }`}
                    >
                      {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    <div
                      className={`max-w-[80%] rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-tr-none'
                          : 'bg-card border border-border text-foreground rounded-tl-none'
                      }`}
                    >
                      {msg.content}

                      {msg.role === 'assistant' && (
                        <div className="mt-2 pt-2 border-t border-border/40 flex justify-end">
                          <button
                            onClick={() => copyToClipboard(msg.content, `chat-${idx}`)}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                          >
                            {copiedId === `chat-${idx}` ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" /> Copy
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
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-card border border-border rounded-xl p-3 text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    Thinking...
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-3 border-t border-border bg-card/80">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSendMessage()
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask a question or request a draft based on this meeting..."
                  disabled={isSending}
                  className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <Button type="submit" disabled={!inputMessage.trim() || isSending} size="sm">
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Back Button */}
      <div className="mt-8 pt-8 border-t border-border">
        <Button variant="outline" onClick={onBack}>
          Back to New Analysis
        </Button>
      </div>
    </div>
  )
}
