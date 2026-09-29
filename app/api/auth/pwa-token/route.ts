import { cookies } from 'next/headers';
import { decode } from 'next-auth/jwt';
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

async function tokenIsValid(token: string): Promise<boolean> {
  const secret = authSecret();
  if (!secret) return false;
  try {
    const decoded = await decode({
      token,
      secret,
      salt: sessionCookieName(),
    });
    if (!decoded) return false;
    if (typeof decoded.exp === 'number' && decoded.exp * 1000 < Date.now()) return false;
    return Boolean(decoded.userId || decoded.sub || decoded.email);
  } catch {
    return false;
  }
}

/** While signed in, hand the raw session JWT to the client for home-screen restore. */
export async function GET() {
  const token = readSessionJwt();
  if (!token || !(await tokenIsValid(token))) {
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
  if (!token || token.length > 12000 || !(await tokenIsValid(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookieName(), token, {
    ...sessionCookieOptions(),
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
