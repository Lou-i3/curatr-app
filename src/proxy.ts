/**
 * Next.js Proxy — Route protection
 * Lightweight cookie check only (no DB access — edge runtime limitations)
 * Detailed role checks happen in API route handlers and server components
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'session_token';

/** Paths that don't require authentication */
const PUBLIC_PATHS = ['/login', '/api/auth'];

export function proxy(request: NextRequest) {
  const authMode = process.env.AUTH_MODE?.toLowerCase();

  // If auth is not enabled, pass through (current behavior)
  if (authMode !== 'plex') {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    // No session — redirect pages to login, return 401 for API routes
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Session cookie exists — allow through (DB validation happens in handlers)
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, logo.png (public assets)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|logo\\.png).*)',
  ],
};
