'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  connectHeartRateMonitor,
  isWebBluetoothSupported,
  type HrConnection,
} from '@/lib/ble/hr-client';
import { startMockHeartRate } from '@/lib/ble/mock-trainer';
import { hrZone, loadRidePrefs, type HrZone } from '@/lib/ride/stats';

const SPARK_MAX = 48;

export type HrSessionStats = {
  avgHeartRateBpm: number | null;
  maxHeartRateBpm: number | null;
  hrDeviceName: string | null;
  sampleCount: number;
};

export function useHrSession(sampling: boolean) {
  const [bleOk, setBleOk] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [hrBpm, setHrBpm] = useState<number | null>(null);
  const [hrDeviceName, setHrDeviceName] = useState<string | null>(null);
  const [maxHrSetting, setMaxHrSetting] = useState(184);
  const [spark, setSpark] = useState<number[]>([]);
  const [avgHr, setAvgHr] = useState(0);
  const [maxHr, setMaxHr] = useState(0);
  const [sampleCount, setSampleCount] = useState(0);

  const hrConnRef = useRef<HrConnection | { disconnect: () => void } | null>(null);
  const sumRef = useRef(0);
  const countRef = useRef(0);
  const maxRef = useRef(0);
  const deviceNameRef = useRef<string | null>(null);
  const maxHrSettingRef = useRef(184);
  const samplingRef = useRef(sampling);
  samplingRef.current = sampling;

  const getStats = useCallback((): HrSessionStats => {
    return {
      avgHeartRateBpm:
        countRef.current > 0 ? Math.round(sumRef.current / countRef.current) : null,
      maxHeartRateBpm: maxRef.current > 0 ? Math.round(maxRef.current) : null,
      hrDeviceName: deviceNameRef.current,
      sampleCount: countRef.current,
    };
  }, []);

  const onHr = useCallback((bpm: number) => {
    if (!Number.isFinite(bpm) || bpm <= 0) return;
    setHrBpm(bpm);
    if (!samplingRef.current) return;
    sumRef.current += bpm;
    countRef.current += 1;
    if (bpm > maxRef.current) maxRef.current = bpm;
    setAvgHr(Math.round(sumRef.current / countRef.current));
    setMaxHr(Math.round(maxRef.current));
    setSampleCount(countRef.current);
    setSpark((prev) => {
      const next = [...prev, Math.round(bpm)];
      return next.length > SPARK_MAX ? next.slice(-SPARK_MAX) : next;
    });
  }, []);

  const disconnect = useCallback(() => {
    hrConnRef.current?.disconnect();
    hrConnRef.current = null;
    deviceNameRef.current = null;
    setHrDeviceName(null);
    setHrBpm(null);
  }, []);

  const resetSamples = useCallback(() => {
    sumRef.current = 0;
    countRef.current = 0;
    maxRef.current = 0;
    setAvgHr(0);
    setMaxHr(0);
    setSampleCount(0);
    setSpark([]);
  }, []);

  const connect = useCallback(async () => {
    if (!isWebBluetoothSupported()) return;
    setConnecting(true);
    try {
      const conn = await connectHeartRateMonitor(onHr, () => {
        deviceNameRef.current = null;
        setHrDeviceName(null);
        setHrBpm(null);
        hrConnRef.current = null;
        toast.message('Heart rate monitor disconnected');
      });
      hrConnRef.current?.disconnect();
      hrConnRef.current = conn;
      deviceNameRef.current = conn.deviceName;
      setHrDeviceName(conn.deviceName);
      toast.success(`Connected ${conn.deviceName}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not connect HR';
      if (!/cancel/i.test(msg)) toast.error(msg);
    } finally {
      setConnecting(false);
    }
  }, [onHr]);

  const mock = useCallback(() => {
    hrConnRef.current?.disconnect();
    const conn = startMockHeartRate(onHr);
    hrConnRef.current = conn;
    deviceNameRef.current = conn.deviceName;
    setHrDeviceName(conn.deviceName);
    toast.success('Mock HR running');
  }, [onHr]);

  useEffect(() => {
    setBleOk(isWebBluetoothSupported());
    const prefs = loadRidePrefs();
    setMaxHrSetting(prefs.maxHr);
    maxHrSettingRef.current = prefs.maxHr;
    return () => {
      hrConnRef.current?.disconnect();
      hrConnRef.current = null;
    };
  }, []);

  useEffect(() => {
    maxHrSettingRef.current = maxHrSetting;
  }, [maxHrSetting]);

  const zone: HrZone | null =
    hrBpm != null ? hrZone(hrBpm, maxHrSetting) : null;

  return {
    bleOk,
    connecting,
    hrBpm,
    hrDeviceName,
    zone,
    avgHr,
    maxHr,
    sampleCount,
    spark,
    maxHrSetting,
    setMaxHrSetting,
    connect,
    disconnect,
    mock,
    resetSamples,
    getStats,
  };
}

export function useIsPhone() {
  const [isPhone, setIsPhone] = useState(false);
  useLayoutEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const apply = () => setIsPhone(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return isPhone;
}
