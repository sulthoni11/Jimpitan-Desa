'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  UserPlus, User, CheckCircle2, AlertCircle,
  LogOut, QrCode
} from 'lucide-react'

const QRCode = dynamic(() => import('react-qr-code').then(m => m.default), { ssr: false })

export default function TambahWargaPage() {
  const router = useRouter()

  const [petugas, setPetugas] = useState<string | null>(null)
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [rt, setRt] = useState('RT 01')
  const [noRumah, setNoRumah] = useState('')
  const [namaPemilik, setNamaPemilik] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ id: string; rt: string; no_rumah: string; nama_pemilik: string } | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) { router.push('/login'); return }
        const data = await res.json()
        setPetugas(data.nama)
        setIsAuthorized(true)
      } catch {
        router.push('/login')
      }
    }
    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noRumah.trim() || !namaPemilik.trim()) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/rumah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rt,
          no_rumah: noRumah.trim(),
          nama_pemilik: namaPemilik.trim(),
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Gagal menambahkan data warga.')
      }

      const newRumah = result.data
      setSuccess({ id: newRumah.id, rt: newRumah.rt, no_rumah: newRumah.no_rumah, nama_pemilik: newRumah.nama_pemilik })
      setNoRumah('')
      setNamaPemilik('')
    } catch (err: any) {
      setError(err.message || 'Gagal menambahkan data warga.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserPlus size={20} color="var(--accent)" />
          <h2>Tambah Warga</h2>
        </div>
        {petugas && (
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, fontSize: '0.85rem' }}>
            <LogOut size={16} /> Keluar
          </button>
        )}
      </header>

      <main className="app-content animate-fade-in" style={{ paddingBottom: '30px' }}>

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 14px', borderRadius: 'var(--border-radius-md)',
            background: 'var(--danger-light)', border: '1px solid rgba(239, 68, 68, 0.2)',
            color: 'var(--danger)', fontSize: '0.875rem'
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {isAuthorized === true && !success && (
          <form onSubmit={handleSubmit} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Rukun Tetangga (RT)</label>
              <select
                value={rt}
                onChange={e => setRt(e.target.value)}
                className="form-input form-select"
                style={{ width: '100%' }}
                disabled={loading}
              >
                <option value="RT 01">RT 01</option>
                <option value="RT 02">RT 02</option>
                <option value="RT 03">RT 03</option>
                <option value="RT 04">RT 04</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="no_rumah">Nomor Rumah</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{
                  position: 'absolute', left: '16px', top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--text-secondary)',
                  fontWeight: 600, fontSize: '0.9rem', pointerEvents: 'none'
                }}>
                  No.
                </span>
                <input
                  id="no_rumah"
                  type="text"
                  placeholder="01"
                  value={noRumah}
                  onChange={e => setNoRumah(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '48px', width: '100%' }}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="nama_pemilik">Nama Pemilik</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <User size={16} style={{
                  position: 'absolute', left: '16px', top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none'
                }} />
                <input
                  id="nama_pemilik"
                  type="text"
                  placeholder="Nama lengkap pemilik rumah"
                  value={namaPemilik}
                  onChange={e => setNamaPemilik(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '44px', width: '100%' }}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full mt-4"
              disabled={loading || !noRumah.trim() || !namaPemilik.trim()}
            >
              {loading ? 'Menyimpan...' : 'Simpan Warga Baru'}
            </button>
          </form>
        )}

        {isAuthorized === true && success && (
          <div className="glass-card text-center animate-fade-in" style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: 'var(--success-light)', border: '2px solid var(--success)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 24px var(--success-glow)'
            }}>
              <CheckCircle2 size={40} color="var(--success)" />
            </div>

            <div>
              <h2 className="success-text" style={{ marginBottom: '8px' }}>Warga Berhasil Ditambahkan</h2>
              <p className="muted">
                <span className="bold" style={{ color: 'var(--text-primary)' }}>{success.rt} - No. {success.no_rumah}</span>
                <br />
                {success.nama_pemilik}
              </p>
            </div>

            <div style={{
              padding: '12px', background: 'white', borderRadius: '12px',
              display: 'inline-flex', boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
            }}>
              <QRCode value={success.id} size={160} level="M" fgColor="#111827" bgColor="#ffffff" />
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--border-radius-md)',
              padding: '14px 16px', width: '100%', border: '1px solid var(--glass-border)',
              display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left'
            }}>
              <div className="flex-space">
                <span className="muted" style={{ fontSize: '0.75rem' }}>ID Rumah</span>
                <span style={{
                  fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 700,
                  color: 'var(--accent)', background: 'rgba(124,58,237,0.1)',
                  padding: '2px 10px', borderRadius: '999px'
                }}>{success.id}</span>
              </div>
              <hr style={{ border: 'none', borderBottom: '1px solid var(--glass-border)' }} />
              <div className="flex-space">
                <span className="muted" style={{ fontSize: '0.75rem' }}>QR Code siap cetak</span>
                <QrCode size={16} color="var(--success)" />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <button onClick={() => setSuccess(null)} className="btn btn-primary w-full">
                <UserPlus size={18} /> Tambah Warga Lain
              </button>
              <button onClick={() => router.push('/qrcode')} className="btn btn-secondary w-full">
                <QrCode size={18} /> Lihat Semua QR Code
              </button>
            </div>
          </div>
        )}

      </main>
    </>
  )
}
