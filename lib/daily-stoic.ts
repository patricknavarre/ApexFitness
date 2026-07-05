import meditations from '@/data/daily-stoic.json';
import { getDateKey, getTodayKey, MONTHS } from '@/lib/daily-stoic-constants';

export { MONTHS, getDateKey, getTodayKey };

export type DailyStoicMeditation = {
  title: string;
  quote: string;
  source: string;
  reflection: string;
};

export type DailyStoicResponse = DailyStoicMeditation & {
  dateLabel: string;
  key: string;
};

export type DailyStoicIndexEntry = {
  key: string;
  month: string;
  day: number;
  title: string;
};

const meditationMap = meditations as Record<string, DailyStoicMeditation>;

const MONTH_ORDER = MONTHS.map((m) => m.key);

function parseKey(key: string): { month: string; day: number } | null {
  const match = key.match(/^([a-z]+)-(\d{2})$/);
  if (!match) return null;
  return { month: match[1], day: parseInt(match[2], 10) };
}

function sortKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const pa = parseKey(a);
    const pb = parseKey(b);
    if (!pa || !pb) return 0;
    const ma = MONTH_ORDER.indexOf(pa.month as (typeof MONTH_ORDER)[number]);
    const mb = MONTH_ORDER.indexOf(pb.month as (typeof MONTH_ORDER)[number]);
    if (ma !== mb) return ma - mb;
    return pa.day - pb.day;
  });
}

const sortedKeys = sortKeys(Object.keys(meditationMap));

let cachedIndex: DailyStoicIndexEntry[] | null = null;

export function formatDateLabel(date: Date = new Date()): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateLabelFromKey(key: string): string {
  const parsed = parseKey(key);
  if (!parsed) return key;
  const date = new Date(
    2024,
    MONTH_ORDER.indexOf(parsed.month as (typeof MONTH_ORDER)[number]),
    parsed.day,
  );
  return formatDateLabel(date);
}

function buildResponse(key: string, entry: DailyStoicMeditation): DailyStoicResponse {
  return {
    ...entry,
    key,
    dateLabel: formatDateLabelFromKey(key),
  };
}

export function getMeditationIndex(): DailyStoicIndexEntry[] {
  if (cachedIndex) return cachedIndex;
  cachedIndex = sortedKeys.map((key) => {
    const parsed = parseKey(key)!;
    return {
      key,
      month: parsed.month,
      day: parsed.day,
      title: meditationMap[key].title,
    };
  });
  return cachedIndex;
}

export function getMeditationByKey(key: string): DailyStoicResponse | null {
  const entry = meditationMap[key];
  if (!entry) return null;
  return buildResponse(key, entry);
}

export function getMeditationForMonthDay(month: string, day: number): DailyStoicResponse | null {
  const key = `${month.toLowerCase()}-${day.toString().padStart(2, '0')}`;
  return getMeditationByKey(key);
}

export function getMeditationForDate(date: Date = new Date()): DailyStoicResponse | null {
  return getMeditationByKey(getDateKey(date));
}

export function getMeditationForToday(): DailyStoicResponse | null {
  return getMeditationForDate(new Date());
}

export function getAdjacentKeys(key: string): { prev: string | null; next: string | null } {
  const idx = sortedKeys.indexOf(key);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? sortedKeys[idx - 1] : null,
    next: idx < sortedKeys.length - 1 ? sortedKeys[idx + 1] : null,
  };
}

export function getDaysForMonth(month: string): number[] {
  return getMeditationIndex()
    .filter((e) => e.month === month.toLowerCase())
    .map((e) => e.day);
}
