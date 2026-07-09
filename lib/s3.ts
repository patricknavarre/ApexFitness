import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';
import type { UploadResult } from '@/lib/storage';

function getS3Client(): S3Client | null {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucket = process.env.AWS_S3_BUCKET;
  if (!region || !accessKeyId || !secretAccessKey || !bucket) return null;
  return new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
}

function publicUrl(key: string): string {
  const cdn = process.env.CLOUDFRONT_DOMAIN?.replace(/\/$/, '');
  if (cdn) return `https://${cdn}/${key}`;
  const bucket = process.env.AWS_S3_BUCKET!;
  const region = process.env.AWS_REGION!;
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

export function isS3Configured(): boolean {
  return getS3Client() !== null;
}

export async function uploadPhotoToS3(
  buffer: Buffer,
  userId: string,
  folder: 'analysis' | 'progress'
): Promise<UploadResult> {
  const client = getS3Client();
  const bucket = process.env.AWS_S3_BUCKET;
  if (!client || !bucket) {
    throw new Error('S3 is not configured');
  }

  const timestamp = Date.now();
  const originalKey = `users/${userId}/${folder}/${timestamp}-original.jpg`;
  const thumbKey = `users/${userId}/${folder}/${timestamp}-thumb.jpg`;

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
    client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: originalKey,
        Body: originalBuffer,
        ContentType: 'image/jpeg',
      })
    ),
    client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: thumbKey,
        Body: thumbBuffer,
        ContentType: 'image/jpeg',
      })
    ),
  ]);

  return {
    originalUrl: publicUrl(originalKey),
    originalKey,
    thumbUrl: publicUrl(thumbKey),
    thumbKey,
  };
}

export async function deletePhotoFromS3(key: string): Promise<void> {
  const client = getS3Client();
  const bucket = process.env.AWS_S3_BUCKET;
  if (!client || !bucket) return;
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
