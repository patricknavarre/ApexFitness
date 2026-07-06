export const MONTHS = [
  { key: 'january', label: 'Jan' },
  { key: 'february', label: 'Feb' },
  { key: 'march', label: 'Mar' },
  { key: 'april', label: 'Apr' },
  { key: 'may', label: 'May' },
  { key: 'june', label: 'Jun' },
  { key: 'july', label: 'Jul' },
  { key: 'august', label: 'Aug' },
  { key: 'september', label: 'Sep' },
  { key: 'october', label: 'Oct' },
  { key: 'november', label: 'Nov' },
  { key: 'december', label: 'Dec' },
] as const;

export function getDateKey(date: Date = new Date()): string {
  const month = date.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
  const day = date.getDate().toString().padStart(2, '0');
  return `${month}-${day}`;
}

export function getTodayKey(): string {
  return getDateKey(new Date());
}

const MONTH_INDEX: Record<(typeof MONTHS)[number]['key'], number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

export const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

export function getMonthCalendarMeta(
  month: string,
  year: number = new Date().getFullYear(),
): { startOffset: number; daysInMonth: number } {
  const monthIndex = MONTH_INDEX[month as keyof typeof MONTH_INDEX];
  if (monthIndex === undefined) return { startOffset: 0, daysInMonth: 31 };
  return {
    startOffset: new Date(year, monthIndex, 1).getDay(),
    daysInMonth: new Date(year, monthIndex + 1, 0).getDate(),
  };
}
