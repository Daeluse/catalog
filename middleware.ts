import { auth } from "./auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Protected routes that require authentication
  const protectedPaths = ['/dashboard', '/api/modules', '/api/user']

  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

  // Allow public API routes
  const publicApiPaths = ['/api/search', '/api/popular', '/api/recent', '/api/assets']
  const isPublicApi = publicApiPaths.some(path => pathname.startsWith(path))

  if (isProtectedPath && !isPublicApi && !req.auth) {
    // Redirect to sign-in page if not authenticated
    const signInUrl = new URL('/auth/signin', req.url)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Match all paths except static files and images
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
