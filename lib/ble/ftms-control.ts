import { FTMS_CONTROL_POINT } from './uuids';

/**
 * FTMS Control Point opcodes (Bluetooth SIG Fitness Machine Service 1.0).
 * NOTE: Indoor Bike Simulation is 0x11 — not 0x0D (that is Targeted Training Time).
 */
const OP_REQUEST_CONTROL = 0x00;
const OP_RESET = 0x01;
const OP_SET_TARGET_POWER = 0x05;
const OP_START_OR_RESUME = 0x07;
const OP_SET_INDOOR_BIKE_SIMULATION = 0x11;
const OP_RESPONSE = 0x80;

const RESULT_SUCCESS = 0x01;

export type FtmsController = {
  requestControl: () => Promise<void>;
  /** Ensure control is granted (+ start/resume) then send setpoints. */
  ensureReady: () => Promise<void>;
  setTargetPower: (watts: number) => Promise<void>;
  setSimulationGrade: (gradePct: number) => Promise<void>;
  reset: () => Promise<void>;
};

async function writeControl(
  char: BluetoothRemoteGATTCharacteristic,
  bytes: Uint8Array
): Promise<void> {
  const copy = new Uint8Array(bytes).buffer;
  if (char.writeValueWithResponse) {
    await char.writeValueWithResponse(copy);
    return;
  }
  await char.writeValue(copy);
}

function encodeSimulation(gradePct: number): Uint8Array {
  const grade = Math.round(Math.max(-40, Math.min(40, gradePct)) * 100); // 0.01%
  const buf = new ArrayBuffer(7);
  const view = new DataView(buf);
  view.setUint8(0, OP_SET_INDOOR_BIKE_SIMULATION);
  view.setInt16(1, 0, true); // wind speed 0.001 m/s
  view.setInt16(3, grade, true); // grade 0.01 %
  // Rolling resistance ~0.004, wind coeff ~0.51 kg/m — Zwift-ish indoor defaults
  view.setUint8(5, 40);
  view.setUint8(6, 51);
  return new Uint8Array(buf);
}

function encodeTargetPower(watts: number): Uint8Array {
  const w = Math.max(0, Math.min(2000, Math.round(watts)));
  const buf = new ArrayBuffer(3);
  const view = new DataView(buf);
  view.setUint8(0, OP_SET_TARGET_POWER);
  view.setInt16(1, w, true);
  return new Uint8Array(buf);
}

/**
 * Attach FTMS control-point helpers with request/response sequencing.
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
    // Some stacks still accept writes without indications
  }

  let controlGranted = false;
  let chain: Promise<void> = Promise.resolve();

  function enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = chain.then(fn, fn);
    chain = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  function waitForResult(requestOpcode: number, timeoutMs = 2500): Promise<number> {
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        cleanup();
        // Many trainers still apply the command even if indication is flaky
        resolve(RESULT_SUCCESS);
      }, timeoutMs);

      const onValue = () => {
        const value = control.value;
        if (!value || value.byteLength < 3) return;
        if (value.getUint8(0) !== OP_RESPONSE) return;
        if (value.getUint8(1) !== requestOpcode) return;
        const result = value.getUint8(2);
        cleanup();
        resolve(result);
      };

      function cleanup() {
        window.clearTimeout(timer);
        try {
          control.removeEventListener('characteristicvaluechanged', onValue);
        } catch {
          /* ignore */
        }
      }

      control.addEventListener('characteristicvaluechanged', onValue);
    });
  }

  async function writeAndConfirm(opcode: number, payload: Uint8Array): Promise<void> {
    const resultPromise = waitForResult(opcode);
    await writeControl(control, payload);
    const result = await resultPromise;
    if (result !== RESULT_SUCCESS) {
      // 0x05 = control not permitted — clear grant so we re-request next time
      if (result === 0x05) controlGranted = false;
      throw new Error(`Trainer rejected command 0x${opcode.toString(16)} (result ${result})`);
    }
  }

  async function ensureReadyInternal(): Promise<void> {
    if (!controlGranted) {
      await writeAndConfirm(OP_REQUEST_CONTROL, new Uint8Array([OP_REQUEST_CONTROL]));
      controlGranted = true;
      try {
        await writeAndConfirm(OP_START_OR_RESUME, new Uint8Array([OP_START_OR_RESUME]));
      } catch {
        // Some trainers don't need / support start-or-resume
      }
    }
  }

  return {
    requestControl: () =>
      enqueue(async () => {
        controlGranted = false;
        await ensureReadyInternal();
      }),
    ensureReady: () => enqueue(() => ensureReadyInternal()),
    setTargetPower: (watts: number) =>
      enqueue(async () => {
        await ensureReadyInternal();
        await writeAndConfirm(OP_SET_TARGET_POWER, encodeTargetPower(watts));
      }),
    setSimulationGrade: (gradePct: number) =>
      enqueue(async () => {
        await ensureReadyInternal();
        await writeAndConfirm(
          OP_SET_INDOOR_BIKE_SIMULATION,
          encodeSimulation(gradePct)
        );
      }),
    reset: () =>
      enqueue(async () => {
        try {
          await writeAndConfirm(OP_RESET, new Uint8Array([OP_RESET]));
        } finally {
          controlGranted = false;
        }
      }),
  };
}
