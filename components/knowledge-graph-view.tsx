'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'

export function KnowledgeGraphView() {
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [FG, setFG] = useState<any>(null)
  const fgRef = useRef<any>(null)
  const [containerW, setContainerW] = useState(0)

  // Filters
  const [filters, setFilters] = useState({
    meetings: true,
    decisions: true,
    topics: true,
    conflicts: true,
  })

  // ── Dynamically load ForceGraph3D on client only ────────────────────────
  useEffect(() => {
    import('react-force-graph-3d').then((mod) => {
      setFG(() => mod.default)
    })
  }, [])

  // ── Ref callback — fires the instant the div is in the DOM ─────────────
  const containerRefCallback = useCallback((el: HTMLDivElement | null) => {
    if (!el) return
    const measure = () => {
      const w = el.getBoundingClientRect().width
      if (w > 0) setContainerW(w)
    }
    measure()
    // Also re-measure on window resize
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // ── Fetch Graph Data ───────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/knowledge-graph')
      .then((res) => {
        if (!res.ok) throw new Error(`API error ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setGraphData(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('[KnowledgeGraphView]', err)
        setError('Failed to load knowledge graph data.')
        setLoading(false)
      })
  }, [])

  // ── Camera fly-to on node click ────────────────────────────────────────
  const handleNodeClick = useCallback((node: any) => {
    if (!fgRef.current) return
    const dist = 80
    const mag = Math.hypot(node.x ?? 1, node.y ?? 1, node.z ?? 1)
    const ratio = 1 + dist / mag
    fgRef.current.cameraPosition(
      { x: node.x * ratio, y: node.y * ratio, z: node.z * ratio },
      node,
      1200
    )
  }, [])

  // ── Filter + deep-clone data (prevents d3-force mutation bugs) ─────────
  const filteredData = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] }

    const groups = [
      ...(filters.meetings ? [1] : []),
      ...(filters.decisions ? [2] : []),
      ...(filters.topics ? [3] : []),
      ...(filters.conflicts ? [4] : []),
    ]

    const nodes = graphData.nodes
      .filter((n) => groups.includes(n.group))
      .map((n) => ({ ...n }))

    const nodeIds = new Set(nodes.map((n) => n.id))

    const links = graphData.links
      .filter((l) => {
        const s = typeof l.source === 'object' ? l.source.id : l.source
        const t = typeof l.target === 'object' ? l.target.id : l.target
        return nodeIds.has(s) && nodeIds.has(t)
      })
      .map((l) => ({
        ...l,
        source: typeof l.source === 'object' ? l.source.id : l.source,
        target: typeof l.target === 'object' ? l.target.id : l.target,
      }))

    return { nodes, links }
  }, [graphData, filters])

  // ── Node colour by group ───────────────────────────────────────────────
  const nodeColor = useCallback((node: any) => {
    if (node.group === 1) return '#3b82f6'
    if (node.group === 2) return '#6366f1'
    if (node.group === 3) return '#10b981'
    if (node.group === 4) return '#f43f5e'
    return '#ffffff'
  }, [])

  // ── Early-return states ────────────────────────────────────────────────
  if (loading || !FG) {
    return (
      <div className="w-full h-[700px] relative flex items-center justify-center rounded-2xl overflow-hidden bg-black border border-white/10">
        {/* Ambient glow background */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(99,102,241,0.12) 0%, transparent 70%)'
        }} />

        {/* CSS Keyframes injected via style tag */}
        <style>{`
          @keyframes mm-spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes mm-spin-rev  { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
          @keyframes mm-pulse-ring { 0%,100%{opacity:.15;transform:scale(1)} 50%{opacity:.45;transform:scale(1.08)} }
          @keyframes mm-node-pop   { 0%{opacity:0;transform:scale(0)} 60%{transform:scale(1.2)} 100%{opacity:1;transform:scale(1)} }
          @keyframes mm-dash       { to { stroke-dashoffset: 0; } }
          @keyframes mm-fade-cycle { 0%,100%{opacity:.3} 50%{opacity:1} }
          @keyframes mm-float      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        `}</style>

        {/* Central nucleus */}
        <div style={{ position: 'relative', width: 260, height: 260 }}>

          {/* Outer pulse ring 3 */}
          <div style={{
            position:'absolute', inset: -24, borderRadius:'50%',
            border:'1px solid rgba(99,102,241,0.2)',
            animation:'mm-pulse-ring 3.5s ease-in-out infinite',
          }} />
          {/* Outer pulse ring 2 */}
          <div style={{
            position:'absolute', inset: -8, borderRadius:'50%',
            border:'1px solid rgba(99,102,241,0.35)',
            animation:'mm-pulse-ring 2.8s ease-in-out infinite 0.4s',
          }} />

          {/* Orbit ring 1 — spins clockwise */}
          <div style={{
            position:'absolute', inset: 10, borderRadius:'50%',
            border:'1px dashed rgba(99,102,241,0.25)',
            animation:'mm-spin-slow 8s linear infinite',
          }}>
            {/* Meeting node — blue */}
            <div style={{
              position:'absolute', top:-8, left:'calc(50% - 8px)',
              width:16, height:16, borderRadius:'50%',
              background:'#3b82f6', boxShadow:'0 0 12px #3b82f6, 0 0 24px rgba(59,130,246,0.5)',
              animation:'mm-node-pop 0.5s ease-out forwards, mm-fade-cycle 2s ease-in-out 0.5s infinite',
            }} />
            {/* Decision node — indigo */}
            <div style={{
              position:'absolute', bottom:-8, left:'calc(50% - 8px)',
              width:14, height:14, borderRadius:'50%',
              background:'#6366f1', boxShadow:'0 0 10px #6366f1, 0 0 20px rgba(99,102,241,0.5)',
              animation:'mm-node-pop 0.6s 0.1s ease-out forwards, mm-fade-cycle 2.3s ease-in-out 0.6s infinite',
            }} />
          </div>

          {/* Orbit ring 2 — spins counter-clockwise */}
          <div style={{
            position:'absolute', inset: 40, borderRadius:'50%',
            border:'1px dashed rgba(16,185,129,0.2)',
            animation:'mm-spin-rev 12s linear infinite',
          }}>
            {/* Topic node — emerald */}
            <div style={{
              position:'absolute', top:-7, left:'calc(50% - 7px)',
              width:14, height:14, borderRadius:'50%',
              background:'#10b981', boxShadow:'0 0 10px #10b981, 0 0 20px rgba(16,185,129,0.5)',
              animation:'mm-node-pop 0.7s 0.2s ease-out forwards, mm-fade-cycle 2.1s ease-in-out 0.7s infinite',
            }} />
            {/* Conflict node — rose */}
            <div style={{
              position:'absolute', bottom:-7, right:'calc(50% - 7px)',
              width:13, height:13, borderRadius:'50%',
              background:'#f43f5e', boxShadow:'0 0 10px #f43f5e, 0 0 22px rgba(244,63,94,0.6)',
              animation:'mm-node-pop 0.8s 0.3s ease-out forwards, mm-fade-cycle 1.9s ease-in-out 0.8s infinite',
            }} />
          </div>

          {/* Central hub */}
          <div style={{
            position:'absolute', inset: 90,
            borderRadius:'50%',
            background:'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(200,200,255,0.7) 60%, rgba(99,102,241,0.4) 100%)',
            boxShadow:'0 0 20px rgba(255,255,255,0.6), 0 0 60px rgba(99,102,241,0.4), 0 0 100px rgba(99,102,241,0.2)',
            animation:'mm-float 3s ease-in-out infinite',
          }} />
        </div>

        {/* Text below */}
        <div style={{ position:'absolute', bottom: 80, textAlign:'center' }}>
          <p style={{
            color:'rgba(255,255,255,0.9)', fontSize:15, fontWeight:600,
            letterSpacing:'0.04em', marginBottom:8,
          }}>
            {loading ? 'Loading knowledge graph...' : 'Initialising 3D WebGL engine...'}
          </p>
          <div style={{ display:'flex', gap:6, justifyContent:'center' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width:5, height:5, borderRadius:'50%',
                background:'rgba(99,102,241,0.7)',
                animation:`mm-fade-cycle 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        </div>

        {/* Legend hint */}
        <div style={{
          position:'absolute', bottom: 32,
          display:'flex', gap:16, alignItems:'center',
        }}>
          {[['#3b82f6','Meetings'],['#6366f1','Decisions'],['#10b981','Topics'],['#f43f5e','Conflicts']].map(([c,l]) => (
            <div key={l} style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:8,height:8,borderRadius:'50%',background:c as string, boxShadow:`0 0 6px ${c}` }} />
              <span style={{ color:'rgba(255,255,255,0.35)', fontSize:11 }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-[700px] flex items-center justify-center border border-border rounded-2xl bg-destructive/10 text-destructive">
        <p>{error}</p>
      </div>
    )
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="w-full h-[700px] flex items-center justify-center border border-border rounded-2xl bg-card/50 text-muted-foreground">
        <p>Your knowledge graph is empty. Analyse a meeting first!</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRefCallback}
      className="w-full h-[700px] bg-black border border-white/10 rounded-2xl relative shadow-2xl"
      style={{ overflow: 'hidden' }}
    >
      {/* ── Filters overlay ─────────────────────────────────────────── */}
      <div className="absolute top-4 left-4 z-10 bg-black/70 backdrop-blur-md p-4 rounded-xl border border-white/10 text-sm">
        <h3 className="font-bold mb-3 text-white text-xs uppercase tracking-widest">Legend & Filters</h3>
        {[
          { key: 'meetings', label: 'Meetings', color: 'bg-blue-500' },
          { key: 'topics', label: 'Topics', color: 'bg-emerald-500' },
          { key: 'decisions', label: 'Decisions', color: 'bg-indigo-500' },
          { key: 'conflicts', label: 'Conflicts', color: 'bg-rose-500' },
        ].map(({ key, label, color }) => (
          <label key={key} className="flex items-center gap-2 mb-1.5 cursor-pointer text-gray-400 hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={filters[key as keyof typeof filters]}
              onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.checked }))}
              className="accent-indigo-500"
            />
            <span className={`w-2.5 h-2.5 rounded-full ${color} ${key === 'conflicts' ? 'shadow-[0_0_8px_rgba(244,63,94,0.9)]' : ''}`} />
            <span className="text-xs">{label}</span>
          </label>
        ))}
      </div>

      {/* ── Stats badge ─────────────────────────────────────────────── */}
      <div className="absolute top-4 right-4 z-10 bg-black/70 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 text-xs text-gray-400 space-y-0.5">
        <div><span className="text-white font-bold">{filteredData.nodes.length}</span> nodes</div>
        <div><span className="text-white font-bold">{filteredData.links.length}</span> edges</div>
      </div>

      {/* ── 3D Graph ─────────────────────────────────────────────────── */}
      {containerW > 0 && (
        <FG
          ref={fgRef}
          width={containerW}
          height={700}
          graphData={filteredData}
          nodeLabel="name"
          nodeColor={nodeColor}
          nodeVal={(n: any) => n.val ?? 4}
          nodeOpacity={0.95}
          nodeResolution={16}
          linkColor={(l: any) => l.type === 'conflict' ? '#f43f5e' : 'rgba(255,255,255,0.12)'}
          linkWidth={(l: any) => l.type === 'conflict' ? 1.5 : 0.4}
          linkDirectionalParticles={(l: any) => l.type === 'conflict' ? 5 : 0}
          linkDirectionalParticleWidth={2.5}
          linkDirectionalParticleColor={() => '#f43f5e'}
          linkDirectionalParticleSpeed={0.006}
          onNodeClick={handleNodeClick}
          backgroundColor="#000000"
          enableNodeDrag
        />
      )}
    </div>
  )
}
