import { formatWebBluetoothError } from './errors';
import { createFtmsController, type FtmsController } from './ftms-control';
import {
  CPS_SERVICE,
  CYCLING_POWER_MEASUREMENT,
  FTMS_SERVICE,
  INDOOR_BIKE_DATA,
} from './uuids';
import {
  parseCyclingPowerMeasurement,
  parseIndoorBikeData,
  type IndoorBikeSample,
} from './parse-indoor-bike';

export type TrainerConnection = {
  deviceId: string;
  deviceName: string;
  source: 'ftms' | 'cps' | 'mock';
  canControl: boolean;
  requestControl: () => Promise<void>;
  ensureReady: () => Promise<void>;
  setTargetPower: (watts: number) => Promise<void>;
  setSimulationGrade: (gradePct: number) => Promise<void>;
  resetControl: () => Promise<void>;
  disconnect: () => void;
};

export type MetricsHandler = (sample: IndoorBikeSample) => void;
export type DisconnectHandler = () => void;

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.bluetooth;
}

function noopControl(): Pick<
  TrainerConnection,
  'requestControl' | 'ensureReady' | 'setTargetPower' | 'setSimulationGrade' | 'resetControl'
> {
  const unsupported = async () => {
    throw new Error('This trainer does not support resistance control');
  };
  return {
    requestControl: unsupported,
    ensureReady: unsupported,
    setTargetPower: unsupported,
    setSimulationGrade: unsupported,
    resetControl: unsupported,
  };
}

function wrapController(ctrl: FtmsController | null) {
  if (!ctrl) return { canControl: false as const, ...noopControl() };
  return {
    canControl: true as const,
    requestControl: () => ctrl.requestControl(),
    ensureReady: () => ctrl.ensureReady(),
    setTargetPower: (w: number) => ctrl.setTargetPower(w),
    setSimulationGrade: (g: number) => ctrl.setSimulationGrade(g),
    resetControl: () => ctrl.reset(),
  };
}

export async function connectTrainer(
  onMetrics: MetricsHandler,
  onDisconnect?: DisconnectHandler
): Promise<TrainerConnection> {
  if (!isWebBluetoothSupported()) {
    throw new Error(formatWebBluetoothError('Web Bluetooth is not supported'));
  }

  let device: BluetoothDevice;
  try {
    device = await navigator.bluetooth!.requestDevice({
      filters: [{ services: [FTMS_SERVICE] }, { services: [CPS_SERVICE] }],
      optionalServices: [FTMS_SERVICE, CPS_SERVICE],
    });
  } catch (first) {
    try {
      device = await navigator.bluetooth!.requestDevice({
        acceptAllDevices: true,
        optionalServices: [FTMS_SERVICE, CPS_SERVICE],
      });
    } catch {
      throw new Error(formatWebBluetoothError(first));
    }
  }

  const server = await device.gatt!.connect();
  let source: 'ftms' | 'cps' = 'ftms';
  let characteristic: BluetoothRemoteGATTCharacteristic;
  let controlBits = wrapController(null);

  try {
    const ftms = await server.getPrimaryService(FTMS_SERVICE);
    characteristic = await ftms.getCharacteristic(INDOOR_BIKE_DATA);
    source = 'ftms';
    const ctrl = await createFtmsController(ftms);
    controlBits = wrapController(ctrl);
  } catch {
    const cps = await server.getPrimaryService(CPS_SERVICE);
    characteristic = await cps.getCharacteristic(CYCLING_POWER_MEASUREMENT);
    source = 'cps';
  }

  const onValue = () => {
    const value = characteristic.value;
    if (!value) return;
    const sample =
      source === 'ftms'
        ? parseIndoorBikeData(value)
        : parseCyclingPowerMeasurement(value);
    onMetrics(sample);
  };

  characteristic.addEventListener('characteristicvaluechanged', onValue);
  await characteristic.startNotifications();

  const handleDisconnect = () => onDisconnect?.();
  device.addEventListener('gattserverdisconnected', handleDisconnect);

  return {
    deviceId: device.id,
    deviceName: device.name?.trim() || 'Smart trainer',
    source,
    ...controlBits,
    disconnect: () => {
      try {
        characteristic.removeEventListener('characteristicvaluechanged', onValue);
      } catch {
        /* ignore */
      }
      device.removeEventListener('gattserverdisconnected', handleDisconnect);
      if (device.gatt?.connected) device.gatt.disconnect();
    },
  };
}
