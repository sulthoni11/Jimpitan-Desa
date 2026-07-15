import { NextRequest, NextResponse } from 'next/server'
import { getSheetRows } from '@/utils/googleSheets'
import { getSession } from '@/utils/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rumahId = request.nextUrl.searchParams.get('rumah_id')
    if (!rumahId) {
      return NextResponse.json({ error: 'rumah_id required' }, { status: 400 })
    }

    const { rows } = await getSheetRows('pembayaran')
    const payments = rows.filter(p => p.rumah_id === rumahId)

    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    const paidSet = new Set(payments.map(p => `${p.bulan}-${p.tahun}`))
    const sudahBayarBulanIni = paidSet.has(`${currentMonth}-${currentYear}`)

    const tunggakan: { bulan: number; tahun: number }[] = []

    if (payments.length > 0) {
      const sortedPayments = payments.sort((a, b) => {
        if (a.tahun !== b.tahun) return parseInt(b.tahun) - parseInt(a.tahun)
        return parseInt(b.bulan) - parseInt(a.bulan)
      })
      const lastPay = sortedPayments[0]
      let y = parseInt(lastPay.tahun)
      let m = parseInt(lastPay.bulan) + 1

      while (y < currentYear || (y === currentYear && m <= currentMonth - 1)) {
        if (!paidSet.has(`${m}-${y}`)) {
          tunggakan.push({ bulan: m, tahun: y })
        }
        m++
        if (m > 12) { m = 1; y++ }
      }
    }

    const totalTunggakan = tunggakan.length * 10000

    return NextResponse.json({
      rumah_id: rumahId,
      currentMonth,
      currentYear,
      sudahBayarBulanIni,
      tunggakan,
      totalTunggakan,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan' }, { status: 500 })
  }
}
