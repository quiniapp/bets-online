import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_PREFIXES = ['/admin', '/cashier']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix))
  if (!isProtected) return NextResponse.next()

  const sessionCookie = request.cookies.get('session')
  if (!sessionCookie?.value) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/cashier/:path*'],
}
