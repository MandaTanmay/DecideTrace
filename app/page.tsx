'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Brain, Zap, Target, BookOpen, ChevronRight } from 'lucide-react'
import { InteractiveCard3D } from '@/components/3d/interactive-card-3d'
import { AnimatedBackground } from '@/components/3d/animated-background'
import { useEffect, useState } from 'react'

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground starfield-bg selection:bg-primary/30 selection:text-primary-foreground">
      {/* Navbar - Glassmorphism */}
      <nav className="fixed top-0 w-full z-50 glass border-b-0 rounded-none bg-background/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="w-8 h-8 rounded-xl gradient-border flex items-center justify-center glow-pulse bg-background">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">DecideTrace</span>
          </div>
          <div className="flex gap-3 fade-up" style={{ animationDelay: '0.2s' }}>
            <Link href="/login">
              <Button variant="ghost" className="hover:bg-white/5 text-muted-foreground hover:text-white">Login</Button>
            </Link>
            <Link href="/signup">
              <div className="gradient-border group cursor-pointer rounded-md">
                <Button className="bg-background/80 hover:bg-transparent transition-all group-hover:text-white border-none shadow-none text-foreground w-full">
                  Sign Up
                </Button>
              </div>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <AnimatedBackground />
        
        {/* Floating gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] mix-blend-screen animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[120px] mix-blend-screen animate-float" style={{ animationDelay: '-3s' }} />
        
        <div className="relative max-w-5xl mx-auto text-center w-full z-10 pt-16">
          <div className="mb-8 flex justify-center fade-up">
            
          </div>
          
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1] fade-up" style={{ animationDelay: '0.1s' }}>
            Your meetings make decisions.<br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-primary to-cyan-400 drop-shadow-[0_0_30px_rgba(99,102,241,0.3)]">
              We make sure you keep them.
            </span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto fade-up font-light leading-relaxed" style={{ animationDelay: '0.2s' }}>
            The AI intelligence layer for your engineering team. Automatically detect conflicts between meeting decisions and your technical docs in real-time.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center fade-up" style={{ animationDelay: '0.3s' }}>
            <Link href="/signup">
              <div className="gradient-border group p-[1px] cursor-pointer rounded-lg hover:scale-105 transition-transform duration-300">
                <Button size="lg" className="h-14 px-8 text-lg bg-background hover:bg-transparent transition-all group-hover:text-white border-none shadow-[0_0_40px_rgba(99,102,241,0.4)] w-full sm:w-auto">
                  Start Analyzing Free
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </Link>
            <Button size="lg" variant="ghost" className="h-14 px-8 text-lg glass hover:bg-white/10 text-muted-foreground hover:text-white w-full sm:w-auto">
              View Interactive Demo
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-20 fade-up">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-6">Pipeline Intelligence</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Drop in your transcript. We map the graph, detect the contradictions, and update your knowledge base.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: 'Ingest & Embed',
              description: 'Vectorize your meeting transcripts and existing engineering standards instantly.',
              icon: '🚀'
            },
            {
              step: '02',
              title: 'Graph Resolution',
              description: 'Multi-agent DAG pipeline detects architectural conflicts and extracts action items.',
              icon: '⚡'
            },
            {
              step: '03',
              title: 'Telemetry & Insights',
              description: 'Visualize decision trees in real-time via 3D force graphs and trace inspectors.',
              icon: '🌌'
            }
          ].map((item, i) => (
            <div key={item.step} className="fade-up relative group" style={{ animationDelay: `${i * 0.2}s` }}>
              <InteractiveCard3D className="h-full">
                <div className="glass p-8 rounded-2xl h-full border border-white/5 group-hover:border-primary/50 transition-colors duration-500 bg-background/40 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 text-6xl font-black text-white/5 select-none transition-transform duration-500 group-hover:scale-110 group-hover:text-primary/10">
                    {item.step}
                  </div>
                  <div className="text-4xl mb-6">{item.icon}</div>
                  <h4 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                    {item.title}
                  </h4>
                  <p className="text-muted-foreground leading-relaxed relative z-10">{item.description}</p>
                </div>
              </InteractiveCard3D>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 relative z-10 border-t border-white/5 bg-gradient-to-b from-transparent to-black/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: Zap,
                title: 'Real-Time Conflict Detection',
                description: 'Our agents cross-reference meeting decisions against historical notes using high-dimensional embeddings to flag contradictions before they break production.',
                color: 'text-yellow-400',
                bg: 'bg-yellow-400/10'
              },
              {
                icon: Target,
                title: 'Action Item Extraction',
                description: 'Automatically pull out tasks, deadlines, and owners. No more "who was supposed to do that?" follow-ups on Slack.',
                color: 'text-emerald-400',
                bg: 'bg-emerald-400/10'
              },
              {
                icon: BookOpen,
                title: 'Knowledge Graph Updates',
                description: 'We do not just summarize. We build a living, breathing 3D graph of your team\'s collective intelligence and decisions.',
                color: 'text-cyan-400',
                bg: 'bg-cyan-400/10'
              },
              {
                icon: Brain,
                title: 'LangGraph Orchestration',
                description: 'Built on state-of-the-art multi-agent architectures, providing deep introspection via our custom telemetry trace viewer.',
                color: 'text-primary',
                bg: 'bg-primary/10'
              }
            ].map((feature, idx) => {
              const Icon = feature.icon
              return (
                <div key={idx} className="fade-up" style={{ animationDelay: `${idx * 0.15}s` }}>
                  <div className="glass p-8 rounded-2xl hover:bg-white/[0.04] transition-colors border-white/5 hover:border-white/10 group h-full">
                    <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4 relative z-10 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center fade-up glass p-16 rounded-3xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
          <h2 className="text-4xl font-bold mb-6 text-white relative z-10">Stop losing knowledge.</h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto relative z-10">
            Join the elite engineering teams using DecideTrace to maintain architectural integrity and accelerate shipping.
          </p>
          <Link href="/signup">
            <Button size="lg" className="h-14 px-10 text-lg bg-white text-black hover:bg-gray-200 hover:scale-105 transition-all duration-300 relative z-10 shadow-[0_0_30px_rgba(255,255,255,0.3)]">
              Deploy DecideTrace
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 glass bg-black/60 py-12 px-4 sm:px-6 lg:px-8 relative z-10 rounded-none">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <span className="font-bold tracking-tight text-white">DecideTrace</span>
          </div>
          <div className="text-muted-foreground text-sm">
            &copy; {new Date().getFullYear()} DecideTrace Intelligence. All systems operational.
          </div>
        </div>
      </footer>
    </div>
  )
}
