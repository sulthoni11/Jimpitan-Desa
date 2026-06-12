'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import dynamic from 'next/dynamic'
import { Printer, QrCode, Filter, Home, RefreshCw, LogOut, Search } from 'lucide-react'

// Dynamic import QRCode agar hanya dirender di browser
const QRCode = dynamic(() => import('react-qr-code').then(m => m.default), { ssr: false })

interface Rumah {
  id: string
  rt: string
  no_rumah: string
  nama_pemilik: string
}

export default function QrCodePage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [rumahList, setRumahList] = useState<Rumah[]>([])
  const [filterRt, setFilterRt] = useState<string>('Semua')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // Cek login
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/login')
    }
    checkUser()
  }, [supabase, router])

  // Ambil data semua rumah
  useEffect(() => {
    const fetchRumah = async () => {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('rumah')
        .select('*')
        .order('rt')
        .order('no_rumah')

      if (err) {
        setError('Gagal memuat data rumah.')
      } else {
        setRumahList(data || [])
      }
      setLoading(false)
    }
    fetchRumah()
  }, [supabase])

  // Filter rumah berdasarkan RT + pencarian nama/no rumah
  const filteredRumah = rumahList.filter(r => {
    const matchRt = filterRt === 'Semua' || r.rt === filterRt
    const q = searchQuery.toLowerCase().trim()
    const matchSearch = !q ||
      r.nama_pemilik.toLowerCase().includes(q) ||
      r.no_rumah.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q)
    return matchRt && matchSearch
  })

  // Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Cetak QR Code: membuka window print browser
  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      {/* CSS khusus untuk halaman cetak (print) */}
      <style>{`
        @media print {
          /* Sembunyikan semua UI kecuali grid QR Code */
          .no-print { display: none !important; }
          .app-container { padding: 0 !important; background: white !important; }
          .print-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 12px !important;
            padding: 10px !important;
          }
          .qr-card {
            break-inside: avoid !important;
            border: 1px solid #ccc !important;
            border-radius: 8px !important;
            padding: 12px !important;
            background: white !important;
            color: black !important;
            text-align: center !important;
          }
          .qr-card p { color: black !important; }
        }
      `}</style>

      {/* Header — disembunyikan saat cetak */}
      <header className="app-header no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <QrCode size={20} color="var(--accent)" />
          <h2>Generator QR Code</h2>
        </div>
        <button
          onClick={handleLogout}
          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, fontSize: '0.85rem' }}
        >
          <LogOut size={16} /> Keluar
        </button>
      </header>

      <main className="app-content animate-fade-in" style={{ paddingBottom: '30px' }}>

        {/* Panel Kontrol — disembunyikan saat cetak */}
        <div className="glass-card no-print" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} color="var(--accent)" />
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Filter & Cetak</h3>
          </div>

          {/* Pencarian */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Cari Rumah</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={16} style={{
                position: 'absolute', left: '14px', top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none'
              }} />
              <input
                type="text"
                placeholder="Cari nama pemilik, no rumah, atau ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '40px', width: '100%', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          {/* Select RT */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Tampilkan RT</label>
            <select
              value={filterRt}
              onChange={e => setFilterRt(e.target.value)}
              className="form-input form-select"
              style={{ width: '100%' }}
            >
              <option value="Semua">Semua RT</option>
              <option value="RT 01">RT 01</option>
              <option value="RT 02">RT 02</option>
              <option value="RT 03">RT 03</option>
              <option value="RT 04">RT 04</option>
            </select>
          </div>

          {/* Info jumlah + Tombol Cetak */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p className="muted" style={{ fontSize: '0.8rem' }}>
              {filteredRumah.length} QR Code siap cetak
            </p>
            <button
              onClick={handlePrint}
              disabled={filteredRumah.length === 0}
              className="btn btn-primary"
              style={{ padding: '10px 16px', fontSize: '0.875rem', gap: '6px' }}
            >
              <Printer size={16} />
              Cetak Semua
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '12px 14px', borderRadius: 'var(--border-radius-md)', background: 'var(--danger-light)', color: 'var(--danger)', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center muted no-print" style={{ padding: '40px 0' }}>
            <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 10px auto', color: 'var(--accent)' }} />
            Memuat data rumah...
          </div>
        )}

        {/* Grid QR Code — tampil di layar & saat cetak */}
        {!loading && (
          <div className="print-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '14px',
          }}>
            {filteredRumah.map((rumah) => (
              <div
                key={rumah.id}
                className="qr-card glass-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '16px 12px',
                  textAlign: 'center',
                  cursor: 'default'
                }}
              >
                {/* QR Code SVG */}
                <div style={{
                  padding: '8px',
                  background: 'white',
                  borderRadius: '8px',
                  display: 'inline-flex'
                }}>
                  <QRCode
                    value={rumah.id}
                    size={110}
                    level="M"
                    fgColor="#111827"
                    bgColor="#ffffff"
                  />
                </div>

                {/* Info Rumah */}
                <div style={{ width: '100%' }}>
                  <p className="bold" style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '2px' }}>
                    {rumah.rt} — {rumah.no_rumah}
                  </p>
                  <p className="muted" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>
                    {rumah.nama_pemilik}
                  </p>
                  <p style={{
                    fontSize: '0.65rem',
                    color: 'var(--accent)',
                    fontFamily: 'monospace',
                    background: 'rgba(124,58,237,0.08)',
                    padding: '3px 8px',
                    borderRadius: '999px',
                    display: 'inline-block',
                    border: '1px solid rgba(124,58,237,0.2)'
                  }}>
                    {rumah.id}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredRumah.length === 0 && !error && (
          <div className="glass-card text-center muted" style={{ padding: '40px 20px' }}>
            <Home size={32} style={{ margin: '0 auto 10px auto', opacity: 0.4 }} />
            <p>Tidak ada rumah ditemukan untuk filter ini.</p>
          </div>
        )}

      </main>
    </>
  )
}
