'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Brain } from 'lucide-react'
import { AnimatedBackground } from '@/components/3d/animated-background'
import { toast } from 'sonner'

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const passwordChecks = {
    length: formData.password.length >= 8,
    upper: /[A-Z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
  }

  const isPasswordValid = passwordChecks.length && passwordChecks.upper && passwordChecks.number && passwordChecks.special

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isPasswordValid) {
      toast.error('Password must be at least 8 characters long and include an uppercase letter, a number, and a special character.')
      return
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.message || 'Signup failed. Please try again.')
        return
      }
      toast.success('Account created successfully!')
      router.push('/dashboard')
    } catch (error) {
      toast.error('Network error. Please check your connection and try again.')
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
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold group-hover:text-accent transition-colors">DecideTrace</span>
          </Link>
          <h1 className="text-2xl font-bold mb-2">Create Account</h1>
          <p className="text-muted-foreground">Start analyzing your meetings today</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 bg-card/50 backdrop-blur border border-border rounded-2xl p-8 shadow-2xl shadow-primary/10">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="John Doe"
              className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="you@example.com"
              className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
              className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            {formData.password && (
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
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={formData.password.length > 0 && !isPasswordValid}>
            Create Account
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  )
}
