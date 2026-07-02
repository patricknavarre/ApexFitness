'use client';

import { useEffect } from 'react';
import { getLastShakeProteinG } from '@/lib/protein-shake';

const COMMON_AMOUNTS = [20, 25, 30, 40, 50];

type Props = {
  visible: boolean;
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ProteinShakeModal({ visible, value, onChange, onConfirm, onCancel }: Props) {
  useEffect(() => {
    if (visible && !value) {
      const last = getLastShakeProteinG();
      if (last) onChange(last);
    }
  }, [visible, value, onChange]);

  if (!visible) return null;

  const grams = parseInt(value, 10);
  const isValid = grams >= 1 && grams <= 300;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-6">
      <div className="w-full max-w-[340px] rounded-card border border-border bg-card p-6 sm:p-7">
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">🥤</div>
          <h2 className="font-display text-xl text-text uppercase tracking-wide mb-2">
            Protein Shake Detected
          </h2>
          <p className="font-sans text-sm text-muted leading-relaxed">
            How many grams of protein did you add? We&apos;ll use the exact amount instead of
            guessing.
          </p>
        </div>

        <div className="relative mb-2">
          <input
            type="number"
            inputMode="numeric"
            placeholder="e.g. 25"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            min={1}
            max={300}
            autoFocus
            className={`w-full rounded-card bg-bg border px-4 py-3.5 pr-16 font-mono text-xl font-bold text-text outline-none focus:ring-2 focus:ring-accent3 ${
              value && !isValid ? 'border-accent2' : 'border-border focus:border-accent3'
            }`}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-sans text-sm font-semibold text-muted">
            grams
          </span>
        </div>

        <p className="font-sans text-xs text-muted mb-5 min-h-[16px]">
          {value && !isValid ? 'Enter a value between 1 and 300g' : ''}
        </p>

        <div className="mb-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2">
            Common amounts
          </p>
          <div className="flex flex-wrap gap-2">
            {COMMON_AMOUNTS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onChange(String(g))}
                className={`rounded-lg border px-3.5 py-1.5 font-mono text-sm font-bold transition-colors ${
                  value === String(g)
                    ? 'border-accent3 bg-accent3/10 text-accent3'
                    : 'border-border text-muted hover:border-accent3/50'
                }`}
              >
                {g}g
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-card border border-border bg-transparent py-3 font-sans text-sm font-bold text-muted hover:border-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isValid}
            className="flex-[2] rounded-card py-3 font-sans text-sm font-bold text-black bg-accent3 hover:shadow-glow-accent3 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
