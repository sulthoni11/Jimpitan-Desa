import { NextRequest, NextResponse } from 'next/server'
import { getSheetRows, appendSheetRows } from '@/utils/googleSheets'
import { getSession } from '@/utils/auth'

const NOMINAL_PER_BULAN = 10000

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const bulan = request.nextUrl.searchParams.get('bulan')
    const tahun = request.nextUrl.searchParams.get('tahun')
    const rumahId = request.nextUrl.searchParams.get('rumah_id')

    const { rows: rumahRows } = await getSheetRows('rumah')
    const { rows } = await getSheetRows('pembayaran')

    let filtered = rows

    if (bulan) filtered = filtered.filter(r => r.bulan === bulan)
    if (tahun) filtered = filtered.filter(r => r.tahun === tahun)
    if (rumahId) filtered = filtered.filter(r => r.rumah_id === rumahId)

    const result = filtered.map(r => {
      const rumah = rumahRows.find(h => h.id === r.rumah_id)
      return {
        id: r.id,
        rumah_id: r.rumah_id,
        bulan: parseInt(r.bulan),
        tahun: parseInt(r.tahun),
        nominal: parseInt(r.nominal),
        petugas: r.petugas,
        created_at: r.created_at,
        rumah: rumah ? {
          id: rumah.id,
          rt: rumah.rt,
          no_rumah: rumah.no_rumah,
          nama_pemilik: rumah.nama_pemilik,
        } : null,
      }
    })

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memuat data.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { rumah_id, nominal } = await request.json()
    if (!rumah_id || !nominal || nominal < NOMINAL_PER_BULAN) {
      return NextResponse.json({ error: `Minimal pembayaran Rp ${NOMINAL_PER_BULAN.toLocaleString('id-ID')}` }, { status: 400 })
    }

    const now = new Date()
    const tgl = now.getDate()
    if (tgl < 1 || tgl > 15) {
      return NextResponse.json({ error: 'Periode pembayaran tutup. Hanya bisa bayar tanggal 1-15 setiap bulan.' }, { status: 400 })
    }

    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    const { rows: existing } = await getSheetRows('pembayaran')
    const paidSet = new Set(
      existing
        .filter(p => p.rumah_id === rumah_id)
        .map(p => `${p.bulan}-${p.tahun}`)
    )

    const unpaidMonths: { bulan: number; tahun: number }[] = []
    let y = currentYear
    let m = currentMonth
    for (let i = 0; i < 24; i++) {
      if (!paidSet.has(`${m}-${y}`)) {
        unpaidMonths.push({ bulan: m, tahun: y })
      }
      m++
      if (m > 12) { m = 1; y++ }
    }

    let sisa = nominal
    const created: { bulan: number; tahun: number; nominal: number }[] = []
    for (const bulan of unpaidMonths) {
      if (sisa < NOMINAL_PER_BULAN) break
      sisa -= NOMINAL_PER_BULAN
      created.push({ bulan: bulan.bulan, tahun: bulan.tahun, nominal: NOMINAL_PER_BULAN })
    }

    if (created.length === 0) {
      return NextResponse.json({ error: 'Semua bulan sudah lunas atau nominal tidak mencukupi.' }, { status: 400 })
    }

    const nowISO = new Date().toISOString()
    const insertData = created.map(c => [
      `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      rumah_id,
      c.bulan.toString(),
      c.tahun.toString(),
      c.nominal.toString(),
      session.nama,
      nowISO,
    ])

    await appendSheetRows('pembayaran', insertData)

    return NextResponse.json({
      message: `Pembayaran Rp ${nominal.toLocaleString('id-ID')} berhasil. ${created.length} bulan terbayar (${created.map(c => `${c.bulan}/${c.tahun}`).join(', ')}).`,
      data: created,
      sisa,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan' }, { status: 500 })
  }
}
