/** 90 days. Must match the Auth.js session cookie lifetime. */
export const SESSION_MAX_AGE = 90 * 24 * 60 * 60;

/**
 * Default Auth.js session cookie name. The name is the JWT salt — do not rename
 * it or existing sessions stop decoding.
 */
export function sessionCookieName(): string {
  return `${secureAuthCookiesEnabled() ? '__Secure-' : ''}authjs.session-token`;
}

/** Whether the Auth.js session cookie should use the Secure / SameSite=None path. */
export function secureAuthCookiesEnabled(): boolean {
  const url = process.env.NEXTAUTH_URL || process.env.AUTH_URL || '';
  if (url.startsWith('https://')) return true;
  // Local only — keep non-Secure cookies for http://localhost.
  if (
    url.startsWith('http://localhost') ||
    url.startsWith('http://127.0.0.1')
  ) {
    return false;
  }
  // Vercel / production is always HTTPS. A mis-set http:// NEXTAUTH_URL must
  // not flip cookies back to SameSite=Lax (iOS home-screen drops those).
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') return true;
  return false;
}

export function sessionCookieOptions() {
  const secure = secureAuthCookiesEnabled();
  return {
    httpOnly: true,
    // Home-screen launches on iOS are treated as cross-site, so Lax is dropped.
    sameSite: secure ? ('none' as const) : ('lax' as const),
    path: '/',
    secure,
    maxAge: SESSION_MAX_AGE,
  };
}

export function authSecret(): string | undefined {
  return (
    process.env.NEXTAUTH_SECRET ??
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV === 'development' ? 'dev-secret-replace-in-production' : undefined)
  );
}
