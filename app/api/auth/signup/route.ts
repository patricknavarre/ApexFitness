import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req: Request) {
  try {
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        {
          error: 'Database not configured. Set MONGODB_URI in Vercel environment variables.',
          code: 'CONFIG',
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const {
      name,
      email,
      password,
      age,
      sex,
      heightCm,
      weightKg,
      goal,
    } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required', code: 'MISSING_FIELDS' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters', code: 'WEAK_PASSWORD' },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists', code: 'EMAIL_TAKEN' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await User.create({
      name: name || undefined,
      email,
      passwordHash,
      age: age ? Number(age) : undefined,
      sex: sex || undefined,
      heightCm: heightCm ? Number(heightCm) : undefined,
      weightKg: weightKg ? Number(weightKg) : undefined,
      goal: goal || undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Signup error:', e);
    const err = e instanceof Error ? e : new Error(String(e));
    const isDbError =
      err.name === 'MongoServerError' ||
      err.name === 'MongoNetworkError' ||
      err.message?.includes('MongoDB') ||
      err.message?.includes('ECONNREFUSED') ||
      err.message?.includes('MONGODB_URI');
    const userMessage = isDbError
      ? 'Database connection failed. Check MONGODB_URI in Vercel and that Atlas allows access from anywhere (0.0.0.0/0).'
      : process.env.NODE_ENV === 'development'
        ? err.message
        : 'Something went wrong. Try again or contact support.';
    return NextResponse.json(
      { error: userMessage, code: isDbError ? 'DB_ERROR' : 'SERVER_ERROR' },
      { status: isDbError ? 503 : 500 }
    );
  }
}
