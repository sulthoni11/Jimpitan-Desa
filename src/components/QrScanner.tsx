'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, RefreshCw } from 'lucide-react'

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void
  onScanFailure?: (errorMessage: string) => void
}

export default function QrScanner({ onScanSuccess, onScanFailure }: QrScannerProps) {
  const scannerId = 'qr-reader-container'
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    // Initialize scanner
    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode(scannerId)
        if (isMounted) {
          html5QrCodeRef.current = html5QrCode
        }

        const config = { 
          fps: 10, 
          qrbox: (width: number, height: number) => {
            const size = Math.max(50, Math.min(width, height) * 0.7)
            return { width: size, height: size }
          }
        }

        await html5QrCode.start(
          { facingMode: 'environment' }, // Gunakan kamera belakang handphone
          config,
          async (decodedText) => {
            // Sukses scan: hentikan kamera lalu panggil callback success
            try {
              if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
                await html5QrCodeRef.current.stop()
              }
              onScanSuccess(decodedText)
            } catch (err) {
              console.error('Error stopping camera:', err)
              onScanSuccess(decodedText) // Tetap lanjutkan jika stop gagal
            }
          },
          (errorMessage) => {
            if (onScanFailure) {
              onScanFailure(errorMessage)
            }
          }
        )
        
        if (isMounted) {
          setHasPermission(true)
          setErrorMsg(null)
        }
      } catch (err: any) {
        console.error('Gagal menginisialisasi kamera:', err)
        if (isMounted) {
          setHasPermission(false)
          setErrorMsg(err.message || 'Gagal mengakses kamera.')
        }
      }
    }

    // Delay sedikit untuk memastikan DOM element #qr-reader-container sudah ter-render
    const timer = setTimeout(() => {
      startScanner()
    }, 500)

    return () => {
      isMounted = false
      clearTimeout(timer)
      
      // Bersihkan dan stop scanner jika komponen dilepas
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop()
          .then(() => console.log('Scanner dihentikan.'))
          .catch((err) => console.error('Gagal menghentikan scanner saat unmount:', err))
      }
    }
  }, [onScanSuccess, onScanFailure])

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      aspectRatio: '1/1',
      maxHeight: '320px',
      margin: '0 auto',
      borderRadius: 'var(--border-radius-lg)',
      overflow: 'hidden',
      border: '1px solid var(--glass-border)',
      background: 'rgba(0, 0, 0, 0.3)',
      boxShadow: 'inset 0 0 20px rgba(0,0,0,0.6)'
    }}>
      {/* Scanner Element target */}
      <div id={scannerId} style={{ width: '100%', height: '100%' }} />

      {/* Tampilan Loading Izin Kamera */}
      {hasPermission === null && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          background: 'var(--bg-secondary)',
          color: 'var(--text-secondary)'
        }}>
          <Camera className="animate-pulse" size={36} color="var(--accent)" />
          <p style={{ fontSize: '0.875rem' }}>Mengaktifkan kamera...</p>
        </div>
      )}

      {/* Tampilan Gagal Akses Kamera */}
      {hasPermission === false && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '16px',
          background: 'var(--bg-secondary)',
          textAlign: 'center',
          overflowY: 'auto'
        }}>
          <Camera size={32} color="var(--danger)" />
          <h3 style={{ color: 'var(--danger)', fontSize: '0.95rem' }}>Izin Kamera Ditolak</h3>

          {/* Petunjuk langkah demi langkah */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 'var(--border-radius-md)',
            padding: '12px',
            textAlign: 'left',
            width: '100%'
          }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '8px' }}>
              CARA MENGIZINKAN KAMERA:
            </p>
            <ol style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Klik ikon <strong style={{color:'var(--text-primary)'}}>🔒 gembok</strong> atau <strong style={{color:'var(--text-primary)'}}>📷 kamera</strong> di <strong style={{color:'var(--text-primary)'}}>address bar</strong> browser (pojok kiri atas).</li>
              <li>Cari baris <strong style={{color:'var(--text-primary)'}}>"Kamera"</strong> → ubah ke <strong style={{color:'var(--success)'}}>"Izinkan"</strong>.</li>
              <li>Klik tombol <strong style={{color:'var(--text-primary)'}}>"Muat Ulang"</strong> yang muncul.</li>
            </ol>
          </div>

          <button 
            onClick={() => window.location.reload()} 
            className="btn btn-primary"
            style={{ padding: '10px 20px', fontSize: '0.875rem', width: '100%' }}
          >
            <RefreshCw size={14} /> Sudah Diizinkan, Coba Lagi
          </button>
        </div>
      )}

      {/* Frame / Bidik Pemindai (Hanya jika izin aktif) */}
      {hasPermission === true && (
        <>
          {/* Laser Scanner Animation */}
          <div style={{
            position: 'absolute',
            left: '15%',
            right: '15%',
            height: '2px',
            background: 'var(--accent)',
            boxShadow: '0 0 10px var(--accent), 0 0 20px var(--accent)',
            top: '50%',
            transform: 'translateY(-50%)',
            animation: 'scanLaser 2.5s ease-in-out infinite',
            zIndex: 5,
            pointerEvents: 'none'
          }} />
          
          <style>{`
            @keyframes scanLaser {
              0% { top: 15%; }
              50% { top: 85%; }
              100% { top: 15%; }
            }
            /* Menghilangkan style default dari html5-qrcode agar rapi */
            #qr-reader-container__dashboard {
              display: none !important;
            }
            #qr-reader-container video {
              object-fit: cover !important;
              width: 100% !important;
              height: 100% !important;
            }
          `}</style>
        </>
      )}
    </div>
  )
}
