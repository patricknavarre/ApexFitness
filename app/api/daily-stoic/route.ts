import { NextRequest, NextResponse } from 'next/server';
import { getMeditationForMonthDay, getMeditationForToday } from '@/lib/daily-stoic';

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get('month');
  const dayParam = request.nextUrl.searchParams.get('day');

  if (month && dayParam) {
    const day = parseInt(dayParam, 10);
    if (Number.isNaN(day) || day < 1 || day > 31) {
      return NextResponse.json({ error: 'Invalid day' }, { status: 400 });
    }
    const meditation = getMeditationForMonthDay(month, day);
    if (!meditation) {
      return NextResponse.json({ error: 'Meditation not found' }, { status: 404 });
    }
    return NextResponse.json(meditation);
  }

  const meditation = getMeditationForToday();
  if (!meditation) {
    return NextResponse.json({ error: 'Meditation not found for today' }, { status: 404 });
  }
  return NextResponse.json(meditation);
}
