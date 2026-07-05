'use client';

import { MONTHS } from '@/lib/daily-stoic-constants';

type Props = {
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
};

export function MonthPicker({ selectedMonth, onSelectMonth }: Props) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
      {MONTHS.map((m) => {
        const active = selectedMonth === m.key;
        return (
          <button
            key={m.key}
            type="button"
            onClick={() => onSelectMonth(m.key)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 font-sans text-xs font-semibold transition-all ${
              active
                ? 'border border-accent3 bg-accent3/10 text-accent3 shadow-glow-accent3'
                : 'border border-border text-muted hover:border-accent3/40 hover:text-text'
            }`}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
