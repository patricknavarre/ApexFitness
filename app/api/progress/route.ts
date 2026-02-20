import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import ProgressPhoto from '@/models/ProgressPhoto';
import Analysis from '@/models/Analysis';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await connectDB();
    const photos = await ProgressPhoto.find({ userId: session.user.id })
      .sort({ takenAt: -1 })
      .lean();
    const analysisIds = photos.map((p) => p.analysisId).filter(Boolean) as string[];
    const analyses =
      analysisIds.length > 0
        ? await Analysis.find({ _id: { $in: analysisIds } })
            .select('bodyType bodyFatRange summary')
            .lean()
        : [];
    const analysisMap = Object.fromEntries(
      analyses.map((a) => [String(a._id), a])
    );
    const list = photos.map((p) => ({
      id: String(p._id),
      photoUrl: p.photoUrl,
      thumbnailUrl: p.thumbnailUrl ?? p.photoUrl,
      takenAt: p.takenAt,
      analysis: p.analysisId
        ? analysisMap[String(p.analysisId)]
        : null,
    }));
    return NextResponse.json({ photos: list });
  } catch (e) {
    console.error('Progress GET error:', e);
    return NextResponse.json(
      { error: 'Failed to load progress' },
      { status: 500 }
    );
  }
}
