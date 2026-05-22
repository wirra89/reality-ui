import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/', '/login', '/register']
const ROLE_HOME: Record<string, string> = {
  customer:   '/customer/dashboard',
  driver:     '/driver/dashboard',
  dispatcher: '/dispatcher/dashboard',
  admin:      '/dispatcher/dashboard',
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  if (!user) {
    if (PUBLIC_PATHS.includes(path)) return supabaseResponse
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (PUBLIC_PATHS.includes(path)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const home = ROLE_HOME[profile?.role ?? 'customer']
    return NextResponse.redirect(new URL(home, request.url))
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'customer'

  if (path.startsWith('/customer') && !['customer'].includes(role)) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url))
  }
  if (path.startsWith('/driver') && !['driver'].includes(role)) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url))
  }
  if (path.startsWith('/dispatcher') && !['dispatcher', 'admin'].includes(role)) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
