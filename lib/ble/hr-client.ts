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

/**
 * Connect a standalone BLE heart-rate monitor (Amazfit Heart Rate Push, chest strap, etc.).
 * Enable Heart Rate Push / broadcast on the watch first so it advertises service 0x180D.
 */
export async function connectHeartRateMonitor(
  onHr: HrHandler,
  onDisconnect?: () => void
): Promise<HrConnection> {
  if (!isWebBluetoothSupported()) {
    throw new Error(
      'Web Bluetooth is not supported in this browser. Use Chrome or Edge on desktop or Android.'
    );
  }

  const bluetooth = navigator.bluetooth!;

  let device: BluetoothDevice;
  try {
    device = await bluetooth.requestDevice({
      filters: [{ services: [HR_SERVICE] }],
      optionalServices: [HR_SERVICE],
    });
  } catch (first) {
    try {
      device = await bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [HR_SERVICE],
      });
    } catch {
      throw first;
    }
  }

  const server = await device.gatt!.connect();
  const service = await server.getPrimaryService(HR_SERVICE);
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
