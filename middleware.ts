import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Passthrough middleware.
 *
 * Auth is enforced in (dashboard)/layout.tsx via auth() in the Node runtime.
 * Edge middleware that runs NextAuth().auth previously corrupted / failed to
 * read the session cookie on Vercel + iOS home-screen PWAs, forcing re-login
 * on every cold start. Cookie refresh is handled by SessionKeepAlive hitting
 * /api/auth/session (Node), not Edge.
 */
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
