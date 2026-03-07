export type CardioOption = {
  id: string;
  label: string;
  calPerMin: number;
};

export const CARDIO_OPTIONS: CardioOption[] = [
  { id: 'cycling', label: 'Cycling', calPerMin: 9 },
  { id: 'indoor-cycling', label: 'Indoor cycling', calPerMin: 9 },
  { id: 'running', label: 'Running', calPerMin: 11 },
  { id: 'rowing', label: 'Rowing', calPerMin: 8 },
  { id: 'swimming', label: 'Swimming', calPerMin: 10 },
  { id: 'jump-rope', label: 'Jump rope', calPerMin: 11 },
  { id: 'walking', label: 'Walking', calPerMin: 4 },
  { id: 'elliptical', label: 'Elliptical', calPerMin: 8 },
  { id: 'stair-climber', label: 'Stair climber', calPerMin: 9 },
  { id: 'hiit', label: 'HIIT', calPerMin: 10 },
];

const CARDIO_BY_ID = new Map(CARDIO_OPTIONS.map((c) => [c.id, c]));

export function getCardioOption(id: string): CardioOption | undefined {
  return CARDIO_BY_ID.get(id);
}

export function getCardioLabel(id: string): string {
  return getCardioOption(id)?.label ?? id;
}
