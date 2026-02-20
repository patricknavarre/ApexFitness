'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

type AnalysisSummary = {
  bodyType?: string;
  bodyFatRange?: string;
  summary?: string;
};

type ProgressPhotoItem = {
  id: string;
  photoUrl: string;
  thumbnailUrl: string;
  takenAt: string;
  analysis: AnalysisSummary | null;
};

export default function ProgressPage() {
  const [photos, setPhotos] = useState<ProgressPhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [compareLeft, setCompareLeft] = useState<string>('');
  const [compareRight, setCompareRight] = useState<string>('');
  const [sliderPos, setSliderPos] = useState(50);
  const compareContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/progress')
      .then((res) => (res.ok ? res.json() : { photos: [] }))
      .then((data) => {
        if (!cancelled) setPhotos(data.photos ?? []);
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

  useEffect(() => {
    if (photos.length > 0 && !compareLeft) setCompareLeft(photos[0].id);
    if (photos.length > 1 && !compareRight) setCompareRight(photos[1].id);
  }, [photos, compareLeft, compareRight]);

  const leftPhoto = photos.find((p) => p.id === compareLeft);
  const rightPhoto = photos.find((p) => p.id === compareRight);
  const canCompare = leftPhoto && rightPhoto && leftPhoto.id !== rightPhoto.id;

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl text-accent uppercase tracking-wide">
          Progress
        </h1>
        <div className="rounded-card border border-border bg-bg2 h-64 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-3xl text-accent uppercase tracking-wide">
          Progress
        </h1>
        <p className="font-sans text-muted mt-2">
          Your photo timeline. Save photos from AI Analysis to build your history.
        </p>
      </div>

      {photos.length === 0 ? (
        <div className="rounded-card border border-border bg-card p-8 text-center">
          <p className="font-sans text-muted mb-4">
            No progress photos yet. Run an AI Analysis and choose &quot;Save to Progress
            timeline&quot; to add your first photo.
          </p>
          <Link
            href="/analysis"
            className="inline-block bg-accent text-black font-sans font-bold uppercase px-6 py-3 rounded-card hover:shadow-glow transition-shadow"
          >
            Go to AI Analysis
          </Link>
        </div>
      ) : (
        <>
          {/* Comparison slider */}
          {photos.length >= 2 && (
            <section>
              <h2 className="font-display text-xl text-accent uppercase tracking-wide mb-3">
                Compare
              </h2>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <select
                  value={compareLeft}
                  onChange={(e) => setCompareLeft(e.target.value)}
                  className="bg-bg2 border border-border rounded-card px-3 py-2 font-sans text-sm text-text"
                >
                  {photos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {format(new Date(p.takenAt), 'MMM d, yyyy')}
                    </option>
                  ))}
                </select>
                <span className="font-sans text-muted text-sm">vs</span>
                <select
                  value={compareRight}
                  onChange={(e) => setCompareRight(e.target.value)}
                  className="bg-bg2 border border-border rounded-card px-3 py-2 font-sans text-sm text-text"
                >
                  {photos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {format(new Date(p.takenAt), 'MMM d, yyyy')}
                    </option>
                  ))}
                </select>
              </div>
              {canCompare && (
                <div
                  ref={compareContainerRef}
                  className="relative rounded-card border border-border bg-bg2 overflow-hidden aspect-[3/4] max-h-[400px] select-none"
                >
                  <div className="absolute inset-0">
                    <img
                      src={rightPhoto!.photoUrl}
                      alt="After"
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ width: `${sliderPos}%` }}
                  >
                    <img
                      src={leftPhoto!.photoUrl}
                      alt="Before"
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-accent cursor-ew-resize z-10"
                    style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const onMove = (e2: MouseEvent) => {
                        const rect = compareContainerRef.current?.getBoundingClientRect();
                        if (!rect) return;
                        const pct = ((e2.clientX - rect.left) / rect.width) * 100;
                        setSliderPos(Math.min(100, Math.max(0, pct)));
                      };
                      const onUp = () => {
                        document.removeEventListener('mousemove', onMove);
                        document.removeEventListener('mouseup', onUp);
                      };
                      document.addEventListener('mousemove', onMove);
                      document.addEventListener('mouseup', onUp);
                      onMove(e.nativeEvent);
                    }}
                  />
                  <div
                    className="absolute top-2 left-2 font-sans text-xs bg-black/60 text-white px-2 py-1 rounded"
                  >
                    {format(new Date(leftPhoto!.takenAt), 'MMM d, yyyy')}
                  </div>
                  <div
                    className="absolute top-2 right-2 font-sans text-xs bg-black/60 text-white px-2 py-1 rounded"
                  >
                    {format(new Date(rightPhoto!.takenAt), 'MMM d, yyyy')}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Timeline */}
          <section>
            <h2 className="font-display text-xl text-accent uppercase tracking-wide mb-3">
              Timeline
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {photos.map((p) => (
                <div
                  key={p.id}
                  className="rounded-card border border-border bg-card overflow-hidden"
                >
                  <a
                    href={p.photoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-[3/4] bg-bg2"
                  >
                    <img
                      src={p.thumbnailUrl || p.photoUrl}
                      alt={format(new Date(p.takenAt), 'MMM d, yyyy')}
                      className="w-full h-full object-cover object-top"
                    />
                  </a>
                  <div className="p-3">
                    <p className="font-sans text-sm font-medium text-text">
                      {format(new Date(p.takenAt), 'MMM d, yyyy')}
                    </p>
                    {p.analysis?.bodyType && (
                      <p className="font-sans text-xs text-muted mt-0.5">
                        {p.analysis.bodyType}
                        {p.analysis.bodyFatRange ? ` · ${p.analysis.bodyFatRange}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
