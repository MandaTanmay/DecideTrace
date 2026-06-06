'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Copy, AlertCircle, CheckCircle2, Download } from 'lucide-react'
import { InteractiveCard3D } from '@/components/3d/interactive-card-3d'
import { generateAnalysisPDF } from '@/src/lib/exportPdf'

interface AnalysisResultsProps {
  data: any
  onBack: () => void
}

export function AnalysisResults({ data, onBack }: AnalysisResultsProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'conflicts' | 'action-items' | 'knowledge'>('summary')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

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
    { id: 'knowledge', label: 'Knowledge Updates' }
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
      <div className="border-b border-border mb-8 flex gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
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
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Task</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Owner</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Deadline</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Priority</th>
                </tr>
              </thead>
              <tbody>
                {data.actionItems.map((item: any, idx: number) => (
                  <tr key={idx} className={`border-b border-border ${idx % 2 === 0 ? 'bg-secondary/20' : ''}`}>
                    <td className="py-4 px-4 text-foreground">{item.task}</td>
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
