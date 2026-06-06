'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// Dynamically import to prevent SSR issues with canvas/window
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
      <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
      <p>Initializing graphics engine...</p>
    </div>
  )
})

export function KnowledgeGraphView() {
  const [graphData, setGraphData] = useState<{ nodes: any[], links: any[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fgRef = useRef<any>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    // Fetch Graph Data
    fetch('/api/knowledge-graph')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load graph data')
        return res.json()
      })
      .then(data => {
        setGraphData(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setError('Failed to load knowledge graph.')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        })
      }
    })
    
    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  useEffect(() => {
    if (graphData && fgRef.current && dimensions.width > 0) {
      setTimeout(() => {
        fgRef.current?.zoomToFit(400, 50)
      }, 500)
    }
  }, [graphData, dimensions.width])

  // Node styling callback
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name
    const fontSize = 12 / globalScale
    ctx.font = `${fontSize}px Sans-Serif`
    
    const textWidth = ctx.measureText(label).width
    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2)

    // Node colors by group
    // Group 1: Meeting (Blue)
    // Group 2: Decision (Indigo)
    // Group 3: Topic (Emerald)
    // Group 4: Conflict (Rose)
    let fillStyle = '#3b82f6' 
    if (node.group === 2) fillStyle = '#6366f1'
    if (node.group === 3) fillStyle = '#10b981'
    if (node.group === 4) fillStyle = '#f43f5e'

    ctx.fillStyle = fillStyle
    ctx.beginPath()
    ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false)
    ctx.fill()

    // Draw label only if zoomed in enough or if it's a large node
    if (globalScale > 1.5 || node.val > 10) {
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.fillText(label, node.x, node.y + node.val + fontSize)
    }
  }, [])

  if (loading) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center border border-border rounded-xl bg-card/50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !graphData) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center border border-border rounded-xl bg-destructive/10 text-destructive">
        <p>{error || 'No data available.'}</p>
      </div>
    )
  }

  if (graphData.nodes.length === 0) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center border border-border rounded-xl bg-card/50 text-muted-foreground">
        <p>Your knowledge graph is empty. Analyze some meetings to see the graph!</p>
      </div>
    )
  }

  return (
    <div className="w-full h-[700px] bg-black/40 border border-white/10 rounded-2xl overflow-hidden relative shadow-2xl" ref={containerRef}>
      <div className="absolute top-4 left-4 z-10 bg-background/80 backdrop-blur-md p-4 rounded-lg border border-border text-sm">
        <h3 className="font-bold mb-2">Graph Legend</h3>
        <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Meetings</div>
        <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Topics</div>
        <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-indigo-500"></div> Decisions</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500"></div> Conflicts</div>
      </div>
      
      {dimensions.width > 0 && (
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel="name"
          nodeCanvasObject={nodeCanvasObject}
          nodeRelSize={1}
          linkColor={(link: any) => link.type === 'conflict' ? 'rgba(244, 63, 94, 0.6)' : 'rgba(255, 255, 255, 0.15)'}
          linkWidth={(link: any) => link.type === 'conflict' ? 2 : 1}
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={(link: any) => link.type === 'conflict' ? 3 : 1.5}
          d3VelocityDecay={0.3}
          backgroundColor="transparent"
        />
      )}
    </div>
  )
}
