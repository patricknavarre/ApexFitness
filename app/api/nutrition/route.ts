import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import NutritionLog from '@/models/NutritionLog';

const MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'] as const;
type Meal = (typeof MEALS)[number];

function startOfDay(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfDay(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get('date');
  if (!dateStr) {
    return NextResponse.json(
      { error: 'Missing date (YYYY-MM-DD)', code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }
  try {
    await connectDB();
    const start = startOfDay(dateStr);
    const end = endOfDay(dateStr);
    const entries = await NutritionLog.find({
      userId: session.user.id,
      logDate: { $gte: start, $lte: end },
    })
      .sort({ createdAt: 1 })
      .lean();
    const list = entries.map((e) => ({
      id: String(e._id),
      meal: e.meal,
      foodName: e.foodName ?? '',
      calories: e.calories ?? 0,
      proteinG: e.proteinG ?? 0,
      carbsG: e.carbsG ?? 0,
      fatG: e.fatG ?? 0,
    }));
    return NextResponse.json({ entries: list });
  } catch (e) {
    console.error('Nutrition GET error:', e);
    return NextResponse.json(
      { error: 'Failed to load log' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const {
      logDate,
      meal,
      foodName,
      calories,
      proteinG,
      carbsG,
      fatG,
    } = body as {
      logDate: string;
      meal: string;
      foodName?: string;
      calories?: number;
      proteinG?: number;
      carbsG?: number;
      fatG?: number;
    };
    if (!logDate || typeof logDate !== 'string') {
      return NextResponse.json(
        { error: 'Missing logDate', code: 'BAD_REQUEST' },
        { status: 400 }
      );
    }
    if (!meal || !MEALS.includes(meal as Meal)) {
      return NextResponse.json(
        { error: 'Invalid meal (breakfast, lunch, dinner, snacks)', code: 'BAD_REQUEST' },
        { status: 400 }
      );
    }
    await connectDB();
    const logDateObj = startOfDay(logDate);
    const doc = await NutritionLog.create({
      userId: session.user.id,
      logDate: logDateObj,
      meal,
      foodName: foodName ?? '',
      calories: calories ?? 0,
      proteinG: proteinG ?? 0,
      carbsG: carbsG ?? 0,
      fatG: fatG ?? 0,
    });
    return NextResponse.json({
      id: String(doc._id),
      meal: doc.meal,
      foodName: doc.foodName ?? '',
      calories: doc.calories ?? 0,
      proteinG: doc.proteinG ?? 0,
      carbsG: doc.carbsG ?? 0,
      fatG: doc.fatG ?? 0,
    });
  } catch (e) {
    console.error('Nutrition POST error:', e);
    return NextResponse.json(
      { error: 'Failed to add entry' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json(
      { error: 'Missing id', code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }
  try {
    await connectDB();
    const result = await NutritionLog.findOneAndDelete({
      _id: id,
      userId: session.user.id,
    });
    if (!result) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Nutrition DELETE error:', e);
    return NextResponse.json(
      { error: 'Failed to delete entry' },
      { status: 500 }
    );
  }
}
