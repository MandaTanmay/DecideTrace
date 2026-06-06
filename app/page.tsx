'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Brain, Zap, Target, BookOpen } from 'lucide-react'
import { InteractiveCard3D } from '@/components/3d/interactive-card-3d'
import { AnimatedBackground } from '@/components/3d/animated-background'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold">MeetMind</span>
          </div>
          <div className="flex gap-3">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/signup">
              <Button>Sign Up</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[80vh] py-20 px-4 sm:px-6 lg:px-8 overflow-hidden flex items-center">
        <AnimatedBackground />
        
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-30" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e1e2e_1px,transparent_1px),linear-gradient(to_bottom,#1e1e2e_1px,transparent_1px)] bg-[size:50px_50px] opacity-20" />
        
        <div className="relative max-w-4xl mx-auto text-center w-full">
          <div className="mb-8 animate-bounce" style={{ animationDuration: '3s' }}>
            <div className="inline-block w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent p-1 opacity-80">
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                <Brain className="w-12 h-12 text-accent" />
              </div>
            </div>
          </div>
          
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6">
            Your meetings make decisions.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Your notes store old ones.
            </span>{' '}
            Nobody compares them. We do.
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            MeetMind is your AI-powered meeting analyst. Automatically detect conflicts between meeting decisions and your existing notes, extract action items, and discover knowledge gaps in seconds.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto group">
                Get Started Free
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              See How It Works
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-16">How It Works</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: 1,
              title: 'Paste Your Meeting Transcript',
              description: 'Share your meeting transcript and existing notes',
              icon: '📝'
            },
            {
              step: 2,
              title: 'AI Analysis',
              description: 'Our AI agents analyze, compare and detect conflicts',
              icon: '⚡'
            },
            {
              step: 3,
              title: 'Get Your Report',
              description: 'Full report with conflicts, action items and knowledge gaps',
              icon: '📊'
            }
          ].map((item) => (
            <div key={item.step} className="relative">
              <InteractiveCard3D className="h-full">
                <div className="text-center">
                  <div className="text-5xl mb-4">{item.icon}</div>
                  <h3 className="text-lg font-semibold mb-2">Step {item.step}</h3>
                  <h4 className="text-base font-medium text-accent mb-3">{item.title}</h4>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </InteractiveCard3D>
              {item.step < 3 && (
                <div className="hidden md:flex absolute top-1/2 -right-4 transform -translate-y-1/2">
                  <ArrowRight className="w-8 h-8 text-primary" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/30 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">Powerful Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                icon: Zap,
                title: 'Conflict Detection',
                description: 'Automatically finds contradictions between meeting decisions and your notes'
              },
              {
                icon: Target,
                title: 'Action Items',
                description: 'Extracts tasks with owners and deadlines from your meetings'
              },
              {
                icon: BookOpen,
                title: 'Knowledge Gaps',
                description: 'Identifies topics not covered in your existing notes'
              },
              {
                icon: Brain,
                title: 'Memory System',
                description: 'Gets smarter with every meeting you analyze'
              }
            ].map((feature, idx) => {
              const Icon = feature.icon
              return (
                <InteractiveCard3D key={idx}>
                  <Icon className="w-8 h-8 text-accent mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </InteractiveCard3D>
              )
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background/50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center text-muted-foreground">
          <p>&copy; 2024 MeetMind. AI-powered meeting intelligence. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
