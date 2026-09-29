import { formatWebBluetoothError } from './errors';
import { HR_MEASUREMENT, HR_SERVICE } from './uuids';

export type HrConnection = {
  deviceId: string;
  deviceName: string;
  disconnect: () => void;
};

export type HrHandler = (bpm: number) => void;

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.bluetooth;
}

function parseHeartRate(data: DataView): number | null {
  if (data.byteLength < 2) return null;
  const flags = data.getUint8(0);
  return flags & 0x01 ? data.getUint16(1, true) : data.getUint8(1);
}

const HR_PUSH_HINT =
  'No heart-rate service on this device. On Amazfit, enable Heart Rate Push, then connect again.';

/**
 * Connect a standalone BLE heart-rate monitor (Amazfit Heart Rate Push, chest strap, etc.).
 * One chooser lists nearby devices so the watch still appears when it is not advertising 0x180D.
 */
export async function connectHeartRateMonitor(
  onHr: HrHandler,
  onDisconnect?: () => void
): Promise<HrConnection> {
  if (!isWebBluetoothSupported()) {
    throw new Error(formatWebBluetoothError('Web Bluetooth is not supported'));
  }

  const bluetooth = navigator.bluetooth!;

  let device: BluetoothDevice;
  try {
    device = await bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [HR_SERVICE],
    });
  } catch (e) {
    throw new Error(formatWebBluetoothError(e));
  }

  const server = await device.gatt!.connect();
  let service: BluetoothRemoteGATTService;
  try {
    service = await server.getPrimaryService(HR_SERVICE);
  } catch {
    if (device.gatt?.connected) device.gatt.disconnect();
    throw new Error(HR_PUSH_HINT);
  }
  const characteristic = await service.getCharacteristic(HR_MEASUREMENT);

  const onValue = () => {
    const value = characteristic.value;
    if (!value) return;
    const bpm = parseHeartRate(value);
    if (bpm != null && bpm > 0) onHr(bpm);
  };

  characteristic.addEventListener('characteristicvaluechanged', onValue);
  await characteristic.startNotifications();

  const handleDisconnect = () => onDisconnect?.();
  device.addEventListener('gattserverdisconnected', handleDisconnect);

  return {
    deviceId: device.id,
    deviceName: device.name?.trim() || 'Heart rate monitor',
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
