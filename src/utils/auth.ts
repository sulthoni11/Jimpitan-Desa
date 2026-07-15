import { cookies } from 'next/headers'

const SESSION_COOKIE = 'jimpitan_session'

export interface SessionData {
  nama: string
  loginAt: string
}

export function createSessionCookie(nama: string): string {
  const data: SessionData = { nama, loginAt: new Date().toISOString() }
  return Buffer.from(JSON.stringify(data)).toString('base64')
}

export function parseSessionCookie(cookieValue: string): SessionData | null {
  try {
    const json = Buffer.from(cookieValue, 'base64').toString()
    const data = JSON.parse(json) as SessionData
    if (data.nama && data.loginAt) return data
    return null
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies()
    const cookie = cookieStore.get(SESSION_COOKIE)?.value
    if (!cookie) return null
    return parseSessionCookie(cookie)
  } catch {
    return null
  }
}
