'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';

type ProgressPhotoItem = {
  id: string;
  photoUrl: string;
  thumbnailUrl: string;
  takenAt: string;
};

export function ProgressSnapshotCard() {
  const [photos, setPhotos] = useState<ProgressPhotoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/progress')
      .then((res) => (res.ok ? res.json() : { photos: [] }))
      .then((data) => {
        if (!cancelled) {
          const list = (data.photos ?? []) as ProgressPhotoItem[];
          setPhotos([...list].sort((a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime()));
        }
      })
      .catch(() => {
        if (!cancelled) setPhotos([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-card p-5 sm:p-6 animate-pulse">
        <div className="h-4 w-32 bg-bg3 rounded mb-4" />
        <div className="h-24 bg-bg3 rounded" />
      </div>
    );
  }

  const first = photos[0];
  const latest = photos.length > 0 ? photos[photos.length - 1] : null;

  return (
    <Link
      href={photos.length >= 2 ? '/progress' : '/analysis'}
      className="block bg-card border border-border rounded-card p-5 sm:p-6 hover:border-accent/40 transition-colors"
    >
      <h2 className="font-display text-lg text-muted uppercase tracking-wide mb-3">
        Progress
      </h2>
      {photos.length >= 2 && first && latest ? (
        <div className="flex gap-3 items-center">
          <div className="flex-1 text-center">
            <div className="relative aspect-[3/4] max-h-28 mx-auto rounded-card overflow-hidden bg-bg2">
              <Image src={first.thumbnailUrl} alt="First photo" fill className="object-cover" unoptimized />
            </div>
            <p className="font-mono text-[10px] text-muted mt-1">
              {format(new Date(first.takenAt), 'MMM d')}
            </p>
          </div>
          <span className="text-muted font-mono text-xs">→</span>
          <div className="flex-1 text-center">
            <div className="relative aspect-[3/4] max-h-28 mx-auto rounded-card overflow-hidden bg-bg2">
              <Image src={latest.thumbnailUrl} alt="Latest photo" fill className="object-cover" unoptimized />
            </div>
            <p className="font-mono text-[10px] text-muted mt-1">
              {format(new Date(latest.takenAt), 'MMM d')}
            </p>
          </div>
        </div>
      ) : (
        <p className="font-sans text-sm text-muted">
          Add progress photos via AI Analysis to track your transformation.
        </p>
      )}
    </Link>
  );
}
