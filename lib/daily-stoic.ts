import meditations from '@/data/daily-stoic.json';

export type DailyStoicMeditation = {
  title: string;
  quote: string;
  source: string;
  reflection: string;
};

export type DailyStoicResponse = DailyStoicMeditation & {
  dateLabel: string;
};

const meditationMap = meditations as Record<string, DailyStoicMeditation>;

export function getDateKey(date: Date = new Date()): string {
  const month = date.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
  const day = date.getDate().toString().padStart(2, '0');
  return `${month}-${day}`;
}

export function formatDateLabel(date: Date = new Date()): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function getMeditationForDate(date: Date = new Date()): DailyStoicResponse | null {
  const key = getDateKey(date);
  const entry = meditationMap[key];
  if (!entry) return null;

  return {
    ...entry,
    dateLabel: formatDateLabel(date),
  };
}

export function getMeditationForToday(): DailyStoicResponse | null {
  return getMeditationForDate(new Date());
}
