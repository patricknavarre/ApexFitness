export type FoodItem = {
  foodName: string;
  estimatedCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export function normalizeFoodItem(raw: unknown): FoodItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.foodName !== 'string') return null;
  return {
    foodName: o.foodName,
    estimatedCalories: Math.max(0, Number(o.estimatedCalories) || 0),
    proteinG: Math.max(0, Number(o.proteinG) || 0),
    carbsG: Math.max(0, Number(o.carbsG) || 0),
    fatG: Math.max(0, Number(o.fatG) || 0),
  };
}

/** Parse Claude food JSON into a non-empty FoodItem list, or null on failure. */
export function parseFoodJson(text: string): FoodItem[] | null {
  const cleaned = text.replace(/^```json?\s*|\s*```$/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned) as unknown;
    let arr: unknown[];
    if (Array.isArray(parsed)) {
      arr = parsed;
    } else if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as { items?: unknown[] }).items)
    ) {
      arr = (parsed as { items: unknown[] }).items;
    } else if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as Record<string, unknown>).foodName === 'string'
    ) {
      const one = normalizeFoodItem(parsed);
      return one ? [one] : null;
    } else {
      return null;
    }
    const items: FoodItem[] = [];
    for (const entry of arr) {
      const item = normalizeFoodItem(entry);
      if (item) items.push(item);
    }
    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}
