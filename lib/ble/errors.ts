/** Map browser Web Bluetooth failures to actionable messages. */
export function formatWebBluetoothError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Could not connect';

  if (/globally disabled/i.test(raw)) {
    return [
      'Web Bluetooth is disabled in this browser.',
      'Use Chrome or Edge (not Brave/Cursor preview), open the site on localhost or HTTPS,',
      'and check chrome://flags/#enable-web-bluetooth plus chrome://policy for DefaultWebBluetoothGuardSetting.',
    ].join(' ');
  }

  if (/not supported|bluetooth is not available/i.test(raw)) {
    return 'Web Bluetooth is not supported here. Use Chrome or Edge on desktop or Android.';
  }

  return raw;
}
