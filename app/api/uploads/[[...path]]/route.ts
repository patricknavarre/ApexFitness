import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

const UPLOAD_DIR = path.join(process.cwd(), '.apex-uploads');

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const resolved = await params;
  const pathSegments = resolved.path ?? [];
  if (pathSegments.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const filePath = path.join(UPLOAD_DIR, ...pathSegments);
  if (!filePath.startsWith(UPLOAD_DIR)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const buffer = await fs.readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    throw e;
  }
}
