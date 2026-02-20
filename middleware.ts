import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Auth is enforced in (dashboard)/layout.tsx with auth() so session is read in Node, not Edge.
// Edge middleware often can't read the session cookie on Vercel.
export async function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
