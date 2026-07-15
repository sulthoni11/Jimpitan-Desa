import { NextRequest, NextResponse } from 'next/server'
import { createSessionCookie } from '@/utils/auth'

export async function POST(request: NextRequest) {
  try {
    const { password, nama_petugas } = await request.json()

    if (!password || !nama_petugas) {
      return NextResponse.json({ error: 'Password dan nama petugas harus diisi.' }, { status: 400 })
    }

    const appPassword = process.env.APP_PASSWORD
    if (!appPassword) {
      return NextResponse.json({ error: 'Konfigurasi server tidak lengkap.' }, { status: 500 })
    }

    if (password !== appPassword) {
      return NextResponse.json({ error: 'Password salah.' }, { status: 401 })
    }

    const cookieValue = createSessionCookie(nama_petugas.trim())
    const response = NextResponse.json({ success: true, nama: nama_petugas.trim() })

    response.cookies.set('jimpitan_session', cookieValue, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    })

    return response
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan.' }, { status: 500 })
  }
}
