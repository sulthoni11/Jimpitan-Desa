import { NextRequest, NextResponse } from 'next/server'
import { getSheetRows, appendSheetRows } from '@/utils/googleSheets'
import { getSession } from '@/utils/auth'

export async function GET() {
  try {
    const { rows } = await getSheetRows('rumah')
    const houses = rows.map(r => ({
      id: r.id,
      rt: r.rt,
      no_rumah: r.no_rumah,
      nama_pemilik: r.nama_pemilik,
      created_at: r.created_at,
    }))
    return NextResponse.json(houses)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memuat data rumah.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { rt, no_rumah, nama_pemilik } = await request.json()
    if (!rt || !no_rumah || !nama_pemilik) {
      return NextResponse.json({ error: 'Semua field harus diisi' }, { status: 400 })
    }

    const { rows } = await getSheetRows('rumah')
    const rtNumber = rt.replace('RT ', '')
    const prefix = `RMH-${rtNumber}-`

    const existingIds = rows
      .filter(r => r.id.startsWith(prefix))
      .map(r => parseInt(r.id.slice(-3), 10))
      .sort((a, b) => b - a)

    const newSeq = existingIds.length > 0 ? existingIds[0] + 1 : 1
    const newId = `${prefix}${newSeq.toString().padStart(3, '0')}`

    const now = new Date().toISOString()
    await appendSheetRows('rumah', [[newId, rt, no_rumah.trim(), nama_pemilik.trim(), now]])

    const data = {
      id: newId,
      rt,
      no_rumah: no_rumah.trim(),
      nama_pemilik: nama_pemilik.trim(),
      created_at: now,
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan' }, { status: 500 })
  }
}
