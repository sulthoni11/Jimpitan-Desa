import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Memvalidasi apakah user sedang login
  const { data: { user } } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const isLoginPage = url.pathname === '/login'
  const isApiRoute = url.pathname.startsWith('/api')
  const isStaticFile = 
    url.pathname.includes('.') || 
    url.pathname.startsWith('/_next') || 
    url.pathname === '/favicon.ico'

  // Jika file statis atau API, lewati proteksi auth
  if (isStaticFile || isApiRoute) {
    return supabaseResponse
  }

  // Jika belum login dan tidak di halaman login, redirect ke halaman login
  if (!user && !isLoginPage) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Jika sudah login dan mencoba ke halaman login, redirect ke dashboard
  if (user && isLoginPage) {
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
