'use client';

import { useState } from 'react';
import { getExerciseGuide } from '@/lib/exercise-library';

type Props = {
  exerciseName: string;
};

export function ExerciseGuide({ exerciseName }: Props) {
  const [open, setOpen] = useState(false);
  const guide = getExerciseGuide(exerciseName);

  if (!guide) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-accent3 font-sans text-xs hover:underline"
      >
        {open ? 'Hide how to' : 'How to'}
      </button>
      {open && (
        <div className="mt-1.5 rounded-card border border-border bg-bg3/40 p-3 space-y-2">
          <p className="font-sans text-xs text-muted leading-relaxed">{guide.summary}</p>
          <ul className="list-disc list-inside space-y-1">
            {guide.cues.map((cue) => (
              <li key={cue} className="font-sans text-xs text-muted/90 leading-relaxed">
                {cue}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
