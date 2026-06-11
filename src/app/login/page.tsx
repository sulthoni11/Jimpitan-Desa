'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        throw new Error(signInError.message)
      }

      router.push('/')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat login.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', minHeight: '100vh' }}>
      <div className="app-content animate-fade-in" style={{ justifyContent: 'center' }}>
        
        {/* Header/Logo */}
        <div className="text-center mb-4">
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, var(--accent) 0%, #6d28d9 100%)',
            boxShadow: '0 8px 24px var(--accent-glow)',
            marginBottom: '16px'
          }}>
            <LogIn size={32} color="#fff" />
          </div>
          <h1>Jimpitan QR</h1>
          <p className="muted mt-4" style={{ fontSize: '0.95rem' }}>
            Masuk sebagai petugas RT untuk mencatat jimpitan warga.
          </p>
        </div>

        {/* Card Form */}
        <div className="glass-card">
          <form onSubmit={handleLogin}>
            
            {/* Error Message */}
            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 14px',
                borderRadius: 'var(--border-radius-md)',
                background: 'var(--danger-light)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: 'var(--danger)',
                fontSize: '0.875rem',
                marginBottom: '16px'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} /> Email Petugas
                </span>
              </label>
              <input
                id="email"
                type="email"
                placeholder="petugas1@jimpitan.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                required
                disabled={loading}
              />
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label className="form-label" htmlFor="password">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={14} /> Password
                </span>
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                required
                disabled={loading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary w-full mt-4"
              disabled={loading}
            >
              {loading ? 'Memverifikasi...' : 'Masuk Sekarang'}
            </button>
          </form>
        </div>

        {/* Footer Info */}
        <div className="text-center muted" style={{ fontSize: '0.75rem', marginTop: '16px' }}>
          Aplikasi Jimpitan RT v1.0.0 &bull; Supabase & Next.js
        </div>

      </div>
    </main>
  )
}
