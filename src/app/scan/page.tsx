'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import dynamic from 'next/dynamic'
import { 
  Camera, MapPin, User, Calendar, Coins, 
  CheckCircle2, AlertCircle, RefreshCw, LogOut, ArrowLeft 
} from 'lucide-react'

// Dynamic import agar html5-qrcode HANYA dimuat di browser (tidak di server)
// Ini wajib dilakukan karena library kamera tidak bisa dijalankan di server-side
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
  const supabase = createClient()

  // State
  const [petugas, setPetugas] = useState<any>(null)
  const [step, setStep] = useState<'scan' | 'form' | 'success'>('scan')
  const [rumahId, setRumahId] = useState<string>('')
  const [rumahData, setRumahData] = useState<any>(null)
  const [nominal, setNominal] = useState<number>(1000)
  const [status, setStatus] = useState<'ada' | 'tidak ada'>('ada')
  // scanKey dipakai sebagai React key pada QrScanner agar
  // komponen dihancurkan & dibuat ulang setiap kali scan baru dimulai
  const [scanKey, setScanKey] = useState(0)

  // State untuk input manual (fallback jika scan gagal)
  const [manualMode, setManualMode] = useState(false)
  const [manualRt, setManualRt] = useState('RT 01')
  const [manualNo, setManualNo] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ambil data petugas yang sedang login
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

  // Ambil data rumah setelah scan berhasil
  const handleScanSuccess = async (decodedText: string) => {
    setLoading(true)
    setError(null)
    setRumahId(decodedText)
    
    try {
      const { data, error: fetchError } = await supabase
        .from('rumah')
        .select('*')
        .eq('id', decodedText)
        .single()

      if (fetchError || !data) {
        throw new Error('Data rumah tidak ditemukan. Pastikan QR Code valid.')
      }

      setRumahData(data)
      setStep('form')
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data rumah.')
    } finally {
      setLoading(false)
    }
  }

  // Cari rumah via input manual (fallback jika scan gagal)
  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualNo.trim()) return

    setLoading(true)
    setError(null)

    const rtNumber = manualRt.replace('RT ', '')
    const houseNumber = manualNo.trim().padStart(3, '0')
    const constructedId = `RMH-${rtNumber}-${houseNumber}`

    try {
      const { data, error: fetchError } = await supabase
        .from('rumah')
        .select('*')
        .eq('id', constructedId)
        .single()

      if (fetchError || !data) {
        throw new Error(`Rumah dengan ID "${constructedId}" tidak ditemukan. Pastikan RT dan nomor rumah benar.`)
      }

      setRumahId(data.id)
      setRumahData(data)
      setManualNo('')
      setManualMode(false)
      setStep('form')
    } catch (err: any) {
      setError(err.message || 'Gagal mencari data rumah.')
    } finally {
      setLoading(false)
    }
  }

  // Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Handle simpan jimpitan (Menggunakan UPSERT agar jika dobel scan di hari yang sama akan terupdate)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!petugas || !rumahId) return

    setLoading(true)
    setError(null)

    // Jika status "tidak ada", nominal otomatis 0
    const finalNominal = status === 'tidak ada' ? 0 : nominal
    const todayStr = new Date().toLocaleDateString('en-CA') // Format YYYY-MM-DD (sesuai timezone lokal)

    try {
      const { error: insertError } = await supabase
        .from('jimpitan')
        .upsert({
          rumah_id: rumahId,
          tanggal: todayStr,
          nominal: finalNominal,
          status: status,
          petugas_id: petugas.id
        }, {
          onConflict: 'rumah_id,tanggal'
        })

      if (insertError) {
        throw new Error(insertError.message)
      }

      setStep('success')
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan data jimpitan.')
    } finally {
      setLoading(false)
    }
  }

  // Reset state untuk scan ulang
  // setScanKey memaksa QrScanner di-unmount & remount total (reinisialisasi kamera)
  const handleReset = () => {
    setStep('scan')
    setRumahId('')
    setRumahData(null)
    setStatus('ada')
    setNominal(1000)
    setError(null)
    setManualMode(false)
    setManualRt('RT 01')
    setManualNo('')
    setScanKey(prev => prev + 1) // Paksa kamera diinisialisasi ulang
  }

  // Dapatkan tanggal hari ini terformat
  const getTodayFormatted = () => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    return new Date().toLocaleDateString('id-ID', options)
  }

  return (
    <>
      {/* Header Halaman */}
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
            {step === 'form' && 'Catat Jimpitan'}
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

      {/* Konten Halaman */}
      <main className="app-content animate-fade-in">

        {/* STEP 1: SCAN QR CODE / INPUT MANUAL */}
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
                
                {/* Box Scanner — key berubah setiap reset, memaksa remount penuh */}
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

            {/* Info Petugas Aktif */}
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
                  <p className="bold" style={{ fontSize: '0.875rem' }}>{petugas.email}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: FORM INPUT JIMPITAN */}
        {step === 'form' && rumahData && (
          <form onSubmit={handleSubmit} className="glass-card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Info Rumah Warga */}
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

            {/* Info Tanggal */}
            <div className="form-group">
              <label className="form-label">Tanggal Pencatatan</label>
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

            {/* Status Jimpitan (Radio Option) */}
            <div className="form-group">
              <label className="form-label">Status Jimpitan</label>
              <div className="status-container">
                <div className="status-option">
                  <input
                    type="radio"
                    id="status-ada"
                    name="status"
                    checked={status === 'ada'}
                    onChange={() => setStatus('ada')}
                  />
                  <label htmlFor="status-ada" className="status-label status-ada">
                    Uang Ada
                  </label>
                </div>
                <div className="status-option">
                  <input
                    type="radio"
                    id="status-tidak"
                    name="status"
                    checked={status === 'tidak ada'}
                    onChange={() => setStatus('tidak ada')}
                  />
                  <label htmlFor="status-tidak" className="status-label status-tidak">
                    Tidak Ada / Kosong
                  </label>
                </div>
              </div>
            </div>

            {/* Nominal Jimpitan */}
            {status === 'ada' && (
              <div className="form-group animate-fade-in">
                <label className="form-label" htmlFor="nominal">Nominal Jimpitan (Rp)</label>
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
                    onChange={(e) => setNominal(Math.max(0, parseInt(e.target.value) || 0))}
                    className="form-input"
                    style={{ paddingLeft: '44px', width: '100%' }}
                    min="0"
                    step="500"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            )}

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
                fontSize: '0.85rem'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
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
                {loading ? 'Menyimpan...' : 'Simpan Data'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: SUCCESS FEEDBACK */}
        {step === 'success' && (
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
              <h2 className="success-text" style={{ marginBottom: '8px' }}>Pencatatan Berhasil</h2>
              <p className="muted">
                Data jimpitan rumah <span className="bold" style={{ color: 'var(--text-primary)' }}>{rumahData?.rt} - {rumahData?.no_rumah}</span> ({rumahData?.nama_pemilik}) telah disimpan.
              </p>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 'var(--border-radius-md)',
              padding: '16px',
              width: '100%',
              border: '1px solid var(--glass-border)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              textAlign: 'left'
            }}>
              <div>
                <p className="muted" style={{ fontSize: '0.75rem' }}>STATUS</p>
                <p className="bold" style={{ color: status === 'ada' ? 'var(--success)' : 'var(--danger)' }}>
                  {status === 'ada' ? 'Uang Ada' : 'Tidak Ada'}
                </p>
              </div>
              <div>
                <p className="muted" style={{ fontSize: '0.75rem' }}>NOMINAL</p>
                <p className="bold" style={{ color: 'var(--text-primary)' }}>
                  Rp {(status === 'ada' ? nominal : 0).toLocaleString('id-ID')}
                </p>
              </div>
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
