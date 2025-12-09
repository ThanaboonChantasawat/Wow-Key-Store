import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('firebase-token')?.value
  const { pathname } = request.nextUrl

  // Allow public assets and API routes (API routes handle their own auth/ban checks)
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // files
  ) {
    return NextResponse.next()
  }

  // If no token, allow access (Guest mode)
  // Unless it's a protected route, but that's handled by page components usually.
  // Here we focus on BAN enforcement.
  if (!token) {
    return NextResponse.next()
  }

  try {
    // Decode token to check for 'banned' claim
    // Note: This is a client-side cookie, so we can't verify signature easily in Edge middleware
    // without external libs. But we trust it for UX redirection.
    // Real security is in the API routes.
    const payload = decodeJwt(token)
    
    if (payload && payload.banned === true) {
      // User is banned
      
      // Allow access to /banned and /support
      if (pathname === '/banned' || pathname.startsWith('/support')) {
        return NextResponse.next()
      }
      
      // Redirect all other traffic to /banned
      return NextResponse.redirect(new URL('/banned', request.url))
    }
    
    // User is NOT banned
    
    // If trying to access /banned but not banned, redirect home
    if (pathname === '/banned') {
      return NextResponse.redirect(new URL('/', request.url))
    }

  } catch (error) {
    // Token error, ignore and let app handle it
    console.error('Middleware token error:', error)
  }

  return NextResponse.next()
}

// Helper to decode JWT payload (Edge compatible)
function decodeJwt(token: string) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = atob(base64)
    
    return JSON.parse(jsonPayload)
  } catch (e) {
    return null
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
