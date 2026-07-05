import { NextResponse } from 'next/server';
import { getMeditationForToday } from '@/lib/daily-stoic';

export async function GET() {
  const meditation = getMeditationForToday();
  if (!meditation) {
    return NextResponse.json({ error: 'Meditation not found for today' }, { status: 404 });
  }
  return NextResponse.json(meditation);
}
