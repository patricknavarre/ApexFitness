import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

type UserMeFields = {
  name?: string | null;
  calorieTarget?: number | null;
  proteinTarget?: number | null;
  carbTarget?: number | null;
  fatTarget?: number | null;
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await connectDB();
    const raw = await User.findById(session.user.id)
      .select('name calorieTarget proteinTarget carbTarget fatTarget')
      .lean();
    if (!raw || Array.isArray(raw)) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const user = raw as UserMeFields;
    return NextResponse.json({
      name: user.name ?? null,
      calorieTarget: user.calorieTarget ?? null,
      proteinTarget: user.proteinTarget ?? null,
      carbTarget: user.carbTarget ?? null,
      fatTarget: user.fatTarget ?? null,
    });
  } catch (e) {
    console.error('User me error:', e);
    return NextResponse.json(
      { error: 'Failed to load profile' },
      { status: 500 }
    );
  }
}
