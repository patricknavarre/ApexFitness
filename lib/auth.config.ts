import type { NextAuthConfig } from 'next-auth';

/** 90 days — long-lived so iOS home-screen / PWA cold starts stay signed in. */
export const SESSION_MAX_AGE = 90 * 24 * 60 * 60;
export const SESSION_UPDATE_AGE = 24 * 60 * 60;

/**
 * Edge-safe Auth.js config (no Node-only providers).
 * Used by middleware to refresh the session cookie on every navigation.
 */
export const authConfig = {
  trustHost: true,
  pages: { signIn: '/auth/login', error: '/auth/login' },
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE,
    updateAge: SESSION_UPDATE_AGE,
  },
  jwt: {
    maxAge: SESSION_MAX_AGE,
  },
  // Only extend defaults — do not rename cookies (JWT salt = cookie name).
  cookies: {
    sessionToken: {
      options: {
        maxAge: SESSION_MAX_AGE,
      },
    },
  },
  providers: [],
  callbacks: {
    /** Layout still enforces login; middleware only refreshes cookies. */
    authorized: () => true,
  },
} satisfies NextAuthConfig;
