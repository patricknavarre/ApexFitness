'use client';

import { formatDistance } from '@/lib/ride/format';
import type { CourseSegmentHint } from '@/lib/ride/courses';
import type { WorkoutProgress } from '@/lib/ride/workouts';
import type { SpeedUnit } from '@/lib/ride/stats';

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function CourseClimbHud({
  courseName,
  distanceM,
  courseLengthM,
  grade,
  elevationGainM,
  hint,
  finished,
  distanceUnit = 'kmh',
}: {
  courseName: string;
  distanceM: number;
  courseLengthM: number;
  grade: number;
  elevationGainM: number;
  hint: CourseSegmentHint;
  finished: boolean;
  distanceUnit?: SpeedUnit;
}) {
  const pct = Math.min(100, Math.round((distanceM / Math.max(1, courseLengthM)) * 100));
  return (
    <div className="rounded-card border border-border bg-bg2 px-3 py-3 space-y-2">
      <div className="flex justify-between gap-2">
        <p className="font-display text-sm text-accent uppercase tracking-wide">
          {finished ? 'Course complete' : courseName}
        </p>
        <p className="font-mono text-[10px] text-muted">
          {formatDistance(distanceM, distanceUnit)} /{' '}
          {formatDistance(courseLengthM, distanceUnit)}
        </p>
      </div>
      <div className="h-1.5 rounded-full bg-bg3 overflow-hidden">
        <div className="h-full bg-accent transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      <div className="grid grid-cols-3 gap-2 font-sans text-xs">
        <div>
          <p className="text-muted uppercase text-[10px] tracking-wider">Grade</p>
          <p className="font-mono text-text text-lg">
            {grade >= 0 ? '+' : ''}
            {grade.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-muted uppercase text-[10px] tracking-wider">Climbing</p>
          <p className="font-mono text-text text-lg">{Math.round(elevationGainM)} m</p>
        </div>
        <div>
          <p className="text-muted uppercase text-[10px] tracking-wider">Next</p>
          <p className="font-sans text-text text-sm leading-tight">
            {hint.label}
            <span className="block font-mono text-[10px] text-muted">
              {Math.round(hint.remainingMeters)} m
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export function WorkoutIntervalHud({ progress }: { progress: WorkoutProgress }) {
  return (
    <div className="rounded-card border border-accent/40 bg-bg2 px-3 py-3 space-y-2">
      <div className="flex justify-between gap-2">
        <p className="font-display text-sm text-accent uppercase tracking-wide">
          {progress.done ? 'Workout complete' : progress.segment.name}
        </p>
        <p className="font-mono text-[10px] text-muted">
          {progress.overallProgressPct}% done
        </p>
      </div>
      <div className="h-1.5 rounded-full bg-bg3 overflow-hidden">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${progress.overallProgressPct}%` }}
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="font-sans text-[10px] uppercase tracking-wider text-muted">Target</p>
          <p className="font-mono text-2xl text-text">{progress.targetWatts}</p>
          <p className="font-sans text-[10px] text-muted">W · {Math.round(progress.segment.ftpPercent * 100)}% FTP</p>
        </div>
        <div>
          <p className="font-sans text-[10px] uppercase tracking-wider text-muted">Interval</p>
          <p className="font-mono text-2xl text-text">
            {formatDuration(progress.segmentRemainingSec)}
          </p>
          <p className="font-sans text-[10px] text-muted">remaining</p>
        </div>
        <div>
          <p className="font-sans text-[10px] uppercase tracking-wider text-muted">Total left</p>
          <p className="font-mono text-2xl text-text">
            {formatDuration(progress.overallRemainingSec)}
          </p>
          <p className="font-sans text-[10px] text-muted">
            block {progress.segmentIndex + 1}
          </p>
        </div>
      </div>
    </div>
  );
}
