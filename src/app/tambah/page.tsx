'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import * as XLSX from 'xlsx'
import {
  UserPlus, User, CheckCircle2, AlertCircle,
  LogOut, QrCode, Upload, FileDown, X
} from 'lucide-react'

const QRCode = dynamic(() => import('react-qr-code').then(m => m.default), { ssr: false })

export default function TambahWargaPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [petugas, setPetugas] = useState<string | null>(null)
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [rt, setRt] = useState('RT 01')
  const [noRumah, setNoRumah] = useState('')
  const [namaPemilik, setNamaPemilik] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ id: string; rt: string; no_rumah: string; nama_pemilik: string } | null>(null)

  const [showImport, setShowImport] = useState(false)
  const [importData, setImportData] = useState<{ rt: string; no_rumah: string; nama_pemilik: string }[]>([])
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<{ total: number } | null>(null)

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setImportResult(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<any>(sheet)

        const mapped = json.map(row => {
          const rt = row['RT'] || row['rt'] || row['Rukun Tetangga'] || ''
          const no_rumah = String(row['No. Rumah'] || row['no_rumah'] || row['No'] || row['Nomor'] || '').trim()
          const nama_pemilik = String(row['Nama Pemilik'] || row['nama_pemilik'] || row['Nama'] || row['nama'] || '').trim()

          let rtFormatted = rt.toString().trim()
          if (!rtFormatted.startsWith('RT')) rtFormatted = `RT ${rtFormatted.replace(/^0+/, '')}`
          if (rtFormatted.match(/^RT\d+$/)) rtFormatted = rtFormatted.replace('RT', 'RT ')

          return { rt: rtFormatted, no_rumah, nama_pemilik }
        }).filter(item => item.no_rumah && item.nama_pemilik)

        if (mapped.length === 0) {
          setError('Tidak ada data valid ditemukan. Pastikan kolom: RT, No. Rumah, Nama Pemilik')
          return
        }

        setImportData(mapped)
        setShowImport(true)
      } catch {
        setError('Gagal membaca file. Pastikan format Excel/CSV benar.')
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  const handleImport = async () => {
    setImportLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/rumah/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: importData }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Gagal import data.')
      }

      setImportResult(result)
      setImportData([])
    } catch (err: any) {
      setError(err.message || 'Gagal import data.')
    } finally {
      setImportLoading(false)
    }
  }

  const downloadTemplate = () => {
    const template = [
      { RT: 'RT 01', 'No. Rumah': '1', 'Nama Pemilik': 'Ahmad Santoso' },
      { RT: 'RT 01', 'No. Rumah': '2', 'Nama Pemilik': 'Budi Pratama' },
    ]
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(template)
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, 'template_import_warga.xlsx')
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

        {isAuthorized === true && !success && !showImport && (
          <>
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

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary"
                style={{ flex: 1, justifyContent: 'center', padding: '12px', fontSize: '0.85rem', gap: '6px' }}
              >
                <Upload size={16} /> Import Excel
              </button>
              <button
                onClick={downloadTemplate}
                className="btn btn-secondary"
                style={{ flex: 1, justifyContent: 'center', padding: '12px', fontSize: '0.85rem', gap: '6px' }}
              >
                <FileDown size={16} /> Template
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </>
        )}

        {isAuthorized === true && showImport && !importResult && (
          <div className="glass-card animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Import Excel — {importData.length} data
              </h3>
              <button
                onClick={() => { setShowImport(false); setImportData([]) }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              maxHeight: '300px', overflow: 'auto',
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--glass-border)',
              marginBottom: '16px'
            }}>
              <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', position: 'sticky', top: 0 }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>No</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>RT</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>No. Rumah</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Nama Pemilik</th>
                  </tr>
                </thead>
                <tbody>
                  {importData.map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{i + 1}</td>
                      <td style={{ padding: '8px 12px' }}>{item.rt}</td>
                      <td style={{ padding: '8px 12px' }}>{item.no_rumah}</td>
                      <td style={{ padding: '8px 12px' }}>{item.nama_pemilik}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => { setShowImport(false); setImportData([]) }}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '12px' }}
                disabled={importLoading}
              >
                Batal
              </button>
              <button
                onClick={handleImport}
                className="btn btn-primary"
                style={{ flex: 2, padding: '12px' }}
                disabled={importLoading}
              >
                {importLoading ? 'Mengimport...' : `Import ${importData.length} Data`}
              </button>
            </div>
          </div>
        )}

        {importResult && (
          <div className="glass-card text-center animate-fade-in" style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: 'var(--success-light)', border: '2px solid var(--success)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 24px var(--success-glow)'
            }}>
              <CheckCircle2 size={40} color="var(--success)" />
            </div>
            <h2 className="success-text">Import Berhasil</h2>
            <p className="muted">{importResult.total} data warga berhasil ditambahkan</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <button onClick={() => { setImportResult(null); setShowImport(false) }} className="btn btn-primary w-full">
                <UserPlus size={18} /> Tambah Lagi
              </button>
              <button onClick={() => router.push('/qrcode')} className="btn btn-secondary w-full">
                <QrCode size={18} /> Lihat Semua QR Code
              </button>
            </div>
          </div>
        )}

        {isAuthorized === true && success && !importResult && (
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
