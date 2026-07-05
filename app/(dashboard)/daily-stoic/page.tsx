import { Suspense } from 'react';
import { DailyStoicBrowser } from '@/components/daily-stoic/DailyStoicBrowser';

function BrowserFallback() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="h-10 w-48 rounded bg-bg3 animate-pulse" />
      <div className="h-8 rounded bg-bg3 animate-pulse" />
      <div className="h-40 rounded-card bg-bg3 animate-pulse" />
    </div>
  );
}

export default function DailyStoicPage() {
  return (
    <Suspense fallback={<BrowserFallback />}>
      <DailyStoicBrowser />
    </Suspense>
  );
}
