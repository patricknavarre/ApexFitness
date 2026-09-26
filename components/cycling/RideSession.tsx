'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { isWebBluetoothSupported, connectTrainer } from '@/lib/ble/trainer-client';
import { startMockHeartRate, startMockTrainer } from '@/lib/ble/mock-trainer';
import { connectHeartRateMonitor, type HrConnection } from '@/lib/ble/hr-client';
import type { IndoorBikeSample } from '@/lib/ble/parse-indoor-bike';
import type { TrainerConnection } from '@/lib/ble/trainer-client';
import { PowerSparkline } from '@/components/cycling/PowerSparkline';
import { RideWorld } from '@/components/cycling/RideWorld';
import { RideWorldPanel } from '@/components/cycling/RideWorldPanel';
import {
  RideEventToasts,
  RideMomentOverlay,
  RideXpCelebration,
  type RideHudEvent,
  type RideMoment,
  type RideMomentKind,
} from '@/components/cycling/RideEvents';
import { formatDistance, formatMilesFromMeters } from '@/lib/ride/format';
import {
  defaultMaxHrFromAge,
  hrZone,
  hrZoneLabel,
  intensityFactor,
  loadRidePrefs,
  loadSpeedUnit,
  normalizedPower,
  saveRidePrefs,
  saveSpeedUnit,
  speedInUnit,
  speedUnitLabel,
  toggleSpeedUnit,
  trainingStressScore,
  workKj,
  type HrZone,
  type SpeedUnit,
} from '@/lib/ride/stats';
import { levelFromXp } from '@/lib/ride/xp';
import { buildMilestones } from '@/lib/milestones';
import {
  elevationGainTo,
  getRideCourse,
  gradeAtDistance,
  upcomingSegment,
} from '@/lib/ride/courses';
import {
  getRideWorkout,
  workoutProgressAt,
  type WorkoutProgress,
} from '@/lib/ride/workouts';
import { CoursePicker } from '@/components/cycling/CoursePicker';
import { WorkoutPicker } from '@/components/cycling/WorkoutPicker';
import { CourseClimbHud, WorkoutIntervalHud } from '@/components/cycling/SessionHuds';
import { ElevationProfileOverlay } from '@/components/cycling/ElevationProfileOverlay';

type Phase = 'idle' | 'connected' | 'riding' | 'saving';
type ControlMode = 'free' | 'erg' | 'sim' | 'course' | 'workout';

type LapRecord = {
  index: number;
  elapsedSec: number;
  durationSec: number;
  distanceMeters: number;
  avgPowerWatts?: number;
  avgHeartRateBpm?: number;
};

type RideSummary = {
  id: string;
  durationMinutes: number | null;
  caloriesBurned: number | null;
  avgPowerWatts: number | null;
  maxPowerWatts: number | null;
  normalizedPowerWatts: number | null;
  trainingStressScore: number | null;
  workKj: number | null;
  avgCadenceRpm: number | null;
  maxCadenceRpm: number | null;
  distanceMeters: number | null;
  avgHeartRateBpm: number | null;
  maxHeartRateBpm: number | null;
  lapCount?: number;
};

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Cap saved time series (~1 Hz → max ~1h; longer rides downsample). */
function capTimeSeries<T extends { t: number }>(
  series: T[],
  maxPoints = 3600
): T[] {
  if (series.length <= maxPoints) return series;
  const step = Math.ceil(series.length / maxPoints);
  const out: T[] = [];
  for (let i = 0; i < series.length; i += step) {
    out.push(series[i]!);
  }
  const last = series[series.length - 1]!;
  if (out[out.length - 1]?.t !== last.t) out.push(last);
  return out.slice(0, maxPoints);
}

function leveledDetail(level: ReturnType<typeof levelFromXp>): string {
  return `L${level.level} ${level.title}`;
}

function rideBadgeSnapshot(rides: {
  durationMinutes?: number | null;
  trainingStressScore?: number | null;
  avgHeartRateBpm?: number | null;
  rideUsedErg?: boolean;
}[]) {
  let longestRideMinutes = 0;
  let bestRideTss = 0;
  let ridesWithHr = 0;
  let ridesWithErg = 0;
  for (const r of rides) {
    longestRideMinutes = Math.max(longestRideMinutes, Number(r.durationMinutes) || 0);
    bestRideTss = Math.max(bestRideTss, Number(r.trainingStressScore) || 0);
    if (r.avgHeartRateBpm) ridesWithHr += 1;
    if (r.rideUsedErg) ridesWithErg += 1;
  }
  return buildMilestones({
    loggedDates: new Set(),
    streak: 0,
    daysThisWeek: 0,
    totalWorkouts: 0,
    photoCount: 0,
    totalRides: rides.length,
    longestRideMinutes,
    bestRideTss,
    ridesWithHr,
    ridesWithErg,
  }).filter((m) =>
    ['first-ride', 'rides-5', 'ride-30min', 'ride-tss-50', 'ride-hr', 'ride-erg'].includes(
      m.id
    )
  );
}

