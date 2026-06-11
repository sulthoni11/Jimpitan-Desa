import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { rt, no_rumah, nama_pemilik } = await request.json()

    if (!rt || !no_rumah || !nama_pemilik) {
      return NextResponse.json({ error: 'Semua field harus diisi' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const rtNumber = rt.replace('RT ', '')
    const prefix = `RMH-${rtNumber}-`

    // Cari ID terakhir untuk RT ini
    const { data: lastHouse } = await supabase
      .from('rumah')
      .select('id')
      .like('id', `${prefix}%`)
      .order('id', { ascending: false })
      .limit(1)

    let newId: string
    if (!lastHouse || lastHouse.length === 0) {
      newId = `${prefix}001`
    } else {
      const lastSeq = parseInt(lastHouse[0].id.slice(-3), 10)
      const nextSeq = (lastSeq + 1).toString().padStart(3, '0')
      newId = `${prefix}${nextSeq}`
    }

    const { data, error } = await supabase
      .from('rumah')
      .insert({
        id: newId,
        rt,
        no_rumah: no_rumah.trim(),
        nama_pemilik: nama_pemilik.trim(),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan' }, { status: 500 })
  }
}
