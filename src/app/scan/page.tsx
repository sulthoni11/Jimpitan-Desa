'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { 
  Camera, MapPin, User, Calendar,
  CheckCircle2, AlertCircle, RefreshCw, LogOut, ArrowLeft 
} from 'lucide-react'

const QrScanner = dynamic(() => import('@/components/QrScanner'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: '100%',
      aspectRatio: '1/1',
      maxHeight: '320px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      background: 'rgba(0,0,0,0.3)',
      borderRadius: 'var(--border-radius-lg)',
      border: '1px solid var(--glass-border)',
      color: 'var(--text-secondary)'
    }}>
      <Camera size={36} color="var(--accent)" />
      <p style={{ fontSize: '0.875rem' }}>Memuat scanner kamera...</p>
    </div>
  )
})

export default function ScanPage() {
  const router = useRouter()

  const [petugas, setPetugas] = useState<string | null>(null)
  const [step, setStep] = useState<'scan' | 'form' | 'success'>('scan')
  const [rumahId, setRumahId] = useState<string>('')
  const [rumahData, setRumahData] = useState<any>(null)
  const [paymentStatus, setPaymentStatus] = useState<any>(null)
  const [nominal, setNominal] = useState<number>(10000)
  const [result, setResult] = useState<any>(null)
  const [scanKey, setScanKey] = useState(0)

  const [manualMode, setManualMode] = useState(false)
  const [manualRt, setManualRt] = useState('RT 01')
  const [manualNo, setManualNo] = useState('')

  const [loading, setLoading] = useState(false)
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

  const goToForm = async (data: any) => {
    setRumahData(data)
    setRumahId(data.id)

    try {
      const res = await fetch(`/api/pembayaran/status?rumah_id=${data.id}`)
      const statusData = await res.json()
      setPaymentStatus(statusData)
    } catch {
      setPaymentStatus(null)
    }

    setStep('form')
  }

  const handleScanSuccess = async (decodedText: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch(`/api/rumah`)
      const houses: any[] = await res.json()
      const data = houses.find(h => h.id === decodedText)

      if (!data) {
        throw new Error('Data rumah tidak ditemukan. Pastikan QR Code valid.')
      }

      await goToForm(data)
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data rumah.')
    } finally {
      setLoading(false)
    }
  }

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualNo.trim()) return

    setLoading(true)
    setError(null)

    const rtNumber = manualRt.replace('RT ', '')
    const houseNumber = manualNo.trim().padStart(3, '0')
    const constructedId = `RMH-${rtNumber}-${houseNumber}`

    try {
      const res = await fetch(`/api/rumah`)
      const houses: any[] = await res.json()
      const data = houses.find(h => h.id === constructedId)

      if (!data) {
        throw new Error(`Rumah dengan ID "${constructedId}" tidak ditemukan. Pastikan RT dan nomor rumah benar.`)
      }

      setManualNo('')
      setManualMode(false)
      await goToForm(data)
    } catch (err: any) {
      setError(err.message || 'Gagal mencari data rumah.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!petugas || !rumahId) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/pembayaran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rumah_id: rumahId, nominal }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses pembayaran.')
      }

      setResult(data)
      setStep('success')
    } catch (err: any) {
      setError(err.message || 'Gagal memproses pembayaran.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setStep('scan')
    setRumahId('')
    setRumahData(null)
    setPaymentStatus(null)
    setNominal(10000)
    setResult(null)
    setError(null)
    setManualMode(false)
    setManualRt('RT 01')
    setManualNo('')
    setScanKey(prev => prev + 1)
  }

  const getTodayFormatted = () => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    return new Date().toLocaleDateString('id-ID', options)
  }

  return (
    <>
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {step === 'form' && (
            <button 
              onClick={handleReset} 
              style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h2>
            {step === 'scan' && (manualMode ? 'Input Manual' : 'Scan QR Code')}
            {step === 'form' && 'Pembayaran Jimpitan'}
            {step === 'success' && 'Berhasil'}
          </h2>
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

      <main className="app-content animate-fade-in">

        {step === 'scan' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {manualMode ? (
              <div className="glass-card animate-fade-in">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: 'var(--accent-glow)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                  }}>
                    <User size={16} color="var(--accent)" />
                  </div>
                  <h3 style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Input Manual Rumah</h3>
                </div>

                <form onSubmit={handleManualSearch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Pilih RT</label>
                    <select
                      value={manualRt}
                      onChange={e => setManualRt(e.target.value)}
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
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>
                      Nomor Urut Rumah
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{
                        padding: '14px 12px', background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--glass-border)', borderRadius: 'var(--border-radius-md)',
                        color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600,
                        whiteSpace: 'nowrap', borderRight: 'none', borderTopRightRadius: 0, borderBottomRightRadius: 0
                      }}>
                        RMH-{manualRt.replace('RT ', '')}-
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="001"
                        value={manualNo}
                        onChange={e => setManualNo(e.target.value.replace(/\D/g, '').slice(0, 3))}
                        className="form-input"
                        style={{
                          width: '80px', fontSize: '1.1rem', fontWeight: 700,
                          textAlign: 'center', letterSpacing: '0.1em', fontFamily: 'monospace',
                          borderTopLeftRadius: 0, borderBottomLeftRadius: 0
                        }}
                        required
                        disabled={loading}
                        autoFocus
                      />
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Cukup masukkan 3 digit nomor rumah (contoh: 001, 012, 123)
                    </p>
                  </div>

                  {error && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '10px 14px', borderRadius: 'var(--border-radius-md)',
                      background: 'var(--danger-light)', border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: 'var(--danger)', fontSize: '0.8rem'
                    }}>
                      <AlertCircle size={14} style={{ flexShrink: 0 }} />
                      <span>{error}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => { setManualMode(false); setError(null) }}
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '12px', fontSize: '0.875rem' }}
                      disabled={loading}
                    >
                      Kembali
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ flex: 2, padding: '12px', fontSize: '0.875rem' }}
                      disabled={loading || !manualNo.trim()}
                    >
                      {loading ? 'Mencari...' : 'Cari & Lanjutkan'}
                    </button>
                  </div>
                </form>
              </div>

            ) : (
              <div className="glass-card text-center">
                <p className="muted" style={{ marginBottom: '16px' }}>
                  Arahkan kamera ke QR Code rumah warga untuk melakukan pencatatan jimpitan hari ini.
                </p>
                
                {!error && <QrScanner key={scanKey} onScanSuccess={handleScanSuccess} />}

                {error && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '24px 16px',
                    background: 'var(--danger-light)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: 'var(--border-radius-md)',
                    color: 'var(--danger)',
                    marginTop: '10px'
                  }}>
                    <AlertCircle size={32} />
                    <p className="bold" style={{ color: 'var(--danger)' }}>Scan Gagal</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{error}</p>
                    <button onClick={handleReset} className="btn btn-secondary mt-4" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>
                      <RefreshCw size={14} /> Scan Ulang
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => { setManualMode(!manualMode); setError(null) }}
              className="btn btn-secondary"
              style={{
                padding: '12px', fontSize: '0.85rem', justifyContent: 'center',
                border: '1px dashed var(--glass-border)',
                background: manualMode ? 'rgba(124,58,237,0.1)' : 'transparent'
              }}
            >
              {manualMode ? (
                <><Camera size={16} /> Kembali ke Scanner QR</>
              ) : (
                <><User size={16} /> Scanner Tidak Jelas? Input Manual</>
              )}
            </button>

            {petugas && (
              <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--accent-glow)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <User size={18} color="var(--accent)" />
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>PETUGAS AKTIF</p>
                  <p className="bold" style={{ fontSize: '0.875rem' }}>{petugas}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'form' && rumahData && (
          <form onSubmit={handleSubmit} className="glass-card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--border-radius-md)',
              padding: '16px',
              border: '1px solid var(--glass-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MapPin size={18} color="var(--accent)" />
                <div>
                  <p className="bold" style={{ fontSize: '1.1rem' }}>{rumahData.rt} - {rumahData.no_rumah}</p>
                  <p className="muted" style={{ fontSize: '0.85rem' }}>ID Rumah: <span className="bold">{rumahData.id}</span></p>
                </div>
              </div>
              <hr style={{ border: 'none', borderBottom: '1px solid var(--glass-border)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <User size={18} color="var(--text-secondary)" />
                <p style={{ fontSize: '0.9rem' }}>Pemilik: <span className="bold">{rumahData.nama_pemilik}</span></p>
              </div>
            </div>

            {(() => {
              const tgl = new Date().getDate()
              const dalamPeriode = tgl >= 1 && tgl <= 15
              return (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '12px 14px',
                  borderRadius: 'var(--border-radius-md)',
                  background: dalamPeriode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${dalamPeriode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  color: dalamPeriode ? 'var(--success)' : 'var(--danger)',
                  fontSize: '0.8rem', fontWeight: 600
                }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: dalamPeriode ? 'var(--success)' : 'var(--danger)',
                    flexShrink: 0
                  }} />
                  <span>
                    {dalamPeriode
                      ? 'Periode pembayaran dibuka (tanggal 1-15)'
                      : 'Periode pembayaran ditutup (kembali lagi tanggal 1 bulan depan)'}
                  </span>
                </div>
              )
            })()}

            {paymentStatus && (
              <div style={{
                background: paymentStatus.sudahBayarBulanIni && paymentStatus.tunggakan.length === 0
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(245, 158, 11, 0.1)',
                borderRadius: 'var(--border-radius-md)',
                padding: '14px 16px',
                border: `1px solid ${
                  paymentStatus.sudahBayarBulanIni && paymentStatus.tunggakan.length === 0
                    ? 'rgba(16, 185, 129, 0.2)'
                    : 'rgba(245, 158, 11, 0.2)'
                }`,
              }}>
                <div className="flex-space mb-4">
                  <span className="muted" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    STATUS BULAN INI
                  </span>
                  <span className={`badge ${paymentStatus.sudahBayarBulanIni ? 'badge-success' : 'badge-warning'}`}>
                    {paymentStatus.sudahBayarBulanIni ? 'LUNAS' : 'BELUM BAYAR'}
                  </span>
                </div>

                {paymentStatus.tunggakan.length > 0 && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--warning)' }}>
                    <p className="bold" style={{ marginBottom: '4px' }}>
                      Tunggakan: {paymentStatus.tunggakan.length} bulan
                    </p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      {paymentStatus.tunggakan.map((m: any) => `${m.bulan}/${m.tahun}`).join(', ')}
                    </p>
                    <p className="bold" style={{ marginTop: '4px', color: 'var(--warning)' }}>
                      Total tunggakan: Rp {paymentStatus.totalTunggakan.toLocaleString('id-ID')}
                    </p>
                  </div>
                )}

                {paymentStatus.sudahBayarBulanIni && paymentStatus.tunggakan.length === 0 && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--success)' }}>
                    Semua lancar! Tidak ada tunggakan.
                  </p>
                )}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Tanggal Pembayaran</label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 16px',
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--border-radius-md)',
                color: 'var(--text-secondary)',
                fontSize: '0.95rem'
              }}>
                <Calendar size={16} />
                <span>{getTodayFormatted()}</span>
              </div>
            </div>

            <div className="form-group animate-fade-in">
              <label className="form-label" htmlFor="nominal">
                Nominal Pembayaran (Rp)
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Minimal Rp 10.000/bulan. Bayar lebih untuk lunasi tunggakan atau bulan berikutnya.
              </p>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)',
                  fontWeight: 600
                }}>Rp</span>
                <input
                  id="nominal"
                  type="number"
                  value={nominal}
                  onChange={(e) => setNominal(Math.max(10000, parseInt(e.target.value) || 10000))}
                  className="form-input"
                  style={{ paddingLeft: '44px', width: '100%' }}
                  min="10000"
                  step="10000"
                  required
                  disabled={loading}
                />
              </div>
              {nominal > 10000 && (
                <p style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '4px' }}>
                  Rp {(nominal - 10000).toLocaleString('id-ID')} akan dialokasikan ke tunggakan/bulan berikutnya
                </p>
              )}
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
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <div className="flex-row mt-4">
              <button 
                type="button" 
                onClick={handleReset} 
                className="btn btn-secondary"
                style={{ flex: 1 }}
                disabled={loading}
              >
                Batal
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ flex: 2 }}
                disabled={loading}
              >
                {loading ? 'Memproses...' : `Bayar Rp ${nominal.toLocaleString('id-ID')}`}
              </button>
            </div>
          </form>
        )}

        {step === 'success' && result && (
          <div className="glass-card text-center animate-fade-in" style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'var(--success-light)',
              border: '2px solid var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 24px var(--success-glow)'
            }}>
              <CheckCircle2 size={40} color="var(--success)" />
            </div>
            
            <div>
              <h2 className="success-text" style={{ marginBottom: '8px' }}>Pembayaran Berhasil</h2>
              <p className="muted">
                {rumahData?.rt} - {rumahData?.no_rumah} ({rumahData?.nama_pemilik})
              </p>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 'var(--border-radius-md)',
              padding: '16px',
              width: '100%',
              border: '1px solid var(--glass-border)',
              textAlign: 'left',
            }}>
              <p className="muted" style={{ fontSize: '0.75rem', marginBottom: '8px' }}>BULAN YANG TERBAYAR:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {result.data?.map((d: any, i: number) => (
                  <span key={i} className="badge badge-success" style={{ fontSize: '0.8rem' }}>
                    {d.bulan}/{d.tahun}
                  </span>
                ))}
              </div>
              {result.sisa > 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--accent)', marginTop: '8px' }}>
                  Sisa: Rp {result.sisa.toLocaleString('id-ID')} (belum cukup untuk 1 bulan)
                </p>
              )}
            </div>

            <button 
              onClick={handleReset} 
              className="btn btn-primary w-full mt-4"
              style={{ gap: '8px' }}
            >
              <Camera size={18} /> Scan Rumah Lain
            </button>
            
            <button 
              onClick={() => router.push('/')} 
              className="btn btn-secondary w-full"
            >
              Kembali ke Dashboard
            </button>
          </div>
        )}

      </main>
    </>
  )
}
