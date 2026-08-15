import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface AnalysisResult {
  title: string
  summary: string
  decisions: string[]
  conflicts: Array<{
    meetingDecision: string
    conflictingNote: string
    confidence: number
    explanation: string
  }>
  actionItems: Array<{
    task: string
    owner: string
    deadline: string
    priority: string
  }>
  knowledgeGaps: Array<{
    topic: string
    suggestion: string
  }>
  createdAt: string
}

export function generateAnalysisPDF(data: AnalysisResult): void {
  // A4 size: 210 x 297 mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const MARGIN = 20
  const PAGE_WIDTH = doc.internal.pageSize.getWidth()
  const PAGE_HEIGHT = doc.internal.pageSize.getHeight()
  const USABLE_WIDTH = PAGE_WIDTH - 2 * MARGIN

  // Styling constants
  const COLOR_TEXT = '#1a1a1a'
  const COLOR_LINE = '#e5e7eb'
  const FONT = 'helvetica'

  let currentY = MARGIN

  // Helper: setup standard text
  const setFont = (style: 'normal' | 'bold' = 'normal', size: number = 10) => {
    doc.setFont(FONT, style)
    doc.setFontSize(size)
    doc.setTextColor(COLOR_TEXT)
  }

  // Helper: check page break
  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > PAGE_HEIGHT - MARGIN - 15) {
      doc.addPage()
      currentY = MARGIN
      return true
    }
    return false
  }

  // Helper: Draw horizontal line
  const drawLine = (y: number) => {
    doc.setDrawColor(COLOR_LINE)
    doc.setLineWidth(0.5)
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
  }

  // ── Page 1: Header ────────────────────────────────────────────────────────
  setFont('bold', 18)
  doc.text('MeetMind', MARGIN, currentY)
  currentY += 10

  const fullTitle = (data.summary && data.summary.split('.')[0]) || data.title || 'Meeting Analysis'
  const titleLines = doc.splitTextToSize(fullTitle, USABLE_WIDTH)
  setFont('bold', 14)
  doc.text(titleLines, MARGIN, currentY)
  currentY += (titleLines.length * 6) + 4

  const dateStr = data.createdAt ? new Date(data.createdAt).toLocaleDateString() : new Date().toLocaleDateString()
  setFont('normal', 10)
  doc.text(`Analysis completed on ${dateStr}`, MARGIN, currentY)
  currentY += 8

  drawLine(currentY)
  currentY += 10

  // ── Page 1: Meeting Summary ─────────────────────────────────────────────
  setFont('bold', 14)
  doc.text('Meeting Summary', MARGIN, currentY)
  currentY += 8

  setFont('normal', 10)
  const summaryLines = doc.splitTextToSize(data.summary, USABLE_WIDTH)
  doc.text(summaryLines, MARGIN, currentY)
  currentY += (summaryLines.length * 5) + 10

  setFont('bold', 14)
  doc.text('Key Decisions', MARGIN, currentY)
  currentY += 8

  if (!data.decisions || data.decisions.length === 0) {
    setFont('normal', 10)
    doc.text('No key decisions recorded.', MARGIN, currentY)
    currentY += 10
  } else {
    data.decisions.forEach((decision, idx) => {
      checkPageBreak(10)
      setFont('bold', 10)
      doc.text(`${idx + 1}.`, MARGIN, currentY)
      
      setFont('normal', 10)
      const decisionLines = doc.splitTextToSize(decision, USABLE_WIDTH - 6)
      doc.text(decisionLines, MARGIN + 6, currentY)
      currentY += (decisionLines.length * 5) + 2
    })
  }

  // ── Page 2: Conflicts ───────────────────────────────────────────────────
  doc.addPage()
  currentY = MARGIN

  setFont('bold', 14)
  const conflictsTitle = `Conflicts Detected (${data.conflicts?.length || 0})`
  doc.text(conflictsTitle, MARGIN, currentY)
  currentY += 10

  if (!data.conflicts || data.conflicts.length === 0) {
    setFont('normal', 10)
    doc.text('No conflicts detected.', MARGIN, currentY)
  } else {
    data.conflicts.forEach((conflict, idx) => {
      // Estimate height needed for this conflict block
      const estHeight = 40
      checkPageBreak(estHeight)

      const printLabelValue = (label: string, value: string, indent = 0) => {
        setFont('bold', 10)
        doc.text(label, MARGIN + indent, currentY)
        const labelWidth = doc.getTextWidth(label) + 2
        
        setFont('normal', 10)
        const valLines = doc.splitTextToSize(value, USABLE_WIDTH - indent - labelWidth)
        doc.text(valLines, MARGIN + indent + labelWidth, currentY)
        currentY += (valLines.length * 5) + 2
      }

      printLabelValue('Decision:', conflict.meetingDecision)
      printLabelValue('Contradicts:', conflict.conflictingNote)
      printLabelValue('Confidence:', `${conflict.confidence}%`)
      printLabelValue('Explanation:', conflict.explanation)

      currentY += 4
      if (idx < data.conflicts.length - 1) {
        drawLine(currentY)
        currentY += 6
      }
    })
  }

  // ── Page 3: Action Items ────────────────────────────────────────────────
  doc.addPage()
  currentY = MARGIN

  setFont('bold', 14)
  doc.text('Action Items', MARGIN, currentY)
  currentY += 8

  if (!data.actionItems || data.actionItems.length === 0) {
    setFont('normal', 10)
    doc.text('No action items recorded.', MARGIN, currentY)
  } else {
    const tableData = data.actionItems.map(item => [
      item.task,
      item.owner,
      item.deadline,
      item.priority
    ])

    autoTable(doc, {
      startY: currentY,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Task', 'Owner', 'Deadline', 'Priority']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241], font: FONT, fontSize: 10, fontStyle: 'bold' },
      bodyStyles: { font: FONT, fontSize: 10, textColor: '#1a1a1a' },
      didDrawPage: (data) => {
        currentY = data.cursor ? data.cursor.y + 10 : currentY
      }
    })
  }

  // ── Page 4: Knowledge Updates ───────────────────────────────────────────
  doc.addPage()
  currentY = MARGIN

  setFont('bold', 14)
  doc.text('Knowledge Updates', MARGIN, currentY)
  currentY += 10

  if (!data.knowledgeGaps || data.knowledgeGaps.length === 0) {
    setFont('normal', 10)
    doc.text('No knowledge updates generated.', MARGIN, currentY)
  } else {
    data.knowledgeGaps.forEach((gap, idx) => {
      checkPageBreak(30)
      
      setFont('bold', 10)
      const topicLines = doc.splitTextToSize(gap.topic, USABLE_WIDTH)
      doc.text(topicLines, MARGIN, currentY)
      currentY += (topicLines.length * 5) + 2

      setFont('normal', 10)
      const contentLines = doc.splitTextToSize(gap.suggestion, USABLE_WIDTH)
      doc.text(contentLines, MARGIN, currentY)
      currentY += (contentLines.length * 5) + 6

      if (idx < data.knowledgeGaps.length - 1) {
        drawLine(currentY)
        currentY += 6
      }
    })
  }

  // ── Add Footers to all pages ────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    
    // Draw footer line
    const footerY = PAGE_HEIGHT - 15
    drawLine(footerY - 3)

    setFont('normal', 8)
    doc.setTextColor('#6b7280') // muted gray
    
    // Left: Confidential
    doc.text('MeetMind — Confidential', MARGIN, footerY + 2)
    
    // Right: Page X of Y
    const pageStr = `Page ${i} of ${totalPages}`
    const textWidth = doc.getTextWidth(pageStr)
    doc.text(pageStr, PAGE_WIDTH - MARGIN - textWidth, footerY + 2)
  }

  // ── Generate Filename and Download ──────────────────────────────────────
  // Filename format: meetmind-[first-5-words-of-title-hyphenated]-[YYYY-MM-DD].pdf
  const titleWords = (data.title || 'analysis')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join('-') || 'report'
  
  const dateStrFileName = new Date().toISOString().split('T')[0]
  const fileName = `meetmind-${titleWords}-${dateStrFileName}.pdf`

  doc.save(fileName)
}
