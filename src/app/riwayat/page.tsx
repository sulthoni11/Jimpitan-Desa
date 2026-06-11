'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { exportJimpitanToExcel } from '@/utils/exportExcel'
import { 
  History, Calendar, Filter, FileText, 
  Coins, Search, RefreshCw, LogOut, ArrowLeft, User, AlertCircle, FileDown
} from 'lucide-react'

export default function RiwayatPage() {
  const router = useRouter()
  const supabase = createClient()

  // State
  const [petugas, setPetugas] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [records, setRecords] = useState<any[]>([])
  const [filteredRecords, setFilteredRecords] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  // Filter States
  const [filterDate, setFilterDate] = useState<string>(
    new Date().toLocaleDateString('en-CA') // Default hari ini (format YYYY-MM-DD)
  )
  const [filterRt, setFilterRt] = useState<string>('Semua')

  // Ambil data petugas yang login
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setPetugas(user)
      } else {
        router.push('/login')
      }
    }
    fetchUser()
  }, [supabase, router])

  // Fungsi untuk mengambil data riwayat dari database
  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('jimpitan')
        .select(`
          id,
          tanggal,
          nominal,
          status,
          created_at,
          petugas_id,
          rumah:rumah_id (
            id,
            rt,
            no_rumah,
            nama_pemilik
          )
        `)
        .order('created_at', { ascending: false })

      // Filter tanggal di level database jika diisi
      if (filterDate) {
        query = query.eq('tanggal', filterDate)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      
      setRecords(data || [])
    } catch (err: any) {
      console.error('Error fetching history:', err)
      setError('Gagal memuat data riwayat jimpitan.')
    } finally {
      setLoading(false)
    }
  }, [supabase, filterDate])

  // Muat data saat tanggal filter berubah atau petugas terkonfirmasi
  useEffect(() => {
    if (petugas) {
      fetchHistory()
    }
  }, [petugas, fetchHistory])

  // Terapkan filter RT di level Client (JavaScript) agar responsif dan aman dari error join query
  useEffect(() => {
    let result = [...records]

    if (filterRt !== 'Semua') {
      result = result.filter(rec => rec.rumah && rec.rumah.rt === filterRt)
    }

    setFilteredRecords(result)
  }, [records, filterRt])

  // Hitung ringkasan data terfilter
  const getFilteredSummary = () => {
    const totalCount = filteredRecords.length
    const totalAmount = filteredRecords
      .filter(rec => rec.status === 'ada')
      .reduce((sum, rec) => sum + Number(rec.nominal), 0)

    const countAda = filteredRecords.filter(rec => rec.status === 'ada').length
    const countTidakAda = totalCount - countAda

    return { totalCount, totalAmount, countAda, countTidakAda }
  }

  const summary = getFilteredSummary()

  // Format tanggal untuk tampilan UI
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return 'Semua Tanggal'
    const date = new Date(dateStr)
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    return date.toLocaleDateString('id-ID', options)
  }

  // Handle export ke Excel
  const handleExport = async () => {
    if (filteredRecords.length === 0) return
    setExporting(true)
    try {
      // Gunakan setTimeout agar UI sempat menampilkan loading state
      await new Promise(resolve => setTimeout(resolve, 100))
      exportJimpitanToExcel(filteredRecords, filterDate, filterRt)
    } catch (err) {
      console.error('Gagal mengekspor Excel:', err)
    } finally {
      setExporting(false)
    }
  }

  // Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Header Halaman */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2>Riwayat Jimpitan</h2>
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

      {/* Konten Halaman */}
      <main className="app-content animate-fade-in" style={{ paddingBottom: '30px' }}>

        {/* Card Filter */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Filter size={18} color="var(--accent)" />
            <h3 style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Filter Pencarian</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
            {/* Input Tanggal */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Tanggal</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '12px', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            {/* Select RT */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Rukun Tetangga</label>
              <select
                value={filterRt}
                onChange={(e) => setFilterRt(e.target.value)}
                className="form-input form-select"
                style={{ width: '100%', fontSize: '0.9rem' }}
              >
                <option value="Semua">Semua RT</option>
                <option value="RT 01">RT 01</option>
                <option value="RT 02">RT 02</option>
                <option value="RT 03">RT 03</option>
                <option value="RT 04">RT 04</option>
              </select>
            </div>
          </div>

          {filterDate && (
            <button 
              onClick={() => setFilterDate('')}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.75rem', alignSelf: 'flex-end', marginTop: '4px' }}
            >
              Tampilkan Semua Tanggal
            </button>
          )}
        </div>

        {/* Error Alert */}
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

        {/* Summary Ringkasan Pencarian */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '12px'
        }}>
          {/* Card Total Uang */}
          <div className="glass-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span className="muted" style={{ fontSize: '0.75rem', fontWeight: 600 }}>TERKUMPUL ({filterRt})</span>
            <p className="bold success-text" style={{ fontSize: '1.25rem' }}>
              Rp {summary.totalAmount.toLocaleString('id-ID')}
            </p>
          </div>

          {/* Card Total Rumah */}
          <div className="glass-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span className="muted" style={{ fontSize: '0.75rem', fontWeight: 600 }}>TOTAL SCAN</span>
            <p className="bold" style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              {summary.totalCount} Rumah
            </p>
          </div>
        </div>

        {/* Informasi Detail Filter + Tombol Aksi */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p className="muted" style={{ fontSize: '0.8rem' }}>
            Menampilkan data untuk: <br />
            <span className="bold" style={{ color: 'var(--text-primary)' }}>
              {formatDisplayDate(filterDate)}
            </span>
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Tombol Refresh */}
            <button 
              onClick={fetchHistory}
              className="btn btn-secondary"
              style={{ padding: '8px 12px', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              disabled={loading}
              title="Muat ulang data"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>

            {/* Tombol Export Excel */}
            <button
              onClick={handleExport}
              disabled={exporting || filteredRecords.length === 0 || loading}
              title={filteredRecords.length === 0 ? 'Tidak ada data untuk diekspor' : 'Export ke Excel'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: 'var(--border-radius-md)',
                background: filteredRecords.length === 0
                  ? 'rgba(255,255,255,0.03)'
                  : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                border: filteredRecords.length === 0
                  ? '1px solid var(--glass-border)'
                  : '1px solid rgba(22, 163, 74, 0.4)',
                color: filteredRecords.length === 0 ? 'var(--text-muted)' : '#fff',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: filteredRecords.length === 0 ? 'not-allowed' : 'pointer',
                boxShadow: filteredRecords.length > 0 ? '0 4px 12px rgba(22, 163, 74, 0.3)' : 'none',
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

        {/* List Data Riwayat */}
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
              <p style={{ fontSize: '0.85rem' }}>Tidak ditemukan catatan jimpitan pada filter yang dipilih.</p>
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
                      <span className={`badge ${record.status === 'ada' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                        {record.status === 'ada' ? `Rp ${Number(record.nominal).toLocaleString('id-ID')}` : 'Tidak Ada'}
                      </span>
                    </div>
                  </div>
                  
                  <hr style={{ border: 'none', borderBottom: '1px solid var(--glass-border)', margin: '10px 0' }} />
                  
                  <div className="flex-space" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>Jam: {timeStr} WIB</span>
                    {record.tanggal !== filterDate && (
                      <span>Tgl: {record.tanggal}</span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <User size={10} /> {record.petugas_id ? 'Petugas' : 'Sistem'}
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
