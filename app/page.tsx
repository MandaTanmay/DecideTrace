import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Brain, Zap, Target, BookOpen } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-accent" />
            <span className="text-xl font-bold">Second Brain</span>
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
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-30" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e1e2e_1px,transparent_1px),linear-gradient(to_bottom,#1e1e2e_1px,transparent_1px)] bg-[size:50px_50px] opacity-20" />
        
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6">
            Your meetings make decisions.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Your notes store old ones.
            </span>{' '}
            Nobody compares them. We do.
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Meet your AI-powered meeting analyst. Automatically detect conflicts between meeting decisions and your existing notes, extract action items, and discover knowledge gaps.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started Free
                <ArrowRight className="ml-2 w-4 h-4" />
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
              description: 'Our 5 AI agents analyze, compare and detect conflicts',
              icon: '🤖'
            },
            {
              step: 3,
              title: 'Get Your Report',
              description: 'Full report with conflicts, action items and knowledge gaps',
              icon: '📊'
            }
          ].map((item) => (
            <div key={item.step} className="relative">
              <div className="bg-card border border-border rounded-lg p-8 text-center h-full">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-lg font-semibold mb-2">Step {item.step}: {item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
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
                <div key={idx} className="bg-card border border-border rounded-lg p-6 hover:border-primary transition-colors">
                  <Icon className="w-8 h-8 text-accent mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background/50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center text-muted-foreground">
          <p>&copy; 2024 Second Brain Meeting Agent. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
