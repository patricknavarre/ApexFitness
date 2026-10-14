import { cookies } from 'next/headers';
import { decode, encode } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import {
  SESSION_MAX_AGE,
  authSecret,
  sessionCookieName,
  sessionCookieOptions,
} from '@/lib/auth-cookie';

export const runtime = 'nodejs';

function readSessionJwt(): string | null {
  const jar = cookies();
  const name = sessionCookieName();
  const direct = jar.get(name)?.value;
  if (direct) return direct;
  const parts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const part = jar.get(`${name}.${i}`)?.value;
    if (!part) break;
    parts.push(part);
  }
  return parts.length > 0 ? parts.join('') : null;
}

type JwtPayload = Record<string, unknown> & {
  exp?: number;
  userId?: string;
  sub?: string;
  email?: string;
};

async function decodeSessionToken(token: string): Promise<JwtPayload | null> {
  const secret = authSecret();
  if (!secret) return null;
  // Cookie name is the JWT salt — try both so backups survive Secure-name flips.
  const salts = Array.from(
    new Set([
      sessionCookieName(),
      'authjs.session-token',
      '__Secure-authjs.session-token',
    ])
  );
  for (const salt of salts) {
    try {
      const decoded = (await decode({ token, secret, salt })) as JwtPayload | null;
      if (!decoded) continue;
      if (typeof decoded.exp === 'number' && decoded.exp * 1000 < Date.now()) {
        continue;
      }
      if (decoded.userId || decoded.sub || decoded.email) return decoded;
    } catch {
      /* try next salt */
    }
  }
  return null;
}

/** While signed in, hand the raw session JWT to the client for home-screen restore. */
export async function GET() {
  const token = readSessionJwt();
  if (!token || !(await decodeSessionToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ token });
}

/** Re-set the httpOnly session cookie from a previously saved JWT. */
export async function POST(req: Request) {
  let token = '';
  try {
    const body = (await req.json()) as { token?: unknown };
    if (typeof body.token === 'string') token = body.token;
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  if (!token || token.length > 12000) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const secret = authSecret();
  const decoded = await decodeSessionToken(token);
  if (!secret || !decoded) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Re-encode with the current cookie name as salt so Auth.js can read it.
  const fresh = await encode({
    token: decoded,
    secret,
    salt: sessionCookieName(),
    maxAge: SESSION_MAX_AGE,
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookieName(), fresh, {
    ...sessionCookieOptions(),
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
