import type { NextAuthConfig } from 'next-auth';

/** 90 days — long-lived so iOS home-screen / PWA cold starts stay signed in. */
export const SESSION_MAX_AGE = 90 * 24 * 60 * 60;
export const SESSION_UPDATE_AGE = 24 * 60 * 60;

/**
 * Prefer AUTH_SECRET (Auth.js v5); fall back to NEXTAUTH_SECRET for older deploys.
 * Must match between Node auth() and any Edge usage — never diverge.
 */
export function resolveAuthSecret(): string | undefined {
  return (
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    (process.env.NODE_ENV === 'development'
      ? 'dev-secret-replace-in-production'
      : undefined)
  );
}

const useSecureCookies =
  process.env.NODE_ENV === 'production' ||
  process.env.VERCEL === '1' ||
  process.env.AUTH_URL?.startsWith('https://') === true ||
  process.env.NEXTAUTH_URL?.startsWith('https://') === true;

/**
 * Shared Auth.js options. Cookie name is the JWT salt — keep it stable.
 * Full options (not just maxAge) so Set-Cookie always includes Expires/Max-Age
 * for standalone PWA launches after the OS suspends the WebView.
 */
export const authConfig = {
  trustHost: true,
  secret: resolveAuthSecret(),
  pages: { signIn: '/auth/login', error: '/auth/login' },
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE,
    updateAge: SESSION_UPDATE_AGE,
  },
  jwt: {
    maxAge: SESSION_MAX_AGE,
  },
  cookies: {
    sessionToken: {
      // Auth.js default names — do not rename (breaks existing sessions / salt).
      name: useSecureCookies
        ? '__Secure-authjs.session-token'
        : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
        maxAge: SESSION_MAX_AGE,
      },
    },
  },
  providers: [],
  callbacks: {
    /** Layout enforces login in Node; middleware must not gate or rewrite auth. */
    authorized: () => true,
  },
} satisfies NextAuthConfig;
