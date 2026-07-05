import { NextResponse } from 'next/server';
import { getMeditationIndex } from '@/lib/daily-stoic';

export async function GET() {
  return NextResponse.json({ entries: getMeditationIndex() });
}
