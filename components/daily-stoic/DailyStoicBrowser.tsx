'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { DailyStoicIndexEntry, DailyStoicResponse } from '@/lib/daily-stoic';
import { getTodayKey } from '@/lib/daily-stoic-constants';
import { DailyStoicContent } from '@/components/daily-stoic/DailyStoicContent';
import { MonthPicker } from '@/components/daily-stoic/MonthPicker';
import { DayPicker } from '@/components/daily-stoic/DayPicker';

function parseKey(key: string): { month: string; day: number } | null {
  const match = key.match(/^([a-z]+)-(\d{2})$/);
  if (!match) return null;
  return { month: match[1], day: parseInt(match[2], 10) };
}

function buildAdjacent(index: DailyStoicIndexEntry[], key: string) {
  const keys = index.map((e) => e.key);
  const pos = keys.indexOf(key);
  return {
    prev: pos > 0 ? keys[pos - 1] : null,
    next: pos < keys.length - 1 ? keys[pos + 1] : null,
  };
}

function ReadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-3 w-32 rounded bg-bg3" />
      <div className="h-8 w-3/4 rounded bg-bg3" />
      <div className="h-20 rounded bg-bg3" />
      <div className="h-32 rounded bg-bg3" />
    </div>
  );
}

export function DailyStoicBrowser() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialized = useRef(false);

  const [index, setIndex] = useState<DailyStoicIndexEntry[]>([]);
  const [indexLoading, setIndexLoading] = useState(true);
  const [meditation, setMeditation] = useState<DailyStoicResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fade, setFade] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [adjacent, setAdjacent] = useState<{ prev: string | null; next: string | null }>({
    prev: null,
    next: null,
  });

  const indexByKey = useMemo(() => {
    const map = new Map<string, DailyStoicIndexEntry>();
    for (const e of index) map.set(e.key, e);
    return map;
  }, [index]);

  const availableDays = useMemo(
    () => index.filter((e) => e.month === selectedMonth).map((e) => e.day),
    [index, selectedMonth],
  );

  const updateUrl = useCallback(
    (month: string, day: number) => {
      const params = new URLSearchParams();
      params.set('month', month);
      params.set('day', String(day));
      router.replace(`/daily-stoic?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  const loadMeditation = useCallback(
    async (month: string, day: number, entries: DailyStoicIndexEntry[]) => {
      setLoading(true);
      setFade(false);
      const key = `${month}-${day.toString().padStart(2, '0')}`;
      try {
        const res = await fetch(`/api/daily-stoic?month=${encodeURIComponent(month)}&day=${day}`);
        if (!res.ok) {
          setMeditation(null);
          return;
        }
        const data = (await res.json()) as DailyStoicResponse;
        setMeditation(data);
        setSelectedMonth(month);
        setSelectedDay(day);
        setAdjacent(buildAdjacent(entries, key));
      } catch {
        setMeditation(null);
      } finally {
        setLoading(false);
        requestAnimationFrame(() => setFade(true));
      }
    },
    [],
  );

  const selectByKey = useCallback(
    (key: string) => {
      const parsed = parseKey(key);
      if (!parsed || index.length === 0) return;
      updateUrl(parsed.month, parsed.day);
      loadMeditation(parsed.month, parsed.day, index);
    },
    [index, loadMeditation, updateUrl],
  );

  useEffect(() => {
    let cancelled = false;
    fetch('/api/daily-stoic/index')
      .then((res) => (res.ok ? res.json() : { entries: [] }))
      .then((data) => {
        if (!cancelled) setIndex(data.entries ?? []);
      })
      .catch(() => {
        if (!cancelled) setIndex([]);
      })
      .finally(() => {
        if (!cancelled) setIndexLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (indexLoading || index.length === 0 || initialized.current) return;
    initialized.current = true;

    const monthParam = searchParams.get('month');
    const dayParam = searchParams.get('day');

    if (monthParam && dayParam) {
      const day = parseInt(dayParam, 10);
      const key = `${monthParam.toLowerCase()}-${day.toString().padStart(2, '0')}`;
      if (indexByKey.has(key)) {
        loadMeditation(monthParam.toLowerCase(), day, index);
        return;
      }
    }

    const todayKey = getTodayKey();
    const parsed = parseKey(todayKey);
    if (parsed && indexByKey.has(todayKey)) {
      updateUrl(parsed.month, parsed.day);
      loadMeditation(parsed.month, parsed.day, index);
      return;
    }

    const first = index[0];
    updateUrl(first.month, first.day);
    loadMeditation(first.month, first.day, index);
  }, [indexLoading, index, indexByKey, searchParams, loadMeditation, updateUrl]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft' && adjacent.prev) {
        selectByKey(adjacent.prev);
      } else if (e.key === 'ArrowRight' && adjacent.next) {
        selectByKey(adjacent.next);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [adjacent, selectByKey]);

  function handleMonthChange(month: string) {
    const days = index.filter((e) => e.month === month).map((e) => e.day);
    const day = days.includes(selectedDay ?? 0) ? selectedDay! : days[0];
    if (day) {
      updateUrl(month, day);
      loadMeditation(month, day, index);
    }
  }

  function handleDayChange(day: number) {
    updateUrl(selectedMonth, day);
    loadMeditation(selectedMonth, day, index);
  }

  function handleToday() {
    const todayKey = getTodayKey();
    if (indexByKey.has(todayKey)) {
      selectByKey(todayKey);
    }
  }

  if (indexLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="h-10 w-48 rounded bg-bg3 animate-pulse" />
        <div className="h-8 rounded bg-bg3 animate-pulse" />
        <div className="h-40 rounded-card bg-bg3 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-accent uppercase tracking-wide">
            The Daily Stoic
          </h1>
          <p className="font-sans text-sm text-muted mt-1">
            Browse meditations on wisdom, perseverance, and the art of living
          </p>
        </div>
        <button
          type="button"
          onClick={handleToday}
          className="shrink-0 rounded-full border border-accent3/50 px-4 py-1.5 font-sans text-xs font-semibold text-accent3 hover:bg-accent3/10 hover:shadow-glow-accent3 transition-all"
        >
          Today
        </button>
      </div>

      <div className="rounded-card border border-border bg-card/50 p-4 sm:p-5 space-y-4">
        <MonthPicker selectedMonth={selectedMonth} onSelectMonth={handleMonthChange} />
        <DayPicker
          month={selectedMonth}
          availableDays={availableDays}
          selectedDay={selectedDay}
          onSelectDay={handleDayChange}
        />
      </div>

      <div className="relative">
        <div
          className="absolute -inset-4 rounded-card bg-gradient-to-b from-accent3/5 via-transparent to-transparent pointer-events-none"
          aria-hidden
        />
        <div
          className={`relative rounded-card border border-border bg-card p-6 sm:p-8 shadow-glow-accent3 transition-opacity duration-300 ${
            fade ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {loading ? (
            <ReadingSkeleton />
          ) : meditation ? (
            <DailyStoicContent meditation={meditation} />
          ) : (
            <p className="font-sans text-sm text-muted">No meditation found for this date.</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={!adjacent.prev}
          onClick={() => adjacent.prev && selectByKey(adjacent.prev)}
          className="rounded-card border border-border px-4 py-2.5 font-sans text-sm font-semibold text-muted hover:border-accent3/50 hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ← Previous
        </button>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted hidden sm:block">
          Use ← → keys
        </p>
        <button
          type="button"
          disabled={!adjacent.next}
          onClick={() => adjacent.next && selectByKey(adjacent.next)}
          className="rounded-card border border-border px-4 py-2.5 font-sans text-sm font-semibold text-muted hover:border-accent3/50 hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
