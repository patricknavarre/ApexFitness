'use client';

import { getTodayKey } from '@/lib/daily-stoic-constants';

type Props = {
  month: string;
  availableDays: number[];
  selectedDay: number | null;
  onSelectDay: (day: number) => void;
};

const MAX_DAYS = 31;

export function DayPicker({ month, availableDays, selectedDay, onSelectDay }: Props) {
  const todayKey = getTodayKey();
  const availableSet = new Set(availableDays);

  const cells: (number | null)[] = [];
  for (let d = 1; d <= MAX_DAYS; d++) {
    cells.push(availableSet.has(d) ? d : null);
  }

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {cells.map((day, i) => {
        if (day === null) {
          return <div key={`empty-${i}`} className="aspect-square" aria-hidden />;
        }

        const key = `${month}-${day.toString().padStart(2, '0')}`;
        const isToday = key === todayKey;
        const isSelected = selectedDay === day;

        return (
          <button
            key={day}
            type="button"
            onClick={() => onSelectDay(day)}
            className={`relative aspect-square rounded-lg font-mono text-sm font-bold transition-all flex items-center justify-center ${
              isSelected
                ? 'border border-accent3 bg-accent3/15 text-accent3 shadow-glow-accent3'
                : 'border border-border text-muted hover:border-accent3/40 hover:text-text hover:bg-bg2'
            }`}
          >
            {day}
            {isToday && (
              <span className="absolute -top-1 -right-1 rounded-full bg-accent px-1 py-px font-sans text-[7px] font-bold uppercase tracking-wide text-black leading-none">
                Now
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
