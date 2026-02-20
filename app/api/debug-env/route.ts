import { NextResponse } from 'next/server';

/**
 * Dev-only: check if env vars are loaded. Never run in production.
 * GET /api/debug-env returns { MONGODB_URI: "set"|"not set", ... }
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }
  return NextResponse.json({
    MONGODB_URI: process.env.MONGODB_URI ? 'set' : 'not set',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ? 'set' : 'not set',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'set' : 'not set',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'set' : 'not set',
  });
}
