'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { exportJimpitanToExcel } from '@/utils/exportExcel'
import { 
  Filter, FileText, 
  RefreshCw, LogOut, User, AlertCircle, FileDown
} from 'lucide-react'

export default function RiwayatPage() {
  const router = useRouter()

  const [petugas, setPetugas] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [records, setRecords] = useState<any[]>([])
  const [filteredRecords, setFilteredRecords] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const now = new Date()
  const [filterBulan, setFilterBulan] = useState<number>(now.getMonth() + 1)
  const [filterTahun, setFilterTahun] = useState<number>(now.getFullYear())
  const [filterRt, setFilterRt] = useState<string>('Semua')

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

  const bulanNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/pembayaran?bulan=${filterBulan}&tahun=${filterTahun}`)
      if (!res.ok) throw new Error('Gagal memuat data')
      const data = await res.json()
      setRecords(data || [])
    } catch (err: any) {
      console.error('Error fetching history:', err)
      setError('Gagal memuat data riwayat pembayaran.')
    } finally {
      setLoading(false)
    }
  }, [filterBulan, filterTahun])

  useEffect(() => {
    if (petugas) {
      fetchHistory()
    }
  }, [petugas, fetchHistory])

  useEffect(() => {
    let result = [...records]
    if (filterRt !== 'Semua') {
      result = result.filter(rec => rec.rumah && rec.rumah.rt === filterRt)
    }
    setFilteredRecords(result)
  }, [records, filterRt])

  const getFilteredSummary = () => {
    const totalCount = filteredRecords.length
    const totalAmount = filteredRecords.reduce((sum, rec) => sum + Number(rec.nominal), 0)
    return { totalCount, totalAmount }
  }

  const summary = getFilteredSummary()

  const formatDisplayDate = () => {
    return `${bulanNames[filterBulan - 1]} ${filterTahun}`
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const rumahRes = await fetch('/api/rumah')
      const allHouses = await rumahRes.json()

      if (!allHouses || allHouses.length === 0) return

      const tahunIni = new Date().getFullYear()
      const payRes = await fetch(`/api/pembayaran?tahun=${tahunIni}`)
      const pembayaran = await payRes.json()

      const mappedRecords = filteredRecords.map(r => ({
        id: r.id,
        tanggal: `${r.tahun}-${String(r.bulan).padStart(2, '0')}-01`,
        nominal: Number(r.nominal),
        status: 'ada',
        created_at: r.created_at,
        rumah: r.rumah,
      }))

      await new Promise(resolve => setTimeout(resolve, 100))
      const dateLabel = `${filterTahun}-${String(filterBulan).padStart(2, '0')}`
      exportJimpitanToExcel(mappedRecords, allHouses, dateLabel, filterRt, pembayaran || undefined)
    } catch (err) {
      console.error('Gagal mengekspor Excel:', err)
    } finally {
      setExporting(false)
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2>Riwayat Pembayaran</h2>
        </div>
        {petugas && (
          <button 
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <LogOut size={16} /> Keluar
          </button>
        )}
      </header>

      <main className="app-content animate-fade-in" style={{ paddingBottom: '30px' }}>

        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Filter size={18} color="var(--accent)" />
            <h3 style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Filter Pembayaran</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Bulan</label>
              <select
                value={filterBulan}
                onChange={(e) => setFilterBulan(Number(e.target.value))}
                className="form-input form-select"
                style={{ width: '100%', fontSize: '0.85rem' }}
              >
                {bulanNames.map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Tahun</label>
              <select
                value={filterTahun}
                onChange={(e) => setFilterTahun(Number(e.target.value))}
                className="form-input form-select"
                style={{ width: '100%', fontSize: '0.85rem' }}
              >
                {[filterTahun - 1, filterTahun, filterTahun + 1].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>RT</label>
              <select
                value={filterRt}
                onChange={(e) => setFilterRt(e.target.value)}
                className="form-input form-select"
                style={{ width: '100%', fontSize: '0.85rem' }}
              >
                <option value="Semua">Semua</option>
                <option value="RT 01">RT 01</option>
                <option value="RT 02">RT 02</option>
                <option value="RT 03">RT 03</option>
                <option value="RT 04">RT 04</option>
              </select>
            </div>
          </div>
        </div>

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
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
          <div className="glass-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span className="muted" style={{ fontSize: '0.75rem', fontWeight: 600 }}>TERKUMPUL ({filterRt})</span>
            <p className="bold success-text" style={{ fontSize: '1.25rem' }}>
              Rp {summary.totalAmount.toLocaleString('id-ID')}
            </p>
          </div>

          <div className="glass-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span className="muted" style={{ fontSize: '0.75rem', fontWeight: 600 }}>TOTAL RUMAH</span>
            <p className="bold" style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              {summary.totalCount} Rumah
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p className="muted" style={{ fontSize: '0.8rem' }}>
            Menampilkan data untuk: <br />
            <span className="bold" style={{ color: 'var(--text-primary)' }}>
              {formatDisplayDate()}
            </span>
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={fetchHistory}
              className="btn btn-secondary"
              style={{ padding: '8px 12px', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              disabled={loading}
              title="Muat ulang data"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={handleExport}
              disabled={exporting || loading}
              title="Export ke Excel"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: 'var(--border-radius-md)',
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                border: '1px solid rgba(22, 163, 74, 0.4)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
                transition: 'var(--transition-fast)',
                whiteSpace: 'nowrap',
                height: '36px',
                opacity: exporting ? 0.7 : 1
              }}
            >
              <FileDown size={14} />
              {exporting ? 'Mengekspor...' : 'Export Excel'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading ? (
            <div className="text-center muted" style={{ padding: '40px 0' }}>
              <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 10px auto', color: 'var(--accent)' }} />
              Memuat data riwayat...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="glass-card text-center muted" style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <FileText size={32} style={{ opacity: 0.5, color: 'var(--accent)' }} />
              <p className="bold" style={{ color: 'var(--text-primary)' }}>Tidak Ada Data</p>
              <p style={{ fontSize: '0.85rem' }}>Tidak ditemukan pembayaran pada bulan yang dipilih.</p>
            </div>
          ) : (
            filteredRecords.map((record) => {
              const timeStr = new Date(record.created_at).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
              })

              return (
                <div key={record.id} className="glass-card animate-fade-in" style={{ padding: '14px 16px' }}>
                  <div className="flex-space mb-4">
                    <div>
                      <p className="bold" style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {record.rumah?.rt} - {record.rumah?.no_rumah}
                      </p>
                      <p className="muted" style={{ fontSize: '0.8rem', marginTop: '2px' }}>
                        Pemilik: <span className="bold">{record.rumah?.nama_pemilik}</span>
                      </p>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-success" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                        Rp {Number(record.nominal).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                  
                  <hr style={{ border: 'none', borderBottom: '1px solid var(--glass-border)', margin: '10px 0' }} />
                  
                  <div className="flex-space" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>{timeStr} WIB</span>
                    <span>{bulanNames[record.bulan - 1]} {record.tahun}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={10} /> {record.petugas}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

      </main>
    </>
  )
}
