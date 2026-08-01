import {
  formatDailyStoicShareText,
  type DailyStoicMeditation,
} from '@/lib/daily-stoic';

export type ShareDailyStoicResult = 'shared' | 'copied';

export async function shareDailyStoic(
  meditation: DailyStoicMeditation & { dateLabel?: string }
): Promise<ShareDailyStoicResult> {
  const text = formatDailyStoicShareText(meditation);

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (err) {
      // User dismissed the sheet — don't fall through to clipboard
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
    }
  }

  await navigator.clipboard.writeText(text);
  return 'copied';
}
