import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

const NOMINAL_PER_BULAN = 10000

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { rumah_id, nominal } = await request.json()
  if (!rumah_id || !nominal || nominal < NOMINAL_PER_BULAN) {
    return NextResponse.json({ error: `Minimal pembayaran Rp ${NOMINAL_PER_BULAN.toLocaleString('id-ID')}` }, { status: 400 })
  }

  // Validasi: hanya bisa bayar tanggal 1-15
  const now = new Date()
  const tgl = now.getDate()
  if (tgl < 1 || tgl > 15) {
    return NextResponse.json({ error: 'Periode pembayaran tutup. Hanya bisa bayar tanggal 1-15 setiap bulan.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  // Ambil semua pembayaran rumah ini
  const { data: existing } = await admin
    .from('pembayaran')
    .select('*')
    .eq('rumah_id', rumah_id)
    .order('tahun', { ascending: false })
    .order('bulan', { ascending: false })

  const paidSet = new Set((existing || []).map(p => `${p.bulan}-${p.tahun}`))

  // Cari bulan pertama yang belum dibayar (mulai dari bulan ini ke depan)
  const unpaidMonths: { bulan: number; tahun: number }[] = []
  let y = currentYear
  let m = currentMonth

  for (let i = 0; i < 24; i++) { // max 24 bulan ke depan
    if (!paidSet.has(`${m}-${y}`)) {
      unpaidMonths.push({ bulan: m, tahun: y })
    }
    m++
    if (m > 12) { m = 1; y++ }
  }

  // Distribusi nominal
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

  // Insert ke database
  const insertData = created.map(c => ({
    rumah_id,
    bulan: c.bulan,
    tahun: c.tahun,
    nominal: c.nominal,
    petugas_id: user.id,
  }))

  const { data: inserted, error } = await admin
    .from('pembayaran')
    .insert(insertData)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    message: `Pembayaran Rp ${nominal.toLocaleString('id-ID')} berhasil. ${created.length} bulan terbayar (${created.map(c => `${c.bulan}/${c.tahun}`).join(', ')}).`,
    data: inserted,
    sisa: sisa,
  })
}
