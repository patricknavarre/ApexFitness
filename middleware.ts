import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

/**
 * Edge-safe middleware: validates JWT and re-sets the session cookie with a
 * fresh Expires/Max-Age on every navigation (critical for iOS home-screen PWAs).
 */
export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    /*
     * Match all paths except static assets. Include pages + API so session
     * cookies refresh whenever the standalone app loads.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
