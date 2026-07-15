import { NextRequest, NextResponse } from 'next/server'
import { getSheetRows, appendSheetRows } from '@/utils/googleSheets'
import { getSession } from '@/utils/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data } = await request.json()
    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: 'Data tidak boleh kosong.' }, { status: 400 })
    }

    for (const item of data) {
      if (!item.rt || !item.no_rumah || !item.nama_pemilik) {
        return NextResponse.json({ error: 'Setiap baris harus memiliki rt, no_rumah, dan nama_pemilik.' }, { status: 400 })
      }
    }

    const { rows: existing } = await getSheetRows('rumah')
    const rtGroups: Record<string, number> = {}

    existing.forEach(r => {
      const rtNum = r.rt.replace('RT ', '')
      const seq = parseInt(r.id.slice(-3), 10)
      if (!rtGroups[rtNum] || seq > rtGroups[rtNum]) {
        rtGroups[rtNum] = seq
      }
    })

    const now = new Date().toISOString()
    const rowsToInsert: string[][] = []
    const result: { id: string; rt: string; no_rumah: string; nama_pemilik: string }[] = []

    for (const item of data) {
      const rtNumber = item.rt.replace('RT ', '')
      const nextSeq = (rtGroups[rtNumber] || 0) + 1
      rtGroups[rtNumber] = nextSeq
      const newId = `RMH-${rtNumber}-${nextSeq.toString().padStart(3, '0')}`

      rowsToInsert.push([newId, item.rt, item.no_rumah.trim(), item.nama_pemilik.trim(), now])
      result.push({ id: newId, rt: item.rt, no_rumah: item.no_rumah.trim(), nama_pemilik: item.nama_pemilik.trim() })
    }

    await appendSheetRows('rumah', rowsToInsert)

    return NextResponse.json({
      message: `Berhasil menambahkan ${result.length} data warga.`,
      data: result,
      total: result.length,
    })
  } catch (err: any) {
    console.error('Import error:', err)
    return NextResponse.json({ error: err.message || 'Gagal import data.' }, { status: 500 })
  }
}
