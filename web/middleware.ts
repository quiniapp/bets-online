import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_PREFIXES = ['/user']
// El sitio de jugadores no tiene panel: los árboles /admin y /cashier se
// eliminaron (viven solo en web-admin). Redirigir links viejos al inicio
// en vez de mostrar un 404.
const REMOVED_PREFIXES = ['/admin', '/cashier']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const redirectHome = () => {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  if (REMOVED_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    return redirectHome()
  }

  const isProtected = PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix))
  if (!isProtected) return NextResponse.next()

  const sessionCookie = request.cookies.get('session')
  if (!sessionCookie?.value) {
    return redirectHome()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/user/:path*', '/admin/:path*', '/cashier/:path*'],
}
