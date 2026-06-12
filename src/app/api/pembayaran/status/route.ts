import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rumahId = request.nextUrl.searchParams.get('rumah_id')
  if (!rumahId) {
    return NextResponse.json({ error: 'rumah_id required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  // Ambil semua pembayaran rumah ini, urut terbaru dulu
  const { data: payments } = await admin
    .from('pembayaran')
    .select('*')
    .eq('rumah_id', rumahId)
    .order('tahun', { ascending: false })
    .order('bulan', { ascending: false })

  const paidSet = new Set((payments || []).map(p => `${p.bulan}-${p.tahun}`))

  // Status bulan ini
  const sudahBayarBulanIni = paidSet.has(`${currentMonth}-${currentYear}`)

  // Hitung tunggakan alami (bukan dari history buatan):
  // Jika ada pembayaran terakhir di bulan X, dan ada bulan kosong setelahnya sampai bulan ini
  const tunggakan: { bulan: number; tahun: number }[] = []

  if (payments && payments.length > 0) {
    // Ambil pembayaran terakhir
    const lastPay = payments[0]

    // Cari bulan2 kosong antara lastPay + 1 bulan sampai currentMonth - 1
    let y = lastPay.tahun
    let m = lastPay.bulan + 1

    while (y < currentYear || (y === currentYear && m <= currentMonth - 1)) {
      if (!paidSet.has(`${m}-${y}`)) {
        tunggakan.push({ bulan: m, tahun: y })
      }
      m++
      if (m > 12) { m = 1; y++ }
    }
  }

  // Total tunggakan
  const totalTunggakan = tunggakan.length * 10000

  return NextResponse.json({
    rumah_id: rumahId,
    currentMonth,
    currentYear,
    sudahBayarBulanIni,
    tunggakan,
    totalTunggakan,
  })
}