export function RideSession() {
  const [bleOk, setBleOk] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [hrDeviceName, setHrDeviceName] = useState<string | null>(null);
  const [rideSource, setRideSource] = useState<'ftms' | 'cps' | 'mock' | null>(null);
  const [canControl, setCanControl] = useState(false);
  const [live, setLive] = useState<IndoorBikeSample>({});
  const [hrBpm, setHrBpm] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [distanceM, setDistanceM] = useState(0);
  const [powerSeries, setPowerSeries] = useState<{ t: number; w: number }[]>([]);
  const [laps, setLaps] = useState<LapRecord[]>([]);
  const [liveStats, setLiveStats] = useState({
    avgPower: 0,
    maxPower: 0,
    np: null as number | null,
    tss: null as number | null,
    work: 0,
    avgCadence: 0,
    maxCadence: 0,
    avgHr: 0,
    maxHr: 0,
  });
  const [ftp, setFtp] = useState(200);
  const [maxHrSetting, setMaxHrSetting] = useState(184);
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>('kmh');
  const [controlMode, setControlMode] = useState<ControlMode>('free');
  const [ergTarget, setErgTarget] = useState(180);
  const [simGrade, setSimGrade] = useState(0);
  const [lastSaved, setLastSaved] = useState<RideSummary | null>(null);
  const [recent, setRecent] = useState<RideSummary[]>([]);
  const [hudEvents, setHudEvents] = useState<RideHudEvent[]>([]);
  const [rideMoment, setRideMoment] = useState<RideMoment | null>(null);
  const [surge, setSurge] = useState(false);
  const [bestPowerEver, setBestPowerEver] = useState(0);
  const [totalRideXp, setTotalRideXp] = useState(0);
  const [rideCount, setRideCount] = useState(0);
  const [celebration, setCelebration] = useState<{
    xpGained: number;
    levelBefore: ReturnType<typeof levelFromXp>;
    levelAfter: ReturnType<typeof levelFromXp>;
    newBadges: string[];
  } | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [courseGrade, setCourseGrade] = useState(0);
  const [elevationGainM, setElevationGainM] = useState(0);
  const [workoutHud, setWorkoutHud] = useState<WorkoutProgress | null>(null);
  const [courseFinished, setCourseFinished] = useState(false);
  const [workoutFinished, setWorkoutFinished] = useState(false);
  const [trainerGradeLive, setTrainerGradeLive] = useState(false);
  const [paused, setPaused] = useState(false);

  const ridesCacheRef = useRef<
    {
      durationMinutes?: number | null;
      trainingStressScore?: number | null;
      avgHeartRateBpm?: number | null;
      rideUsedErg?: boolean;
      maxPowerWatts?: number | null;
      rideXp?: number | null;
    }[]
  >([]);

  const connectionRef = useRef<TrainerConnection | null>(null);
  const hrConnectionRef = useRef<HrConnection | { disconnect: () => void } | null>(null);
  const usedErgRef = useRef(false);
  const lastZoneRef = useRef<HrZone | null>(null);
  const prAnnouncedRef = useRef(false);
  const surgeUntilRef = useRef(0);
  const bestPowerEverRef = useRef(0);
  /** Global cooldown between large moment overlays (ms timestamp). */
  const momentCooldownUntilRef = useRef(0);
  const momentKindCooldownRef = useRef<Partial<Record<RideMomentKind, number>>>({});
  const lastClimbBucketRef = useRef<string | null>(null);
  const lastMilestoneMinRef = useRef(0);
  const highPowerSinceRef = useRef<number | null>(null);
  const powerSumRef = useRef(0);
  const powerCountRef = useRef(0);
  const maxPowerRef = useRef(0);
  const cadenceSumRef = useRef(0);
  const cadenceCountRef = useRef(0);
  const maxCadenceRef = useRef(0);
  const hrSumRef = useRef(0);
  const hrCountRef = useRef(0);
  const maxHrRef = useRef(0);
  const energyRef = useRef<number | null>(null);
  const distanceRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);
  const rideStartRef = useRef<number | null>(null);
  /** Monotonic ride clock — ignores laptop sleep / tab freeze wall-clock jumps. */
  const rideElapsedMsRef = useRef(0);
  const lastPerfTickRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const powerSamplesRef = useRef<number[]>([]);
  const lastPowerChartSecRef = useRef(-1);
  const lapStartSecRef = useRef(0);
  const lapPowerSumRef = useRef(0);
  const lapPowerCountRef = useRef(0);
  const lapHrSumRef = useRef(0);
  const lapHrCountRef = useRef(0);
  const lapStartDistRef = useRef(0);
  const ridingRef = useRef(false);
  const pausedRef = useRef(false);
  /** Wall-clock pause total (ms) for detail page display. */
  const pausedAccumMsRef = useRef(0);
  const pauseStartedAtRef = useRef<number | null>(null);
  /** Full 1 Hz series for save (sparkline state is windowed). */
  const powerSeriesFullRef = useRef<{ t: number; w: number }[]>([]);
  const hrSeriesFullRef = useRef<{ t: number; bpm: number }[]>([]);
  const lastHrChartSecRef = useRef(-1);
  const ftpRef = useRef(200);
  const maxHrSettingRef = useRef(184);
  const lastSentGradeRef = useRef<number | null>(null);
  const lastWorkoutSegRef = useRef(-1);
  const courseFinishedRef = useRef(false);
  const workoutFinishedRef = useRef(false);
  const courseIdRef = useRef<string | null>(null);
  const workoutIdRef = useRef<string | null>(null);
  const canControlRef = useRef(false);
  const simGradeRef = useRef(0);
  const syncSessionRef = useRef<(elapsed: number, distance: number) => void>(
    () => undefined
  );

  useEffect(() => {
    courseIdRef.current = courseId;
  }, [courseId]);
  useEffect(() => {
    workoutIdRef.current = workoutId;
  }, [workoutId]);
  useEffect(() => {
    canControlRef.current = canControl;
  }, [canControl]);
  useEffect(() => {
    simGradeRef.current = simGrade;
  }, [simGrade]);

  useEffect(() => {
    setBleOk(isWebBluetoothSupported());
    const prefs = loadRidePrefs();
    setFtp(prefs.ftp);
    setMaxHrSetting(prefs.maxHr);
    setSpeedUnit(loadSpeedUnit());
    ftpRef.current = prefs.ftp;
    maxHrSettingRef.current = prefs.maxHr;
    void loadRecent();
    void fetch('/api/user/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        if (!u) return;
        if (!window.localStorage.getItem('apex.ride.maxHr') && u.age) {
          const mh = defaultMaxHrFromAge(u.age);
          setMaxHrSetting(mh);
          maxHrSettingRef.current = mh;
        }
      })
      .catch(() => undefined);

    return () => {
      stopTimer();
      connectionRef.current?.disconnect();
      connectionRef.current = null;
      hrConnectionRef.current?.disconnect();
      hrConnectionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    ftpRef.current = ftp;
    maxHrSettingRef.current = maxHrSetting;
  }, [ftp, maxHrSetting]);

  async function loadRecent() {
    try {
      const res = await fetch('/api/workout/ride?limit=50');
      if (!res.ok) return;
      const data = await res.json();
      const rides = (data.rides ?? []) as (RideSummary & {
        maxPowerWatts?: number | null;
        rideXp?: number | null;
        trainingStressScore?: number | null;
        avgHeartRateBpm?: number | null;
        rideUsedErg?: boolean;
      })[];
      ridesCacheRef.current = rides;
      setRecent(rides.slice(0, 5));
      setRideCount(rides.length);
      let xp = 0;
      let best = 0;
      for (const r of rides) {
        xp += Number(r.rideXp) || 0;
        best = Math.max(best, Number(r.maxPowerWatts) || 0);
      }
      setTotalRideXp(xp);
      setBestPowerEver(best);
      bestPowerEverRef.current = best;
    } catch {
      /* ignore */
    }
  }

  function pushEvent(ev: Omit<RideHudEvent, 'id'>) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setHudEvents((prev) => [...prev, { ...ev, id }].slice(-5));
  }

  function dismissEvent(id: string) {
    setHudEvents((prev) => prev.filter((e) => e.id !== id));
  }

  function dismissMoment(id: string) {
    setRideMoment((prev) => (prev?.id === id ? null : prev));
  }

  /** Major motivational overlay; respects global + per-kind cooldowns. */
  function pushMoment(
    kind: RideMomentKind,
    title: string,
    detail?: string,
    opts?: { force?: boolean; kindCooldownMs?: number }
  ): boolean {
    const now = Date.now();
    const kindCd = opts?.kindCooldownMs ?? 75_000;
    if (!opts?.force) {
      if (now < momentCooldownUntilRef.current) return false;
      const kindUntil = momentKindCooldownRef.current[kind] ?? 0;
      if (now < kindUntil) return false;
    }
    const id = `m-${now}-${Math.random().toString(36).slice(2, 6)}`;
    setRideMoment({ id, kind, title, detail });
    momentCooldownUntilRef.current = now + 55_000;
    momentKindCooldownRef.current[kind] = now + kindCd;
    return true;
  }

  function maybeAnnounceClimb(grade: number) {
    if (!ridingRef.current) return;
    if (grade < 5) {
      if (grade < 2) lastClimbBucketRef.current = null;
      return;
    }
    const bucket = grade >= 7 ? 'steep' : 'climb';
    if (lastClimbBucketRef.current === bucket) return;
    lastClimbBucketRef.current = bucket;
    pushMoment(
      'climb',
      bucket === 'steep' ? 'Steep climb' : 'Climb ahead',
      bucket === 'steep'
        ? `${grade.toFixed(1)}% — settle in and hold the effort`
        : `${grade.toFixed(1)}% — stay smooth, keep turning`
    );
  }

  function maybeAnnounceMilestone(elapsedSec: number) {
    if (!ridingRef.current || elapsedSec < 60) return;
    const mins = Math.floor(elapsedSec / 60);
    const targets = [15, 30, 45, 60];
    let hit: number | null = null;
    for (const t of targets) {
      if (mins >= t && lastMilestoneMinRef.current < t) {
        hit = t;
        break;
      }
    }
    if (hit == null && mins > 60 && mins % 30 === 0 && lastMilestoneMinRef.current < mins) {
      hit = mins;
    }
    if (hit == null) return;
    lastMilestoneMinRef.current = hit;
    pushMoment(
      'milestone',
      hit >= 60 ? `${hit} minutes` : `${hit} min in`,
      hit >= 60 ? 'Long ride energy — keep rolling' : 'Keep rolling. You’ve got this.'
    );
  }

  async function sendCourseGrade(grade: number, opts?: { force?: boolean }) {
    const conn = connectionRef.current;
    setCourseGrade(grade);
    setSimGrade(grade);
    simGradeRef.current = grade;
    if (!conn?.canControl) {
      setTrainerGradeLive(false);
      return;
    }
    const prev = lastSentGradeRef.current;
    if (!opts?.force && prev != null && Math.abs(prev - grade) < 0.15) return;
    try {
      await conn.setSimulationGrade(grade);
      lastSentGradeRef.current = grade;
      setControlMode('course');
      setTrainerGradeLive(true);
    } catch (e) {
      setTrainerGradeLive(false);
      toast.error(e instanceof Error ? e.message : 'Grade update failed');
    }
  }

  async function sendWorkoutErg(watts: number, segIndex: number, segName: string) {
    const conn = connectionRef.current;
    usedErgRef.current = true;
    setErgTarget(watts);
    if (lastWorkoutSegRef.current !== segIndex) {
      lastWorkoutSegRef.current = segIndex;
      pushEvent({
        kind: 'surge',
        title: segName,
        detail: `${watts} W`,
      });
    }
    if (!conn?.canControl) return;
    try {
      await conn.setTargetPower(watts);
      setControlMode('workout');
    } catch (e) {
      if (lastWorkoutSegRef.current === segIndex) {
        toast.error(e instanceof Error ? e.message : 'ERG update failed');
      }
    }
  }

  async function pushLiveSimGrade(grade: number) {
    setSimGrade(grade);
    if (!ridingRef.current) return;
    if (workoutIdRef.current) return; // ERG owns the trainer during workouts
    const conn = connectionRef.current;
    if (!conn?.canControl) return;
    const prev = lastSentGradeRef.current;
    if (prev != null && Math.abs(prev - grade) < 0.2) return;
    try {
      await conn.setSimulationGrade(grade);
      lastSentGradeRef.current = grade;
      setCourseGrade(grade);
      setControlMode(courseIdRef.current ? 'course' : 'sim');
      setTrainerGradeLive(true);
      pushEvent({
        kind: 'surge',
        title: `${grade >= 0 ? '+' : ''}${grade.toFixed(1)}%`,
        detail: 'Grade sent to trainer',
      });
    } catch (e) {
      setTrainerGradeLive(false);
      toast.error(e instanceof Error ? e.message : 'Could not set grade');
    }
  }

  const simSendTimerRef = useRef<number | null>(null);

  function onSimSliderChange(value: number) {
    setSimGrade(value);
    if (!ridingRef.current && controlMode !== 'sim' && controlMode !== 'course') {
      return;
    }
    if (simSendTimerRef.current != null) {
      window.clearTimeout(simSendTimerRef.current);
    }
    simSendTimerRef.current = window.setTimeout(() => {
      void pushLiveSimGrade(value);
    }, 180);
  }

  function syncSessionFromElapsed(elapsed: number, distance: number) {
    if (!ridingRef.current) return;

    const wId = workoutIdRef.current;
    const cId = courseIdRef.current;
    const workout = getRideWorkout(wId);

    if (workout) {
      const progress = workoutProgressAt(workout, elapsed, ftpRef.current);
      setWorkoutHud(progress);
      void sendWorkoutErg(
        progress.targetWatts,
        progress.segmentIndex,
        progress.segment.name
      );
      maybeAnnounceMilestone(elapsed);
      if (progress.done && !workoutFinishedRef.current) {
        workoutFinishedRef.current = true;
        setWorkoutFinished(true);
        pushEvent({
          kind: 'badge',
          title: 'Workout complete!',
          detail: workout.name,
        });
      }
      return;
    }

    const course = getRideCourse(cId);
    if (!course) {
      maybeAnnounceClimb(simGradeRef.current);
      maybeAnnounceMilestone(elapsed);
      return;
    }

    const grade = gradeAtDistance(course, distance);
    const elev = elevationGainTo(course, distance);
    setElevationGainM(elev);
    void sendCourseGrade(grade);
    maybeAnnounceClimb(grade);
    maybeAnnounceMilestone(elapsed);

    if (distance >= course.lengthMeters && !courseFinishedRef.current) {
      courseFinishedRef.current = true;
      setCourseFinished(true);
      pushEvent({
        kind: 'badge',
        title: 'Course complete!',
        detail: course.name,
      });
    }
  }
  syncSessionRef.current = syncSessionFromElapsed;

  function readRideElapsedSec(): number {
    if (pausedRef.current) {
      return Math.floor(rideElapsedMsRef.current / 1000);
    }
    const now = performance.now();
    if (lastPerfTickRef.current != null) {
      const dt = now - lastPerfTickRef.current;
      // Skip gaps from sleep / background freeze (would otherwise inflate duration).
      if (dt > 0 && dt < 2000) {
        rideElapsedMsRef.current += dt;
      }
    }
    lastPerfTickRef.current = now;
    return Math.floor(rideElapsedMsRef.current / 1000);
  }

  function stopTimer() {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function recomputeLiveStats(elapsed: number) {
    const avgPower =
      powerCountRef.current > 0 ? powerSumRef.current / powerCountRef.current : 0;
    const np = normalizedPower(powerSamplesRef.current);
    const tss =
      np != null
        ? trainingStressScore(elapsed, np, ftpRef.current)
        : null;
    setLiveStats({
      avgPower,
      maxPower: maxPowerRef.current,
      np,
      tss,
      work: workKj(avgPower, elapsed),
      avgCadence:
        cadenceCountRef.current > 0
          ? cadenceSumRef.current / cadenceCountRef.current
          : 0,
      maxCadence: maxCadenceRef.current,
      avgHr: hrCountRef.current > 0 ? hrSumRef.current / hrCountRef.current : 0,
      maxHr: maxHrRef.current,
    });
  }

  function resetAccumulators() {
    powerSumRef.current = 0;
    powerCountRef.current = 0;
    maxPowerRef.current = 0;
    cadenceSumRef.current = 0;
    cadenceCountRef.current = 0;
    maxCadenceRef.current = 0;
    hrSumRef.current = 0;
    hrCountRef.current = 0;
    maxHrRef.current = 0;
    energyRef.current = null;
    distanceRef.current = 0;
    lastTickRef.current = null;
    rideStartRef.current = null;
    rideElapsedMsRef.current = 0;
    lastPerfTickRef.current = null;
    powerSamplesRef.current = [];
    lastPowerChartSecRef.current = -1;
    lapStartSecRef.current = 0;
    lapPowerSumRef.current = 0;
    lapPowerCountRef.current = 0;
    lapHrSumRef.current = 0;
    lapHrCountRef.current = 0;
    lapStartDistRef.current = 0;
    ridingRef.current = false;
    pausedRef.current = false;
    pausedAccumMsRef.current = 0;
    pauseStartedAtRef.current = null;
    powerSeriesFullRef.current = [];
    hrSeriesFullRef.current = [];
    lastHrChartSecRef.current = -1;
    setPaused(false);
    setElapsedSec(0);
    setDistanceM(0);
    setPowerSeries([]);
    setLaps([]);
    setSurge(false);
    setRideMoment(null);
    prAnnouncedRef.current = false;
    lastZoneRef.current = null;
    usedErgRef.current = false;
    lastSentGradeRef.current = null;
    lastWorkoutSegRef.current = -1;
    courseFinishedRef.current = false;
    workoutFinishedRef.current = false;
    momentCooldownUntilRef.current = 0;
    momentKindCooldownRef.current = {};
    lastClimbBucketRef.current = null;
    lastMilestoneMinRef.current = 0;
    highPowerSinceRef.current = null;
    setCourseFinished(false);
    setWorkoutFinished(false);
    setTrainerGradeLive(false);
    setCourseGrade(0);
    setElevationGainM(0);
    setWorkoutHud(null);
    setLiveStats({
      avgPower: 0,
      maxPower: 0,
      np: null,
      tss: null,
      work: 0,
      avgCadence: 0,
      maxCadence: 0,
      avgHr: 0,
      maxHr: 0,
    });
  }

  const onHr = useCallback((bpm: number) => {
    setHrBpm(bpm);
    setLive((prev) => ({ ...prev, heartRateBpm: bpm }));
    if (!ridingRef.current || pausedRef.current) return;
    hrSumRef.current += bpm;
    hrCountRef.current += 1;
    if (bpm > maxHrRef.current) maxHrRef.current = bpm;
    lapHrSumRef.current += bpm;
    lapHrCountRef.current += 1;

    if (bpm > 0) {
      const elapsed = readRideElapsedSec();
      if (elapsed !== lastHrChartSecRef.current) {
        lastHrChartSecRef.current = elapsed;
        hrSeriesFullRef.current.push({ t: elapsed, bpm: Math.round(bpm) });
      }
    }

    const z = hrZone(bpm, maxHrSettingRef.current);
    if (lastZoneRef.current != null && z > lastZoneRef.current) {
      if (z >= 4) {
        pushMoment(
          'push',
          z >= 5 ? 'Red zone' : 'Threshold zone',
          z >= 5
            ? `${Math.round(bpm)} bpm — short and sharp, stay focused`
            : `${Math.round(bpm)} bpm — this is the work`
        );
      } else {
        pushEvent({
          kind: 'zone',
          title: hrZoneLabel(z),
          detail: `${Math.round(bpm)} bpm`,
        });
      }
    }
    lastZoneRef.current = z;
  }, []);

  const onMetrics = useCallback((sample: IndoorBikeSample) => {
    setLive((prev) => ({ ...prev, ...sample }));

    if (!ridingRef.current || pausedRef.current) return;

    const elapsed = ridingRef.current ? readRideElapsedSec() : 0;

    if (typeof sample.powerWatts === 'number' && sample.powerWatts >= 0) {
      powerSumRef.current += sample.powerWatts;
      powerCountRef.current += 1;
      if (sample.powerWatts > maxPowerRef.current) {
        maxPowerRef.current = sample.powerWatts;
      }
      if (
        sample.powerWatts > bestPowerEverRef.current &&
        sample.powerWatts > 50 &&
        !prAnnouncedRef.current
      ) {
        prAnnouncedRef.current = true;
        bestPowerEverRef.current = sample.powerWatts;
        setBestPowerEver(sample.powerWatts);
        pushMoment(
          'pr',
          'New power PR!',
          `${Math.round(sample.powerWatts)} W — that’s a new peak`,
          { force: true }
        );
      }
      const ftpNow = ftpRef.current;
      if (ftpNow > 0 && sample.powerWatts >= ftpNow * 1.05) {
        const nowMs = Date.now();
        if (sample.powerWatts >= ftpNow * 1.2) {
          if (highPowerSinceRef.current == null) {
            highPowerSinceRef.current = nowMs;
          } else if (nowMs - highPowerSinceRef.current >= 2500) {
            if (nowMs > surgeUntilRef.current) {
              surgeUntilRef.current = nowMs + 1800;
              setSurge(true);
              window.setTimeout(() => setSurge(false), 700);
              pushMoment(
                'sprint',
                'Sprint!',
                `${Math.round(sample.powerWatts)} W — dig in`
              );
              highPowerSinceRef.current = null;
            }
          }
        } else {
          highPowerSinceRef.current = null;
          if (nowMs > surgeUntilRef.current) {
            surgeUntilRef.current = nowMs + 1800;
            setSurge(true);
            window.setTimeout(() => setSurge(false), 700);
            pushEvent({ kind: 'surge', title: 'Power surge', detail: 'Above FTP' });
          }
        }
      } else {
        highPowerSinceRef.current = null;
      }
      powerSamplesRef.current.push(sample.powerWatts);
      if (powerSamplesRef.current.length > 7200) {
        powerSamplesRef.current = powerSamplesRef.current.slice(-7200);
      }
      lapPowerSumRef.current += sample.powerWatts;
      lapPowerCountRef.current += 1;
      if (elapsed !== lastPowerChartSecRef.current) {
        lastPowerChartSecRef.current = elapsed;
        const point = { t: elapsed, w: sample.powerWatts! };
        powerSeriesFullRef.current.push(point);
        setPowerSeries((prev) => {
          const next = [...prev, point];
          return next.length > 240 ? next.slice(-240) : next;
        });
      }
    }
    if (typeof sample.cadenceRpm === 'number' && sample.cadenceRpm >= 0) {
      cadenceSumRef.current += sample.cadenceRpm;
      cadenceCountRef.current += 1;
      if (sample.cadenceRpm > maxCadenceRef.current) {
        maxCadenceRef.current = sample.cadenceRpm;
      }
    }
    if (typeof sample.heartRateBpm === 'number' && sample.heartRateBpm > 0) {
      onHr(sample.heartRateBpm);
    }
    if (typeof sample.energyKcal === 'number') {
      energyRef.current = sample.energyKcal;
    }

    const now = performance.now();
    if (typeof sample.distanceMeters === 'number' && sample.distanceMeters >= 0) {
      distanceRef.current = sample.distanceMeters;
      setDistanceM(sample.distanceMeters);
    } else if (typeof sample.speedKmh === 'number' && sample.speedKmh >= 0) {
      const speedMs = sample.speedKmh / 3.6;
      if (lastTickRef.current != null) {
        const dt = (now - lastTickRef.current) / 1000;
        if (dt > 0 && dt < 5) {
          distanceRef.current += speedMs * dt;
          setDistanceM(distanceRef.current);
        }
      }
    }
    lastTickRef.current = now;
    recomputeLiveStats(elapsed);
    syncSessionRef.current(elapsed, distanceRef.current);
  }, [onHr]);

  async function attachTrainer(conn: TrainerConnection) {
    connectionRef.current?.disconnect();
    connectionRef.current = conn;
    setDeviceName(conn.deviceName);
    setRideSource(conn.source);
    setCanControl(conn.canControl);
    setPhase('connected');
    setControlMode('free');
    resetAccumulators();
    toast.success(`Trainer: ${conn.deviceName}`);
  }

  async function handleConnectTrainer() {
    try {
      const conn = await connectTrainer(onMetrics, () => {
        toast.error('Trainer disconnected');
        stopTimer();
        ridingRef.current = false;
        setPhase('idle');
        setDeviceName(null);
        setCanControl(false);
        connectionRef.current = null;
      });
      await attachTrainer(conn);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not connect';
      if (!/cancel|chooser/i.test(msg)) toast.error(msg);
    }
  }

  function handleMockTrainer() {
    void attachTrainer(startMockTrainer(onMetrics));
  }

  async function handleConnectHr() {
    try {
      hrConnectionRef.current?.disconnect();
      const conn = await connectHeartRateMonitor(onHr, () => {
        toast.error('Heart rate disconnected');
        setHrDeviceName(null);
        hrConnectionRef.current = null;
      });
      hrConnectionRef.current = conn;
      setHrDeviceName(conn.deviceName);
      toast.success(`HR: ${conn.deviceName}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not connect HR';
      if (!/cancel|chooser/i.test(msg)) toast.error(msg);
    }
  }

  function handleMockHr() {
    hrConnectionRef.current?.disconnect();
    const conn = startMockHeartRate(onHr);
    hrConnectionRef.current = conn;
    setHrDeviceName(conn.deviceName);
    toast.success('Mock HR connected');
  }

  function handleDisconnectHr() {
    hrConnectionRef.current?.disconnect();
    hrConnectionRef.current = null;
    setHrDeviceName(null);
    setHrBpm(null);
  }

  function handleStartRide() {
    if (!connectionRef.current) return;
    resetAccumulators();
    rideStartRef.current = Date.now();
    rideElapsedMsRef.current = 0;
    lastPerfTickRef.current = performance.now();
    ridingRef.current = true;
    pausedRef.current = false;
    setPaused(false);
    setPhase('riding');
    if (workoutId) {
      setControlMode('workout');
      setCourseId(null);
      courseIdRef.current = null;
    } else if (courseId) {
      setControlMode('course');
    } else {
      setControlMode('free');
    }
    stopTimer();
    timerRef.current = window.setInterval(() => {
      if (!ridingRef.current || pausedRef.current) return;
      const e = readRideElapsedSec();
      setElapsedSec(e);
      recomputeLiveStats(e);
      syncSessionRef.current(e, distanceRef.current);
    }, 250);
    // Kick first target immediately + claim FTMS control early
    syncSessionRef.current(0, 0);
    if (connectionRef.current?.canControl) {
      void (async () => {
        try {
          await connectionRef.current?.ensureReady();
          const cId = courseIdRef.current;
          const course = getRideCourse(cId);
          if (course) {
            const grade = gradeAtDistance(course, distanceRef.current);
            lastSentGradeRef.current = null;
            await sendCourseGrade(grade, { force: true });
          }
        } catch {
          /* trainer may still accept later grade writes */
        }
      })();
    }
  }

  function handlePause() {
    if (phase !== 'riding' || pausedRef.current) return;
    // Flush any pending moving-time tick, then freeze.
    readRideElapsedSec();
    lastPerfTickRef.current = null;
    lastTickRef.current = null;
    pausedRef.current = true;
    pauseStartedAtRef.current = performance.now();
    setPaused(true);
    if (connectionRef.current?.canControl) {
      void connectionRef.current.resetControl().catch(() => undefined);
    }
    toast.message('Paused · moving time frozen');
  }

  async function handleResume() {
    if (phase !== 'riding' || !pausedRef.current) return;
    if (pauseStartedAtRef.current != null) {
      pausedAccumMsRef.current += performance.now() - pauseStartedAtRef.current;
      pauseStartedAtRef.current = null;
    }
    pausedRef.current = false;
    setPaused(false);
    lastPerfTickRef.current = performance.now();
    lastTickRef.current = null;
    if (connectionRef.current?.canControl) {
      try {
        await connectionRef.current.ensureReady();
        syncSessionRef.current(readRideElapsedSec(), distanceRef.current);
      } catch {
        /* re-apply on next metrics tick */
      }
    }
  }

  function handleLap() {
    if (phase !== 'riding' || !ridingRef.current || pausedRef.current) return;
    const elapsed = readRideElapsedSec();
    const durationSec = Math.max(1, elapsed - lapStartSecRef.current);
    const dist = Math.max(0, distanceRef.current - lapStartDistRef.current);
    const lap: LapRecord = {
      index: laps.length + 1,
      elapsedSec: elapsed,
      durationSec,
      distanceMeters: dist,
      avgPowerWatts:
        lapPowerCountRef.current > 0
          ? Math.round(lapPowerSumRef.current / lapPowerCountRef.current)
          : undefined,
      avgHeartRateBpm:
        lapHrCountRef.current > 0
          ? Math.round(lapHrSumRef.current / lapHrCountRef.current)
          : undefined,
    };
    setLaps((prev) => [...prev, lap]);
    lapStartSecRef.current = elapsed;
    lapStartDistRef.current = distanceRef.current;
    lapPowerSumRef.current = 0;
    lapPowerCountRef.current = 0;
    lapHrSumRef.current = 0;
    lapHrCountRef.current = 0;
    toast.message(`Lap ${lap.index} · ${formatDuration(durationSec)}`);
    pushEvent({
      kind: 'lap',
      title: `Lap ${lap.index}`,
      detail: formatDuration(durationSec),
    });
  }

  async function handleEndRide() {
    // If ending while paused, fold open pause into total.
    if (pausedRef.current && pauseStartedAtRef.current != null) {
      pausedAccumMsRef.current += performance.now() - pauseStartedAtRef.current;
      pauseStartedAtRef.current = null;
    }
    pausedRef.current = false;
    setPaused(false);
    stopTimer();
    ridingRef.current = false;
    const durationSeconds = Math.max(0, readRideElapsedSec() || elapsedSec);
    const pausedSeconds = Math.max(0, Math.round(pausedAccumMsRef.current / 1000));

    if (durationSeconds < 15) {
      toast.error('Ride a bit longer (15s+) before saving');
      setPhase('connected');
      return;
    }

    // Close open lap into records for save
    const finalLaps = [...laps];
    if (durationSeconds > lapStartSecRef.current) {
      finalLaps.push({
        index: finalLaps.length + 1,
        elapsedSec: durationSeconds,
        durationSec: durationSeconds - lapStartSecRef.current,
        distanceMeters: Math.max(0, distanceRef.current - lapStartDistRef.current),
        avgPowerWatts:
          lapPowerCountRef.current > 0
            ? Math.round(lapPowerSumRef.current / lapPowerCountRef.current)
            : undefined,
        avgHeartRateBpm:
          lapHrCountRef.current > 0
            ? Math.round(lapHrSumRef.current / lapHrCountRef.current)
            : undefined,
      });
    }

    setPhase('saving');
    const avgPower =
      powerCountRef.current > 0
        ? powerSumRef.current / powerCountRef.current
        : undefined;
    const avgCadence =
      cadenceCountRef.current > 0
        ? cadenceSumRef.current / cadenceCountRef.current
        : undefined;
    const avgHr =
      hrCountRef.current > 0 ? hrSumRef.current / hrCountRef.current : undefined;
    const np = normalizedPower(powerSamplesRef.current);
    const iff = np != null ? intensityFactor(np, ftpRef.current) : null;
    const tss =
      np != null
        ? trainingStressScore(durationSeconds, np, ftpRef.current)
        : null;
    const powerSeriesPayload = capTimeSeries(powerSeriesFullRef.current);
    const hrSeriesPayload = capTimeSeries(hrSeriesFullRef.current);

    try {
      if (connectionRef.current?.canControl) {
        try {
          await connectionRef.current.resetControl();
        } catch {
          /* ignore */
        }
      }
      const res = await fetch('/api/workout/ride', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationSeconds,
          pausedSeconds: pausedSeconds > 0 ? pausedSeconds : undefined,
          powerSeries: powerSeriesPayload.length > 0 ? powerSeriesPayload : undefined,
          hrSeries: hrSeriesPayload.length > 0 ? hrSeriesPayload : undefined,
          avgPowerWatts: avgPower,
          maxPowerWatts: maxPowerRef.current || undefined,
          normalizedPowerWatts: np ?? undefined,
          intensityFactor: iff ?? undefined,
          trainingStressScore: tss ?? undefined,
          workKj: avgPower != null ? workKj(avgPower, durationSeconds) : undefined,
          avgCadenceRpm: avgCadence,
          maxCadenceRpm: maxCadenceRef.current || undefined,
          distanceMeters: distanceRef.current || undefined,
          energyKcal: energyRef.current ?? undefined,
          avgHeartRateBpm: avgHr,
          maxHeartRateBpm: maxHrRef.current || undefined,
          deviceName: deviceName ?? undefined,
          hrDeviceName: hrDeviceName ?? undefined,
          rideSource: rideSource ?? 'ftms',
          ftpUsed: ftpRef.current,
          maxHrUsed: maxHrSettingRef.current,
          laps: finalLaps,
          rideUsedErg: usedErgRef.current || Boolean(workoutId),
          courseId: courseId ?? undefined,
          courseCompleted: courseFinishedRef.current,
          elevationGainMeters:
            courseId && getRideCourse(courseId)
              ? Math.round(elevationGainTo(getRideCourse(courseId)!, distanceRef.current))
              : undefined,
          workoutId: workoutId ?? undefined,
          workoutCompleted: workoutFinishedRef.current,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save');
      }
      const data = await res.json();
      setLastSaved(data);

      const xpGained = Number(data.rideXp) || 0;
      const totalAfter = Number(data.totalRideXp) || totalRideXp + xpGained;
      const levelBefore = levelFromXp(Math.max(0, totalAfter - xpGained));
      const levelAfter = levelFromXp(totalAfter);

      const beforeBadges = rideBadgeSnapshot(ridesCacheRef.current);
      await loadRecent();
      const afterBadges = rideBadgeSnapshot(ridesCacheRef.current);
      const newly = afterBadges
        .filter((m) => m.earned && !beforeBadges.find((b) => b.id === m.id)?.earned)
        .map((m) => m.label);

      setCelebration({
        xpGained,
        levelBefore,
        levelAfter,
        newBadges: newly,
      });
      pushEvent({
        kind: 'xp',
        title: `+${xpGained} XP`,
        detail: leveledDetail(levelAfter),
      });
      toast.success('Ride saved');
      setPhase('connected');
      setControlMode('free');
      resetAccumulators();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save ride');
      setPhase('riding');
      ridingRef.current = true;
      rideElapsedMsRef.current = durationSeconds * 1000;
      lastPerfTickRef.current = performance.now();
      timerRef.current = window.setInterval(() => {
        if (!ridingRef.current) return;
        const e2 = readRideElapsedSec();
        setElapsedSec(e2);
        recomputeLiveStats(e2);
        syncSessionFromElapsed(e2, distanceRef.current);
      }, 250);
    }
  }

  function handleDisconnectTrainer() {
    stopTimer();
    ridingRef.current = false;
    connectionRef.current?.disconnect();
    connectionRef.current = null;
    setDeviceName(null);
    setRideSource(null);
    setCanControl(false);
    setPhase('idle');
    setControlMode('free');
    resetAccumulators();
  }

  async function handleDeleteRide(id: string) {
    if (!window.confirm('Delete this ride? It will be removed from your stats.')) return;
    try {
      const res = await fetch(`/api/workout/ride?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Delete failed');
      }
      toast.success('Ride deleted');
      await loadRecent();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete ride');
    }
  }


  async function applyErg() {
    const conn = connectionRef.current;
    if (!conn?.canControl) {
      toast.error('Trainer has no resistance control');
      return;
    }
    try {
      await conn.setTargetPower(ergTarget);
      setControlMode('erg');
      usedErgRef.current = true;
      toast.success(`ERG ${ergTarget} W`);
      if (ridingRef.current) {
        pushEvent({ kind: 'surge', title: 'ERG locked', detail: `${ergTarget} W` });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ERG failed');
    }
  }

  async function applySim() {
    const conn = connectionRef.current;
    if (!conn?.canControl) {
      toast.error('Trainer has no resistance control');
      return;
    }
    try {
      await conn.setSimulationGrade(simGrade);
      lastSentGradeRef.current = simGrade;
      setCourseGrade(simGrade);
      setControlMode('sim');
      toast.success(`Grade ${simGrade.toFixed(1)}% sent`);
      pushEvent({
        kind: 'surge',
        title: `${simGrade >= 0 ? '+' : ''}${simGrade.toFixed(1)}%`,
        detail: 'Trainer SIM mode',
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'SIM failed — is FTMS control supported?');
    }
  }

  async function applyFree() {
    const conn = connectionRef.current;
    if (!conn?.canControl) return;
    try {
      await conn.resetControl();
      setControlMode('free');
      toast.message('Free ride');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Reset failed');
    }
  }

  function persistPrefs() {
    saveRidePrefs(ftp, maxHrSetting);
    toast.success('FTP / max HR saved on this device');
  }

  function handleToggleSpeedUnit() {
    setSpeedUnit((prev) => {
      const next = toggleSpeedUnit(prev);
      saveSpeedUnit(next);
      return next;
    });
  }

  const power = live.powerWatts ?? 0;
  const cadence = live.cadenceRpm ?? 0;
  const speed = live.speedKmh ?? 0;
  const displayHr = hrBpm ?? live.heartRateBpm ?? null;
  const zone: HrZone | null =
    displayHr != null ? hrZone(displayHr, maxHrSetting) : null;
  const rideLevel = levelFromXp(totalRideXp);

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-3xl text-accent uppercase tracking-wide">
          Virtual ride
        </h1>
        <p className="font-sans text-sm text-muted mt-1">
          Trainer + Amazfit/HR strap, live zones, ERG/SIM, laps — earn XP and badges as you ride.
        </p>
      </div>

      <section className="rounded-card border border-accent/35 bg-card p-4 md:p-5 shadow-glow relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'linear-gradient(115deg, color-mix(in srgb, var(--accent) 18%, transparent) 0%, transparent 55%)',
          }}
          aria-hidden
        />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Rider progress
            </p>
            <h2 className="font-display text-2xl md:text-3xl text-accent uppercase tracking-wide mt-1 leading-none">
              L{rideLevel.level} {rideLevel.title}
            </h2>
            <p className="font-sans text-sm text-tan mt-2">
              {totalRideXp} XP earned
              {rideLevel.level < 11
                ? ` · ${Math.max(0, rideLevel.xpForNext - rideLevel.xpIntoLevel)} XP to next level`
                : ' · Max title unlocked'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-card border border-border bg-bg2/80 px-3 py-2 text-center min-w-[4.5rem]">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted">Rides</p>
              <p className="font-display text-xl text-tan leading-none mt-0.5">{rideCount}</p>
            </div>
            {bestPowerEver > 0 ? (
              <div className="rounded-card border border-border bg-bg2/80 px-3 py-2 text-center min-w-[4.5rem]">
                <p className="font-mono text-[9px] uppercase tracking-widest text-muted">Power PR</p>
                <p className="font-display text-xl text-accent leading-none mt-0.5">
                  {bestPowerEver}
                  <span className="font-mono text-[10px] text-muted ml-0.5">W</span>
                </p>
              </div>
            ) : null}
          </div>
        </div>
        <div className="relative mt-4">
          <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest text-muted mb-1.5">
            <span>
              {rideLevel.xpIntoLevel} / {rideLevel.xpForNext} XP
            </span>
            <span>{Math.round(rideLevel.progressPct)}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-bg3 overflow-hidden border border-border/60">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(2, rideLevel.progressPct))}%` }}
            />
          </div>
        </div>
      </section>

      {!bleOk && (
        <div className="rounded-card border border-border bg-bg2 px-4 py-3 font-sans text-sm text-muted">
          Web Bluetooth needs Chrome or Edge (desktop/Android) on localhost or HTTPS.
          Brave and in-app previews often block it — open a normal Chrome/Edge window.
          Safari/iOS cannot pair devices; use mock trainer / mock HR to preview the HUD.
        </div>
      )}

      <section className="rounded-card border border-border bg-card p-4 md:p-6 space-y-3">
        <h2 className="font-display text-lg text-accent uppercase tracking-wide">
          Devices
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {!deviceName ? (
            <>
              <button
                type="button"
                onClick={handleConnectTrainer}
                disabled={!bleOk}
                className="font-sans text-sm px-4 py-2 rounded-card bg-accent text-bg font-medium disabled:opacity-40 hover:opacity-90"
              >
                Connect trainer
              </button>
              <button
                type="button"
                onClick={handleMockTrainer}
                className="font-sans text-sm px-4 py-2 rounded-card border border-border text-text hover:bg-bg2"
              >
                Mock trainer
              </button>
            </>
          ) : (
            <span className="font-sans text-sm text-muted">
              Trainer: {deviceName}
              {rideSource ? ` · ${rideSource.toUpperCase()}` : ''}
              {canControl ? ' · control OK' : ' · read-only'}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!hrDeviceName ? (
            <>
              <button
                type="button"
                onClick={handleConnectHr}
                disabled={!bleOk}
                className="font-sans text-sm px-4 py-2 rounded-card border border-accent text-accent hover:bg-bg2 disabled:opacity-40"
              >
                Connect HR (Amazfit / strap)
              </button>
              <button
                type="button"
                onClick={handleMockHr}
                className="font-sans text-sm px-4 py-2 rounded-card border border-border text-text hover:bg-bg2"
              >
                Mock HR
              </button>
            </>
          ) : (
            <>
              <span className="font-sans text-sm text-muted">HR: {hrDeviceName}</span>
              <button
                type="button"
                onClick={handleDisconnectHr}
                className="font-sans text-xs px-3 py-1.5 rounded-card border border-border text-muted hover:text-text"
              >
                Disconnect HR
              </button>
            </>
          )}
        </div>
        <p className="font-sans text-xs text-muted">
          Amazfit: enable Heart Rate Push (or start a broadcast workout) so the watch
          appears as a Bluetooth heart-rate monitor, then Connect HR.
        </p>
      </section>

      <section className="rounded-card border border-border bg-card p-4 md:p-6 space-y-3">
        <h2 className="font-display text-lg text-accent uppercase tracking-wide">
          FTP &amp; max HR
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="font-sans text-sm text-muted">
            FTP (W)
            <input
              type="number"
              min={50}
              max={600}
              value={ftp}
              onChange={(e) => setFtp(Number(e.target.value) || 200)}
              className="ml-2 w-20 bg-bg3 border border-border text-text font-sans text-sm px-2 py-1.5 rounded-card"
            />
          </label>
          <label className="font-sans text-sm text-muted">
            Max HR
            <input
              type="number"
              min={100}
              max={230}
              value={maxHrSetting}
              onChange={(e) => setMaxHrSetting(Number(e.target.value) || 184)}
              className="ml-2 w-20 bg-bg3 border border-border text-text font-sans text-sm px-2 py-1.5 rounded-card"
            />
          </label>
          <button
            type="button"
            onClick={persistPrefs}
            className="font-sans text-sm px-3 py-1.5 rounded-card border border-border hover:bg-bg2"
          >
            Save locally
          </button>
        </div>
      </section>

      <CoursePicker
        selectedId={courseId}
        disabled={phase === 'riding' || phase === 'saving'}
        onSelect={(id) => {
          setCourseId(id);
          if (id) setWorkoutId(null);
        }}
      />

      <WorkoutPicker
        selectedId={workoutId}
        ftp={ftp}
        disabled={phase === 'riding' || phase === 'saving'}
        onSelect={(id) => {
          setWorkoutId(id);
          if (id) setCourseId(null);
        }}
      />

      <section className="rounded-card border border-border bg-card p-4 md:p-6 space-y-4 relative">
        <div className="relative">
          <RideWorldPanel
            hrBpm={displayHr}
            hrZone={zone}
            riding={phase === 'riding'}
            paused={paused}
            onPause={handlePause}
            onResume={() => void handleResume()}
            onEndRide={() => void handleEndRide()}
          >
            <RideWorld
              active={phase === 'riding' && !paused}
              speedKmh={speed}
              cadenceRpm={cadence}
              powerWatts={power}
              ftp={ftp}
              gradePct={
                courseId && !workoutId
                  ? courseGrade
                  : controlMode === 'sim'
                    ? simGrade
                    : courseGrade !== 0
                      ? courseGrade
                      : 0
              }
              hrBpm={displayHr}
              hrZone={zone}
              surge={surge && !paused}
              speedUnit={speedUnit}
              onToggleSpeedUnit={handleToggleSpeedUnit}
            />
            {paused ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg/55 pointer-events-none">
                <p className="font-display text-lg md:text-xl text-accent uppercase tracking-wide">
                  Paused · moving time frozen
                </p>
              </div>
            ) : null}
            <RideEventToasts events={hudEvents} onDismiss={dismissEvent} />
            <RideMomentOverlay moment={rideMoment} onDismiss={dismissMoment} />
            {courseId && getRideCourse(courseId) && !workoutId ? (
              <ElevationProfileOverlay
                course={getRideCourse(courseId)!}
                distanceM={distanceM}
                gradePct={courseGrade}
                elevationGainM={elevationGainM}
                trainerLinked={trainerGradeLive && canControl}
              />
            ) : null}
          </RideWorldPanel>
        </div>

        {workoutHud && workoutId && (
          <WorkoutIntervalHud progress={workoutHud} />
        )}

        {courseId && getRideCourse(courseId) && !workoutId && (
          <CourseClimbHud
            courseName={getRideCourse(courseId)!.name}
            distanceM={distanceM}
            courseLengthM={getRideCourse(courseId)!.lengthMeters}
            grade={courseGrade}
            elevationGainM={elevationGainM}
            hint={upcomingSegment(getRideCourse(courseId)!, distanceM)}
            finished={courseFinished}
            distanceUnit={speedUnit}
          />
        )}

        <div className="flex flex-wrap items-center gap-2">
          {phase === 'connected' && (
            <button
              type="button"
              onClick={handleStartRide}
              className="font-sans text-sm px-4 py-2 rounded-card bg-accent text-bg font-medium hover:opacity-90"
            >
              Start ride
              {workoutId
                ? ' · workout'
                : courseId
                  ? ' · course'
                  : ''}
            </button>
          )}
          {phase === 'riding' && (
            <>
              {paused ? (
                <button
                  type="button"
                  onClick={() => void handleResume()}
                  className="font-sans text-sm px-4 py-2 rounded-card border border-border text-text hover:bg-bg2"
                >
                  Resume
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePause}
                  className="font-sans text-sm px-4 py-2 rounded-card border border-border text-text hover:bg-bg2"
                >
                  Pause
                </button>
              )}
              <button
                type="button"
                onClick={handleLap}
                disabled={paused}
                className="font-sans text-sm px-4 py-2 rounded-card border border-border text-text hover:bg-bg2 disabled:opacity-40 disabled:pointer-events-none"
              >
                Lap
              </button>
              <button
                type="button"
                onClick={handleEndRide}
                className="font-sans text-sm px-4 py-2 rounded-card bg-accent text-bg font-medium hover:opacity-90"
              >
                End &amp; save
              </button>
            </>
          )}
          {phase === 'saving' && (
            <span className="font-sans text-sm text-muted">Saving…</span>
          )}
          {deviceName && phase !== 'saving' && (
            <button
              type="button"
              onClick={handleDisconnectTrainer}
              className="font-sans text-sm px-4 py-2 rounded-card border border-border text-muted hover:text-text hover:bg-bg2"
            >
              Disconnect trainer
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric label="Power" value={`${Math.round(power)}`} unit="W" large />
          <Metric label="Cadence" value={`${Math.round(cadence)}`} unit="rpm" large />
          <Metric
            label="Speed"
            value={speedInUnit(speed, speedUnit).toFixed(1)}
            unit={speedUnitLabel(speedUnit)}
            large
            onClick={handleToggleSpeedUnit}
            title="Toggle km/h ↔ mph"
          />
          <Metric label="Time" value={formatDuration(elapsedSec)} unit="" large />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric
            label="Distance"
            value={formatDistance(distanceM, speedUnit)}
            unit=""
            onClick={handleToggleSpeedUnit}
            title="Toggle km ↔ mi (also switches speed km/h ↔ mph)"
          />
          <Metric
            label="Resistance"
            value={
              live.resistanceLevel != null ? String(live.resistanceLevel) : '—'
            }
            unit=""
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric label="Avg power" value={`${Math.round(liveStats.avgPower)}`} unit="W" />
          <Metric
            label="NP"
            value={liveStats.np != null ? `${Math.round(liveStats.np)}` : '—'}
            unit="W"
          />
          <Metric
            label="TSS"
            value={liveStats.tss != null ? `${Math.round(liveStats.tss)}` : '—'}
            unit=""
          />
          <Metric label="Work" value={liveStats.work.toFixed(1)} unit="kJ" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric
            label="Max power"
            value={`${Math.round(liveStats.maxPower)}`}
            unit="W"
          />
          <Metric
            label="Avg / max cad"
            value={`${Math.round(liveStats.avgCadence)}/${Math.round(liveStats.maxCadence)}`}
            unit="rpm"
          />
          <Metric
            label="Avg / max HR"
            value={
              liveStats.maxHr > 0
                ? `${Math.round(liveStats.avgHr)}/${Math.round(liveStats.maxHr)}`
                : '—'
            }
            unit="bpm"
          />
          <Metric
            label="Energy"
            value={live.energyKcal != null ? String(live.energyKcal) : '—'}
            unit={live.energyKcal != null ? 'kcal' : ''}
          />
        </div>

        <PowerSparkline samples={powerSeries} />
      </section>

      {canControl && deviceName && (
        <section className="rounded-card border border-border bg-card p-4 md:p-6 space-y-4">
          <h2 className="font-display text-lg text-accent uppercase tracking-wide">
            Trainer control
          </h2>
          <p className="font-sans text-xs text-muted">
            Mode: <span className="text-text">{controlMode.toUpperCase()}</span>
            {controlMode === 'erg' || controlMode === 'workout'
              ? ` · target ${ergTarget} W`
              : ''}
            {controlMode === 'sim' || controlMode === 'course'
              ? ` · grade ${simGrade.toFixed(1)}%`
              : ''}
            {canControl ? ' · FTMS control ready' : ''}
            {workoutFinished ? ' · workout done' : ''}
            {courseFinished ? ' · course done' : ''}
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="font-sans text-sm text-muted">
              ERG target (W)
              <input
                type="number"
                min={50}
                max={600}
                value={ergTarget}
                onChange={(e) => setErgTarget(Number(e.target.value) || 0)}
                className="ml-2 w-24 bg-bg3 border border-border text-text font-sans text-sm px-2 py-1.5 rounded-card"
              />
            </label>
            <button
              type="button"
              onClick={applyErg}
              className="font-sans text-sm px-3 py-1.5 rounded-card bg-accent text-bg font-medium"
            >
              Apply ERG
            </button>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="font-sans text-sm text-muted w-full sm:w-auto">
              SIM grade ({simGrade.toFixed(1)}%) — live while riding
              <input
                type="range"
                min={-5}
                max={15}
                step={0.5}
                value={simGrade}
                onChange={(e) => onSimSliderChange(Number(e.target.value))}
                className="block w-full sm:w-56 mt-2"
              />
            </label>
            <button
              type="button"
              onClick={applySim}
              className="font-sans text-sm px-3 py-1.5 rounded-card border border-border hover:bg-bg2"
            >
              Apply grade
            </button>
            <button
              type="button"
              onClick={applyFree}
              className="font-sans text-sm px-3 py-1.5 rounded-card border border-border hover:bg-bg2"
            >
              Free ride
            </button>
          </div>
        </section>
      )}

      {laps.length > 0 && (
        <section>
          <h2 className="font-display text-xl text-accent uppercase tracking-wide mb-3">
            Laps
          </h2>
          <ul className="space-y-2">
            {laps.map((lap) => (
              <li
                key={lap.index}
                className="rounded-card border border-border bg-card px-4 py-3 font-sans text-sm text-muted flex flex-wrap gap-x-3"
              >
                <span className="text-text">Lap {lap.index}</span>
                <span>{formatDuration(lap.durationSec)}</span>
                <span>{formatDistance(lap.distanceMeters, speedUnit)}</span>
                {lap.avgPowerWatts != null && <span>avg {lap.avgPowerWatts} W</span>}
                {lap.avgHeartRateBpm != null && <span>avg {lap.avgHeartRateBpm} bpm</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {lastSaved && (
        <section className="rounded-card border border-border bg-bg2 px-4 py-3 font-sans text-sm text-muted">
          Last saved: {lastSaved.durationMinutes} min
          {lastSaved.distanceMeters != null && lastSaved.distanceMeters > 0
            ? ` · ${formatMilesFromMeters(lastSaved.distanceMeters)}`
            : ''}
          {lastSaved.avgPowerWatts != null ? ` · avg ${lastSaved.avgPowerWatts} W` : ''}
          {lastSaved.normalizedPowerWatts != null
            ? ` · NP ${lastSaved.normalizedPowerWatts}`
            : ''}
          {lastSaved.trainingStressScore != null
            ? ` · TSS ${lastSaved.trainingStressScore}`
            : ''}
          {lastSaved.avgHeartRateBpm != null
            ? ` · avg HR ${lastSaved.avgHeartRateBpm}`
            : ''}
          {lastSaved.caloriesBurned != null ? ` · ${lastSaved.caloriesBurned} kcal` : ''}
        </section>
      )}

      {recent.length > 0 && (
        <section>
          <h2 className="font-display text-xl text-accent uppercase tracking-wide mb-3">
            Recent rides
          </h2>
          <ul className="space-y-2">
            {recent.map((r) => (
              <li
                key={r.id}
                className="rounded-card border border-border bg-card px-4 py-3 font-sans text-sm text-muted flex flex-wrap items-center gap-x-3 gap-y-1"
              >
                <Link
                  href={`/cycling/${r.id}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted hover:text-text min-w-0"
                >
                  <span>{r.durationMinutes ?? '—'} min</span>
                  {r.distanceMeters != null && r.distanceMeters > 0 && (
                    <span>{formatMilesFromMeters(r.distanceMeters)}</span>
                  )}
                  {r.avgPowerWatts != null && <span>avg {r.avgPowerWatts} W</span>}
                  {r.normalizedPowerWatts != null && <span>NP {r.normalizedPowerWatts}</span>}
                  {r.trainingStressScore != null && <span>TSS {r.trainingStressScore}</span>}
                  {r.avgHeartRateBpm != null && <span>HR {r.avgHeartRateBpm}</span>}
                  {r.workKj != null && <span>{r.workKj} kJ</span>}
                  {r.lapCount != null && r.lapCount > 0 && <span>{r.lapCount} laps</span>}
                  {r.caloriesBurned != null && <span>{r.caloriesBurned} kcal</span>}
                  {(r.durationMinutes ?? 0) >= 120 && (
                    <span className="text-accent2">suspect long</span>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={() => void handleDeleteRide(r.id)}
                  className="ml-auto font-sans text-xs text-muted hover:text-accent2 underline"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {celebration && (
        <RideXpCelebration
          open
          xpGained={celebration.xpGained}
          levelBefore={celebration.levelBefore}
          levelAfter={celebration.levelAfter}
          newBadges={celebration.newBadges}
          onClose={() => setCelebration(null)}
        />
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
  large,
  onClick,
  title,
}: {
  label: string;
  value: string;
  unit: string;
  large?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  const interactive = typeof onClick === 'function';
  const className = `rounded-card bg-bg2 border border-border px-3 py-3 text-left w-full ${
    interactive
      ? 'cursor-pointer hover:border-accent/50 transition-colors'
      : ''
  }`;

  const body = (
    <>
      <p className="font-sans text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p
        className={`font-mono text-text mt-1 ${large ? 'text-2xl md:text-3xl' : 'text-lg'}`}
      >
        {value}
        {unit ? (
          <span className="font-sans text-xs text-muted ml-1">{unit}</span>
        ) : null}
      </p>
    </>
  );

  if (interactive) {
    return (
      <button type="button" className={className} onClick={onClick} title={title}>
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
}
