import { FTMS_CONTROL_POINT } from './uuids';

/** FTMS Control Point opcodes (Bluetooth SIG Fitness Machine Service). */
const OP_REQUEST_CONTROL = 0x00;
const OP_RESET = 0x01;
const OP_SET_TARGET_POWER = 0x05;
const OP_SET_INDOOR_BIKE_SIMULATION = 0x0d;

export type FtmsController = {
  requestControl: () => Promise<void>;
  setTargetPower: (watts: number) => Promise<void>;
  setSimulationGrade: (gradePct: number) => Promise<void>;
  reset: () => Promise<void>;
};

async function writeControl(
  char: BluetoothRemoteGATTCharacteristic,
  bytes: number[]
): Promise<void> {
  const buf = new Uint8Array(bytes);
  if (char.writeValueWithResponse) {
    await char.writeValueWithResponse(buf);
    return;
  }
  await char.writeValue(buf);
}

/**
 * Attach FTMS control-point helpers. Call requestControl before setpoints.
 * Returns null if the trainer has no control point (read-only / CPS-only).
 */
export async function createFtmsController(
  service: BluetoothRemoteGATTService
): Promise<FtmsController | null> {
  let control: BluetoothRemoteGATTCharacteristic;
  try {
    control = await service.getCharacteristic(FTMS_CONTROL_POINT);
  } catch {
    return null;
  }

  try {
    await control.startNotifications();
  } catch {
    // Some stacks still accept writes without indications enabled
  }

  return {
    async requestControl() {
      await writeControl(control, [OP_REQUEST_CONTROL]);
    },
    async setTargetPower(watts: number) {
      const w = Math.max(0, Math.min(2000, Math.round(watts)));
      await writeControl(control, [
        OP_SET_TARGET_POWER,
        w & 0xff,
        (w >> 8) & 0xff,
      ]);
    },
    async setSimulationGrade(gradePct: number) {
      const grade = Math.round(Math.max(-40, Math.min(40, gradePct)) * 100);
      const gradeLo = grade & 0xff;
      const gradeHi = (grade >> 8) & 0xff;
      // wind 0, Crr ~0.004 (40), Cw ~0.51 (51) — common indoor defaults
      await writeControl(control, [
        OP_SET_INDOOR_BIKE_SIMULATION,
        0,
        0,
        gradeLo,
        gradeHi,
        40,
        51,
      ]);
    },
    async reset() {
      await writeControl(control, [OP_RESET]);
    },
  };
}
