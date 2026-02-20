import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { uploadPhoto } from '@/lib/storage';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data') && !contentType.includes('application/json')) {
    return NextResponse.json(
      { error: 'Expected multipart form or JSON with base64 image', code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }

  try {
    let buffer: Buffer;
    const folder: 'analysis' | 'progress' =
      (req.headers.get('x-upload-folder') as 'analysis' | 'progress') ?? 'progress';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      const base64 = body.image ?? body.data;
      if (!base64 || typeof base64 !== 'string') {
        return NextResponse.json(
          { error: 'Missing image (base64)', code: 'BAD_REQUEST' },
          { status: 400 }
        );
      }
      const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      const formData = await req.formData();
      const file = formData.get('file') ?? formData.get('image');
      if (!file || !(file instanceof File)) {
        return NextResponse.json(
          { error: 'Missing file', code: 'BAD_REQUEST' },
          { status: 400 }
        );
      }
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    if (buffer.length === 0) {
      return NextResponse.json(
        { error: 'Empty image', code: 'BAD_REQUEST' },
        { status: 400 }
      );
    }

    const result = await uploadPhoto(buffer, session.user.id, folder);
    return NextResponse.json(result);
  } catch (e) {
    console.error('Upload error:', e);
    return NextResponse.json(
      { error: 'Upload failed', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
