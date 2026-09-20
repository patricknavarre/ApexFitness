import {
  CPS_SERVICE,
  CYCLING_POWER_MEASUREMENT,
  FTMS_SERVICE,
  HR_MEASUREMENT,
  HR_SERVICE,
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
  source: 'ftms' | 'cps';
  disconnect: () => void;
};

export type MetricsHandler = (sample: IndoorBikeSample) => void;
export type DisconnectHandler = () => void;

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.bluetooth;
}

export async function connectTrainer(
  onMetrics: MetricsHandler,
  onDisconnect?: DisconnectHandler
): Promise<TrainerConnection> {
  if (!isWebBluetoothSupported()) {
    throw new Error('Web Bluetooth is not supported in this browser. Use Chrome or Edge on desktop or Android.');
  }

  let device: BluetoothDevice;
  try {
    device = await navigator.bluetooth!.requestDevice({
      filters: [{ services: [FTMS_SERVICE] }, { services: [CPS_SERVICE] }],
      optionalServices: [FTMS_SERVICE, CPS_SERVICE, HR_SERVICE],
    });
  } catch (first) {
    // Some trainers omit FTMS/CPS in advertising; fall back to any device picker
    try {
      device = await navigator.bluetooth!.requestDevice({
        acceptAllDevices: true,
        optionalServices: [FTMS_SERVICE, CPS_SERVICE, HR_SERVICE],
      });
    } catch {
      throw first;
    }
  }

  const server = await device.gatt!.connect();
  let source: 'ftms' | 'cps' = 'ftms';
  let characteristic: BluetoothRemoteGATTCharacteristic;

  try {
    const ftms = await server.getPrimaryService(FTMS_SERVICE);
    characteristic = await ftms.getCharacteristic(INDOOR_BIKE_DATA);
    source = 'ftms';
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

  // Optional HR if present
  let hrChar: BluetoothRemoteGATTCharacteristic | null = null;
  try {
    const hrService = await server.getPrimaryService(HR_SERVICE);
    hrChar = await hrService.getCharacteristic(HR_MEASUREMENT);
    const onHr = () => {
      const value = hrChar?.value;
      if (!value || value.byteLength < 2) return;
      const flags = value.getUint8(0);
      const hr =
        flags & 0x01 ? value.getUint16(1, true) : value.getUint8(1);
      onMetrics({ heartRateBpm: hr });
    };
    hrChar.addEventListener('characteristicvaluechanged', onHr);
    await hrChar.startNotifications();
  } catch {
    // HR optional
  }

  const handleDisconnect = () => {
    onDisconnect?.();
  };
  device.addEventListener('gattserverdisconnected', handleDisconnect);

  return {
    deviceId: device.id,
    deviceName: device.name?.trim() || 'Smart trainer',
    source,
    disconnect: () => {
      try {
        characteristic.removeEventListener('characteristicvaluechanged', onValue);
      } catch {
        /* ignore */
      }
      device.removeEventListener('gattserverdisconnected', handleDisconnect);
      if (device.gatt?.connected) {
        device.gatt.disconnect();
      }
    },
  };
}
