import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

const UPLOAD_DIR = path.join(process.cwd(), '.apex-uploads');

export type UploadResult = {
  originalUrl: string;
  originalKey: string;
  thumbUrl: string;
  thumbKey: string;
};

/** On Vercel, the filesystem is read-only; local storage does not persist. */
const isVercel = typeof process !== 'undefined' && process.env.VERCEL === '1';

export async function uploadPhoto(
  buffer: Buffer,
  userId: string,
  folder: 'analysis' | 'progress'
): Promise<UploadResult> {
  if (isVercel) {
    const err = new Error(
      'Photo storage is not available on Vercel with local storage. Configure S3 (AWS_*) for production or run locally.'
    ) as Error & { code?: string };
    err.code = 'STORAGE_UNAVAILABLE';
    throw err;
  }
  const timestamp = Date.now();
  const dir = path.join(UPLOAD_DIR, 'users', userId, folder);
  await fs.mkdir(dir, { recursive: true });

  const originalKey = `users/${userId}/${folder}/${timestamp}-original.jpg`;
  const thumbKey = `users/${userId}/${folder}/${timestamp}-thumb.jpg`;
  const originalPath = path.join(UPLOAD_DIR, originalKey);
  const thumbPath = path.join(UPLOAD_DIR, thumbKey);

  const [originalBuffer, thumbBuffer] = await Promise.all([
    sharp(buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer(),
    sharp(buffer)
      .resize({ width: 400, withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer(),
  ]);

  await Promise.all([
    fs.writeFile(originalPath, originalBuffer),
    fs.writeFile(thumbPath, thumbBuffer),
  ]);

  return {
    originalUrl: `/api/uploads/${originalKey}`,
    originalKey,
    thumbUrl: `/api/uploads/${thumbKey}`,
    thumbKey,
  };
}

export async function deletePhoto(key: string): Promise<void> {
  const filePath = path.join(UPLOAD_DIR, key);
  try {
    await fs.unlink(filePath);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }
}
