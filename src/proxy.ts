import { type NextRequest, NextResponse } from 'next/server'
import { parseSessionCookie } from '@/utils/auth'

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone()
  const isLoginPage = url.pathname === '/login'
  const isAuthApi = url.pathname.startsWith('/api/auth/')
  const isStaticFile = 
    url.pathname.includes('.') || 
    url.pathname.startsWith('/_next') || 
    url.pathname === '/favicon.ico'

  if (isStaticFile || isLoginPage || isAuthApi) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get('jimpitan_session')?.value
  const session = sessionCookie ? parseSessionCookie(sessionCookie) : null

  if (!session) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
