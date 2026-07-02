export const SHAKE_KEYWORDS = [
  'protein shake',
  'protein powder',
  'whey',
  'casein',
  'mass gainer',
  'protein drink',
  'pre-workout shake',
  'post-workout shake',
  'protein smoothie',
] as const;

export const SHAKE_PROTEIN_SESSION_KEY = 'apexLastShakeProteinG';

export function detectsProteinShake(input: string): boolean {
  const lower = input.toLowerCase();
  return SHAKE_KEYWORDS.some((kw) => lower.includes(kw));
}

export function findShakeItemIndices(items: { foodName: string }[]): number[] {
  return items
    .map((item, idx) => (detectsProteinShake(item.foodName) ? idx : -1))
    .filter((idx) => idx >= 0);
}

export function getLastShakeProteinG(): string {
  if (typeof sessionStorage === 'undefined') return '';
  try {
    return sessionStorage.getItem(SHAKE_PROTEIN_SESSION_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveLastShakeProteinG(grams: number): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(SHAKE_PROTEIN_SESSION_KEY, String(grams));
  } catch {
    // ignore
  }
}

export function applyConfirmedProteinToItems<T extends { foodName: string; proteinG: number }>(
  items: T[],
  confirmedProteinG: number
): T[] {
  const indices = findShakeItemIndices(items);
  if (indices.length === 0) return items;
  return items.map((item, idx) =>
    indices.includes(idx) ? { ...item, proteinG: confirmedProteinG } : item
  );
}
