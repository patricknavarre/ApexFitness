import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

type UserMeFields = {
  name?: string | null;
  age?: number | null;
  sex?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  calorieTarget?: number | null;
  proteinTarget?: number | null;
  carbTarget?: number | null;
  fatTarget?: number | null;
  goal?: string | null;
  fitnessLevel?: string | null;
  equipment?: string | null;
  daysPerWeek?: number | null;
  units?: string | null;
  activePlanId?: string | null;
  planStartedAt?: string | null;
  activePlanDayNumber?: number | null;
};

const ME_FIELDS =
  'name age sex heightCm weightKg calorieTarget proteinTarget carbTarget fatTarget goal fitnessLevel equipment daysPerWeek units activePlanId planStartedAt activePlanDayNumber';

function serializeUser(user: UserMeFields & { planStartedAt?: Date }) {
  return {
    name: user.name ?? null,
    age: typeof user.age === 'number' ? user.age : null,
    sex: user.sex ?? null,
    heightCm: typeof user.heightCm === 'number' ? user.heightCm : null,
    weightKg: typeof user.weightKg === 'number' ? user.weightKg : null,
    calorieTarget: user.calorieTarget ?? null,
    proteinTarget: user.proteinTarget ?? null,
    carbTarget: user.carbTarget ?? null,
    fatTarget: user.fatTarget ?? null,
    goal: user.goal ?? null,
    fitnessLevel: user.fitnessLevel ?? null,
    equipment: user.equipment ?? null,
    daysPerWeek: user.daysPerWeek ?? null,
    units: user.units ?? null,
    activePlanId: user.activePlanId ?? null,
    planStartedAt: user.planStartedAt
      ? new Date(user.planStartedAt).toISOString().slice(0, 10)
      : null,
    activePlanDayNumber:
      typeof user.activePlanDayNumber === 'number' ? user.activePlanDayNumber : null,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await connectDB();
    const raw = await User.findById(session.user.id).select(ME_FIELDS).lean();
    if (!raw || Array.isArray(raw)) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(serializeUser(raw as UserMeFields & { planStartedAt?: Date }));
  } catch (e) {
    console.error('User me error:', e);
    return NextResponse.json(
      { error: 'Failed to load profile' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};
    if (typeof body.name === 'string') updates.name = body.name;
    if (typeof body.age === 'number' && body.age >= 1 && body.age <= 120) {
      updates.age = Math.floor(body.age);
    }
    if (typeof body.sex === 'string') updates.sex = body.sex;
    if (typeof body.heightCm === 'number' && body.heightCm > 0) {
      updates.heightCm = body.heightCm;
    }
    if (typeof body.weightKg === 'number' && body.weightKg > 0) {
      updates.weightKg = body.weightKg;
    }
    if (typeof body.calorieTarget === 'number') updates.calorieTarget = body.calorieTarget;
    if (typeof body.proteinTarget === 'number') updates.proteinTarget = body.proteinTarget;
    if (typeof body.carbTarget === 'number') updates.carbTarget = body.carbTarget;
    if (typeof body.fatTarget === 'number') updates.fatTarget = body.fatTarget;
    if (typeof body.goal === 'string') updates.goal = body.goal;
    if (typeof body.fitnessLevel === 'string') updates.fitnessLevel = body.fitnessLevel;
    if (typeof body.equipment === 'string') updates.equipment = body.equipment;
    if (typeof body.daysPerWeek === 'number') updates.daysPerWeek = body.daysPerWeek;
    if (typeof body.units === 'string' && (body.units === 'imperial' || body.units === 'metric'))
      updates.units = body.units;
    if (typeof body.activePlanId === 'string') updates.activePlanId = body.activePlanId;
    if (typeof body.planStartedAt === 'string') {
      const d = new Date(body.planStartedAt);
      if (!Number.isNaN(d.getTime())) updates.planStartedAt = d;
    }
    if (body.activePlanDayNumber === null) {
      updates.activePlanDayNumber = null;
    } else if (typeof body.activePlanDayNumber === 'number' && body.activePlanDayNumber >= 1) {
      updates.activePlanDayNumber = Math.floor(body.activePlanDayNumber);
    }
    await connectDB();
    const user = await User.findByIdAndUpdate(
      session.user.id,
      { $set: updates },
      { new: true }
    )
      .select(ME_FIELDS)
      .lean();
    if (!user || Array.isArray(user)) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(serializeUser(user as UserMeFields & { planStartedAt?: Date }));
  } catch (e) {
    console.error('User me PATCH error:', e);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
