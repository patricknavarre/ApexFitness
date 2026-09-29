/** 90 days. Must match the Auth.js session cookie lifetime. */
export const SESSION_MAX_AGE = 90 * 24 * 60 * 60;

/**
 * Default Auth.js session cookie name. The name is the JWT salt — do not rename
 * it or existing sessions stop decoding.
 */
export function sessionCookieName(): string {
  return `${useSecureAuthCookies() ? '__Secure-' : ''}authjs.session-token`;
}

export function useSecureAuthCookies(): boolean {
  const url = process.env.NEXTAUTH_URL || process.env.AUTH_URL || '';
  if (url.startsWith('https://')) return true;
  if (url.startsWith('http://')) return false;
  return process.env.NODE_ENV === 'production';
}

export function sessionCookieOptions() {
  const secure = useSecureAuthCookies();
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
