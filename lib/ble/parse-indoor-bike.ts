/**
 * Parse FTMS Indoor Bike Data (0x2AD2).
 * Flags bit layout per Bluetooth SIG GATT XML — fields after flags are present
 * only when their corresponding bit is set (except Instantaneous Speed, which
 * is present when bit 0 "More Data" is clear).
 */

export type IndoorBikeSample = {
  speedKmh?: number;
  cadenceRpm?: number;
  powerWatts?: number;
  distanceMeters?: number;
  heartRateBpm?: number;
  energyKcal?: number;
  elapsedTimeSec?: number;
  resistanceLevel?: number;
};

export function parseIndoorBikeData(data: DataView): IndoorBikeSample {
  if (data.byteLength < 2) return {};

  const flags = data.getUint16(0, true);
  let o = 2;
  const out: IndoorBikeSample = {};

  // Bit 0 = More Data: when 0, Instantaneous Speed is present
  if ((flags & 0x0001) === 0) {
    if (o + 2 > data.byteLength) return out;
    out.speedKmh = data.getUint16(o, true) / 100;
    o += 2;
  }

  // Bit 1 Average Speed
  if (flags & 0x0002) {
    if (o + 2 > data.byteLength) return out;
    o += 2;
  }

  // Bit 2 Instantaneous Cadence (0.5 rpm resolution)
  if (flags & 0x0004) {
    if (o + 2 > data.byteLength) return out;
    out.cadenceRpm = data.getUint16(o, true) / 2;
    o += 2;
  }

  // Bit 3 Average Cadence
  if (flags & 0x0008) {
    if (o + 2 > data.byteLength) return out;
    o += 2;
  }

  // Bit 4 Total Distance (uint24, meters)
  if (flags & 0x0010) {
    if (o + 3 > data.byteLength) return out;
    out.distanceMeters =
      data.getUint8(o) | (data.getUint8(o + 1) << 8) | (data.getUint8(o + 2) << 16);
    o += 3;
  }

  // Bit 5 Resistance Level (sint16)
  if (flags & 0x0020) {
    if (o + 2 > data.byteLength) return out;
    out.resistanceLevel = data.getInt16(o, true);
    o += 2;
  }

  // Bit 6 Instantaneous Power
  if (flags & 0x0040) {
    if (o + 2 > data.byteLength) return out;
    out.powerWatts = data.getInt16(o, true);
    o += 2;
  }

  // Bit 7 Average Power
  if (flags & 0x0080) {
    if (o + 2 > data.byteLength) return out;
    o += 2;
  }

  // Bit 8 Expended Energy: total energy (uint16) + energy/hour (uint16) + energy/min (uint8)
  if (flags & 0x0100) {
    if (o + 5 > data.byteLength) return out;
    out.energyKcal = data.getUint16(o, true);
    o += 5;
  }

  // Bit 9 Heart Rate
  if (flags & 0x0200) {
    if (o + 1 > data.byteLength) return out;
    out.heartRateBpm = data.getUint8(o);
    o += 1;
  }

  // Bit 10 Metabolic Equivalent
  if (flags & 0x0400) {
    if (o + 1 > data.byteLength) return out;
    o += 1;
  }

  // Bit 11 Elapsed Time
  if (flags & 0x0800) {
    if (o + 2 > data.byteLength) return out;
    out.elapsedTimeSec = data.getUint16(o, true);
    o += 2;
  }

  return out;
}

/** Cycling Power Measurement (0x2A63) — instantaneous power always present after flags. */
export function parseCyclingPowerMeasurement(data: DataView): IndoorBikeSample {
  if (data.byteLength < 4) return {};
  const flags = data.getUint16(0, true);
  let o = 2;
  const powerWatts = data.getInt16(o, true);
  o += 2;
  const out: IndoorBikeSample = { powerWatts };

  // Bit 4: Wheel Revolution Data present (cumulative revs uint32 + last event time uint16)
  if (flags & 0x0010) {
    if (o + 6 > data.byteLength) return out;
    o += 6;
  }
  // Bit 5: Crank Revolution Data present (crank revs uint16 + last event time uint16)
  if (flags & 0x0020) {
    if (o + 4 > data.byteLength) return out;
    // Cadence needs two samples over time; leave unset for Phase 1
  }

  return out;
}
