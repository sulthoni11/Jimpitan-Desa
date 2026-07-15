'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Coins, Home, CheckCircle2, 
  Clock, RefreshCw, LogOut, ArrowRight, User, AlertCircle
} from 'lucide-react'
import Link from 'next/link'

interface SummaryStats {
  totalAmount: number
  totalHouses: number
  scannedHouses: number
  unscannedHouses: number
}

interface RtStats {
  rt: string
  amount: number
  totalHouses: number
  scannedHouses: number
}

export default function DashboardPage() {
  const router = useRouter()

  const [petugas, setPetugas] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [summary, setSummary] = useState<SummaryStats>({
    totalAmount: 0,
    totalHouses: 0,
    scannedHouses: 0,
    unscannedHouses: 0,
  })
  const [rtSummary, setRtSummary] = useState<RtStats[]>([])
  const [recentScans, setRecentScans] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) { router.push('/login'); return }
        const data = await res.json()
        setPetugas(data.nama)
      } catch {
        router.push('/login')
      }
    }
    checkAuth()
  }, [router])

  const fetchDashboardData = useCallback(async () => {
    setError(null)
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    try {
      const [rumahRes, bayarRes] = await Promise.all([
        fetch('/api/rumah'),
        fetch(`/api/pembayaran?bulan=${currentMonth}&tahun=${currentYear}`),
      ])

      if (!rumahRes.ok || !bayarRes.ok) throw new Error('Gagal memuat data')

      const houses: any[] = await rumahRes.json()
      const payments: any[] = await bayarRes.json()

      const paidHouseIds = new Set(payments.map(p => p.rumah_id))

      const totalAmount = payments.reduce((sum, p) => sum + Number(p.nominal), 0)
      const totalHouses = houses.length
      const scannedHouses = paidHouseIds.size
      const unscannedHouses = Math.max(0, totalHouses - scannedHouses)

      setSummary({ totalAmount, totalHouses, scannedHouses, unscannedHouses })

      const rts = ['RT 01', 'RT 02', 'RT 03', 'RT 04']
      const calculatedRtSummary: RtStats[] = rts.map(rt => {
        const rtHouses = houses.filter(h => h.rt === rt)
        const rtHouseIds = rtHouses.map(h => h.id)
        const rtPayments = payments.filter(p => rtHouseIds.includes(p.rumah_id))
        const rtAmount = rtPayments.reduce((sum, p) => sum + Number(p.nominal), 0)
        return { rt, amount: rtAmount, totalHouses: rtHouses.length, scannedHouses: rtPayments.length }
      })

      setRtSummary(calculatedRtSummary)

      const sortedPayments = [...payments].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      const recentScansWithRumah = sortedPayments.slice(0, 5).map(p => {
        const rumah = houses.find(h => h.id === p.rumah_id)
        return { ...p, rumah }
      })
      setRecentScans(recentScansWithRumah)
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err)
      setError('Gagal memuat rekap pembayaran.')
    }
  }, [])

  useEffect(() => {
    if (petugas) {
      setLoading(true)
      fetchDashboardData().finally(() => setLoading(false))
    }
  }, [petugas, fetchDashboardData])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDashboardData()
    setRefreshing(false)
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const getProgressPercentage = () => {
    if (summary.totalHouses === 0) return 0
    return Math.round((summary.scannedHouses / summary.totalHouses) * 100)
  }

  const getTodayFormatted = () => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'short' }
    return new Date().toLocaleDateString('id-ID', options)
  }

  if (loading) {
    return (
      <main className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="text-center">
          <RefreshCw className="animate-spin" size={36} color="var(--accent)" />
          <p className="muted mt-4">Memuat data dashboard...</p>
        </div>
      </main>
    )
  }

  return (
    <>
      <header className="app-header">
        <div>
          <p className="muted" style={{ fontSize: '0.75rem', fontWeight: 600 }}>{getTodayFormatted().toUpperCase()}</p>
          <h2>Dashboard</h2>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={handleRefresh}
            className="btn-secondary"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: '1px solid var(--glass-border)'
            }}
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Keluar"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="app-content animate-fade-in" style={{ paddingBottom: '30px' }}>
        
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
            fontSize: '0.875rem'
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {(() => {
          const tgl = new Date().getDate()
          const dalamPeriode = tgl >= 1 && tgl <= 15
          const sisaHari = 15 - tgl + 1
          return (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '14px 16px',
              borderRadius: 'var(--border-radius-md)',
              background: dalamPeriode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${dalamPeriode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
            }}>
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: dalamPeriode ? 'var(--success)' : 'var(--danger)',
                flexShrink: 0, boxShadow: `0 0 8px ${dalamPeriode ? 'var(--success)' : 'var(--danger)'}`
              }} />
              <div style={{ fontSize: '0.85rem' }}>
                <p className="bold" style={{ color: dalamPeriode ? 'var(--success)' : 'var(--danger)' }}>
                  {dalamPeriode
                    ? `Periode tagihan dibuka — sisa ${sisaHari} hari`
                    : 'Periode tagihan ditutup (buka lagi tgl 1)'}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {dalamPeriode
                    ? `Tanggal 1-15 setiap bulan. Segera tagih warga yang belum bayar!`
                    : 'Kembali tagih pada tanggal 1 bulan depan.'}
                </p>
              </div>
            </div>
          )
        })()}

        <div className="glass-card" style={{
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(18, 24, 41, 0.8) 100%)',
          borderColor: 'rgba(124, 58, 237, 0.3)',
          textAlign: 'center',
          padding: '24px 20px'
        }}>
          <div style={{
            display: 'inline-flex',
            padding: '8px',
            borderRadius: '12px',
            background: 'var(--accent-glow)',
            color: 'var(--accent)',
            marginBottom: '12px'
          }}>
            <Coins size={24} />
          </div>
          <p className="muted" style={{ fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em' }}>TOTAL IURAN BULAN INI</p>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 800, 
            margin: '8px 0',
            background: 'linear-gradient(135deg, #ffffff 0%, #10b981 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Rp {summary.totalAmount.toLocaleString('id-ID')}
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Iuran jimpitan bulan ini
          </p>
        </div>

        <div className="glass-card">
          <div className="flex-space mb-4">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Home size={18} color="var(--accent)" />
              <h3 style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Progress Pengambilan</h3>
            </div>
            <span className="badge badge-success bold" style={{ fontSize: '0.85rem' }}>
              {summary.scannedHouses} / {summary.totalHouses} Rumah
            </span>
          </div>

          <div style={{
            width: '100%',
            height: '10px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '999px',
            overflow: 'hidden',
            marginBottom: '12px'
          }}>
            <div style={{
              width: `${getProgressPercentage()}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--accent) 0%, var(--success) 100%)',
              borderRadius: '999px',
              transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
            }} />
          </div>

          <div className="flex-space" style={{ fontSize: '0.8rem' }}>
            <span className="success-text bold">{getProgressPercentage()}% Selesai</span>
            <span className="muted">{summary.unscannedHouses} rumah belum diambil</span>
          </div>
        </div>

        <div>
          <h3 className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Rincian RT Hari Ini
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {rtSummary.map((rtStat) => {
              const isFinished = rtStat.scannedHouses === rtStat.totalHouses && rtStat.totalHouses > 0;
              const percent = rtStat.totalHouses > 0 ? Math.round((rtStat.scannedHouses / rtStat.totalHouses) * 100) : 0;

              return (
                <div key={rtStat.rt} className="glass-card" style={{ padding: '14px 16px' }}>
                  <div className="flex-space mb-4">
                    <span className="bold" style={{ fontSize: '0.95rem' }}>{rtStat.rt}</span>
                    {isFinished ? (
                      <CheckCircle2 size={16} color="var(--success)" />
                    ) : (
                      <span className="muted" style={{ fontSize: '0.75rem' }}>{percent}%</span>
                    )}
                  </div>
                  
                  <p className="bold text-primary" style={{ fontSize: '1.1rem', margin: '4px 0 8px 0', color: 'var(--text-primary)' }}>
                    Rp {rtStat.amount.toLocaleString('id-ID')}
                  </p>
                  
                  <div className="flex-space" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span>Progress:</span>
                    <span className="bold">{rtStat.scannedHouses}/{rtStat.totalHouses} Rumah</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <Link href="/scan" className="btn btn-primary" style={{
          textDecoration: 'none',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: '0 8px 24px var(--accent-glow)'
        }}>
          Mulai Tagih Bulan Ini <ArrowRight size={18} />
        </Link>

        <div className="glass-card">
          <h3 className="mb-4" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Pembayaran Bulan Ini
          </h3>

          {recentScans.length === 0 ? (
            <div className="text-center muted" style={{ padding: '20px 0', fontSize: '0.85rem' }}>
              <Clock size={24} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
              Belum ada pembayaran bulan ini.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentScans.map((scan) => {
                const scanTime = new Date(scan.created_at).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit'
                })

                return (
                  <div key={scan.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderRadius: 'var(--border-radius-sm)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    fontSize: '0.85rem'
                  }}>
                    <div>
                      <p className="bold" style={{ color: 'var(--text-primary)' }}>
                        {scan.rumah?.rt} - {scan.rumah?.no_rumah}
                      </p>
                      <p className="muted" style={{ fontSize: '0.75rem' }}>
                        {scan.rumah?.nama_pemilik} &bull; {scanTime} WIB
                      </p>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                        Rp {Number(scan.nominal).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {petugas && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <User size={12} />
            <span>Petugas: {petugas}</span>
          </div>
        )}

      </main>
    </>
  )
}
