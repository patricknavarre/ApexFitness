/** Local calendar date as YYYY-MM-DD. */
export function todayLocal(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Local calendar date from an ISO timestamp or Date. */
export function toLocalDateOnly(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  return todayLocal(d);
}

/** Whole local calendar days between two YYYY-MM-DD strings (end − start). */
export function diffLocalCalendarDays(startYmd: string, endYmd: string): number | null {
  const [sy, sm, sd] = startYmd.split('-').map(Number);
  const [ey, em, ed] = endYmd.split('-').map(Number);
  if (!sy || !sm || !sd || !ey || !em || !ed) return null;
  const start = Date.UTC(sy, sm - 1, sd);
  const end = Date.UTC(ey, em - 1, ed);
  return Math.round((end - start) / 86_400_000);
}

/** Parse YYYY-MM-DD into a Date at UTC noon (stable date-only round-trip). */
export function dateOnlyToUtcNoon(ymd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const d = new Date(`${ymd}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Serialize a stored Date (or date-only string) back to YYYY-MM-DD. */
export function serializeDateOnly(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    const slice = value.slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(slice) ? slice : toLocalDateOnly(value);
  }
  return value.toISOString().slice(0, 10);
}
