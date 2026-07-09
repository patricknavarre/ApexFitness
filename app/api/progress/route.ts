import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import ProgressPhoto from '@/models/ProgressPhoto';
import Analysis from '@/models/Analysis';
import { deletePhoto } from '@/lib/storage';

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
      weightKg: p.weightKg ?? null,
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

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id', code: 'BAD_REQUEST' }, { status: 400 });
  }
  try {
    await connectDB();
    const photo = await ProgressPhoto.findOne({ _id: id, userId: session.user.id }).lean();
    if (!photo || Array.isArray(photo)) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }
    await ProgressPhoto.deleteOne({ _id: id, userId: session.user.id });
    const keys = [photo.s3Key, photo.thumbnailS3Key].filter(
      (k): k is string => typeof k === 'string' && k.length > 0
    );
    await Promise.all(keys.map((key) => deletePhoto(key)));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Progress DELETE error:', e);
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
  }
}
