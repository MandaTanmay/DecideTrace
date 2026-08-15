'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Workflow, ArrowLeft, Loader2, KeyRound, AlertCircle } from 'lucide-react'
import { AnimatedBackground } from '@/components/3d/animated-background'
import { toast } from 'sonner'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const passwordChecks = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    match: newPassword.length > 0 && newPassword === confirmPassword,
  }

  const isPasswordValid =
    passwordChecks.length &&
    passwordChecks.upper &&
    passwordChecks.number &&
    passwordChecks.special &&
    passwordChecks.match

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      toast.error('Invalid password reset URL. Please request a new reset link.')
      return
    }

    if (!isPasswordValid) {
      toast.error('Please ensure your password meets all requirements and matches the confirmation.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.message || 'Password reset failed.')
        return
      }

      toast.success('Password reset successfully! Redirecting to login...')
      setTimeout(() => {
        router.push('/login')
      }, 1500)
    } catch (error) {
      console.error('Reset password error:', error)
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="bg-card/50 backdrop-blur border border-border rounded-2xl p-8 shadow-2xl text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 text-destructive mb-2">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Missing Reset Token</h2>
        <p className="text-sm text-muted-foreground">
          This password reset link is invalid or incomplete. Please request a new link.
        </p>
        <Link href="/forgot-password">
          <Button className="w-full mt-2">Request Reset Link</Button>
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-card/50 backdrop-blur border border-border rounded-2xl p-8 shadow-2xl shadow-primary/10">
      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-foreground mb-2">
          New Password
        </label>
        <input
          type="password"
          id="newPassword"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          placeholder="••••••••"
          className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
          Confirm New Password
        </label>
        <input
          type="password"
          id="confirmPassword"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          placeholder="••••••••"
          className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      {newPassword && (
        <div className="text-xs space-y-1 mt-3 p-3 bg-secondary/30 rounded-lg border border-border">
          <p className={passwordChecks.length ? 'text-emerald-400 font-medium' : 'text-muted-foreground'}>
            {passwordChecks.length ? '✓' : '•'} At least 8 characters
          </p>
          <p className={passwordChecks.upper ? 'text-emerald-400 font-medium' : 'text-muted-foreground'}>
            {passwordChecks.upper ? '✓' : '•'} At least one uppercase letter (A-Z)
          </p>
          <p className={passwordChecks.number ? 'text-emerald-400 font-medium' : 'text-muted-foreground'}>
            {passwordChecks.number ? '✓' : '•'} At least one number (0-9)
          </p>
          <p className={passwordChecks.special ? 'text-emerald-400 font-medium' : 'text-muted-foreground'}>
            {passwordChecks.special ? '✓' : '•'} At least one special character (!@#$%^&*)
          </p>
          <p className={passwordChecks.match ? 'text-emerald-400 font-medium' : 'text-muted-foreground'}>
            {passwordChecks.match ? '✓' : '•'} Passwords match
          </p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading || !isPasswordValid}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Updating Password...
          </>
        ) : (
          'Reset Password'
        )}
      </Button>

      <div className="mt-4 pt-4 border-t border-border text-center">
        <Link href="/login" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3 h-3 mr-1" /> Back to Login
        </Link>
      </div>
    </form>
  )
}

export default function ResetPasswordPage() {
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
          <h1 className="text-2xl font-bold mb-2">Set New Password</h1>
          <p className="text-muted-foreground text-sm">
            Enter and confirm your new password below.
          </p>
        </div>

        <Suspense fallback={
          <div className="bg-card/50 border border-border p-8 rounded-2xl flex justify-center items-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
