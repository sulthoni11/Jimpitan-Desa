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

  // Ambil semua pembayaran rumah ini
  const { data: payments } = await admin
    .from('pembayaran')
    .select('*')
    .eq('rumah_id', rumahId)
    .order('tahun', { ascending: true })
    .order('bulan', { ascending: true })

  // Generate daftar bulan dari Januari tahun lalu sampai bulan ini
  const allMonths: { bulan: number; tahun: number }[] = []
  const startMonth = 1
  const startYear = currentYear - 1
  for (let y = startYear; y <= currentYear; y++) {
    const monthEnd = y === currentYear ? currentMonth : 12
    for (let m = (y === startYear ? startMonth : 1); m <= monthEnd; m++) {
      allMonths.push({ bulan: m, tahun: y })
    }
  }

  // Map pembayaran ke bulan
  const paidSet = new Set((payments || []).map(p => `${p.bulan}-${p.tahun}`))

  // Cari tunggakan (bulan belum bayar, sebelum/sejak Jan tahun ini)
  const tunggakan = allMonths.filter(m => {
    if (m.tahun === currentYear && m.bulan > currentMonth) return false
    return !paidSet.has(`${m.bulan}-${m.tahun}`)
  })

  // Status bulan ini
  const bulanIni = tunggakan.find(m => m.bulan === currentMonth && m.tahun === currentYear)
  const sudahBayarBulanIni = !bulanIni

  // Total tunggakan
  const totalTunggakan = tunggakan.length * 10000

  return NextResponse.json({
    rumah_id: rumahId,
    currentMonth,
    currentYear,
    sudahBayarBulanIni,
    tunggakan: tunggakan.map(m => ({ bulan: m.bulan, tahun: m.tahun })),
    totalTunggakan,
  })
}
