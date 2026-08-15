'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Workflow, ArrowLeft, Loader2, CheckCircle2, KeyRound } from 'lucide-react'
import { AnimatedBackground } from '@/components/3d/animated-background'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setSuccessMessage(null)
    setDevResetUrl(null)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.message || 'Failed to process password reset request.')
        return
      }

      setSuccessMessage(data.message)
      if (data.devResetUrl) {
        setDevResetUrl(data.devResetUrl)
      }
      toast.success('Password reset request submitted.')
    } catch (error) {
      console.error('Forgot password error:', error)
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 relative overflow-hidden">
      <AnimatedBackground />
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent opacity-40" />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <Link href="/" className="flex items-center justify-center gap-2 mb-6 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center group-hover:scale-110 transition-transform">
              <Workflow className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold group-hover:text-accent transition-colors">DecideTrace</span>
          </Link>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-3">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Forgot Password</h1>
          <p className="text-muted-foreground text-sm">
            Enter your account email address and we&apos;ll generate a password reset link.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-card/50 backdrop-blur border border-border rounded-2xl p-8 shadow-2xl shadow-primary/10">
          {successMessage ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0 text-emerald-400" />
                <p className="text-sm leading-relaxed">{successMessage}</p>
              </div>

              {devResetUrl && (
                <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl text-xs space-y-2">
                  <p className="font-semibold text-primary">⚡ Dev Environment Reset Link:</p>
                  <Link
                    href={devResetUrl}
                    className="block p-2 bg-background border border-border rounded text-accent hover:underline break-all font-mono"
                  >
                    Click to Open Reset Password Page
                  </Link>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => {
                  setSuccessMessage(null)
                  setDevResetUrl(null)
                }}
              >
                Send Another Request
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-border text-center">
            <Link href="/login" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-3 h-3 mr-1" /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
