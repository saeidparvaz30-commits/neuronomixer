/**
 * Pure, deterministic time model for the "Time Is a Dirty Data Type" guide.
 *
 * Everything here is plain integer arithmetic on milliseconds since the Unix
 * epoch (1970-01-01 00:00 UTC). There is NO Date object, NO system clock, and
 * NO reliance on the browser's timezone database: timezone and DST rules are
 * modeled explicitly as data below, so server and client render identically
 * and every displayed number can be recomputed by hand.
 */

export const MIN_MS = 60_000;
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

// ── Calendar arithmetic (Howard Hinnant's civil-date algorithms) ─────────────

/** Days since 1970-01-01 for a proleptic Gregorian civil date. */
export function daysFromCivil(y: number, m: number, d: number): number {
  const yy = m <= 2 ? y - 1 : y;
  const era = Math.floor(yy / 400);
  const yoe = yy - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

/** Inverse of daysFromCivil. */
export function civilFromDays(z: number): { y: number; m: number; d: number } {
  const zz = z + 719468;
  const era = Math.floor(zz / 146097);
  const doe = zz - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365
  );
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  return { y: m <= 2 ? y + 1 : y, m, d };
}

/** UTC milliseconds for a civil date + time of day. Pure arithmetic. */
export function utcMs(y: number, m: number, d: number, h = 0, mi = 0): number {
  return daysFromCivil(y, m, d) * DAY_MS + h * HOUR_MS + mi * MIN_MS;
}

export interface TimeParts {
  y: number;
  m: number;
  d: number;
  h: number;
  mi: number;
  /** days since epoch */
  day: number;
  /** 0 = Sunday ... 6 = Saturday */
  weekday: number;
}

/** Split a millisecond timestamp into UTC calendar parts. */
export function partsFromMs(ms: number): TimeParts {
  const day = Math.floor(ms / DAY_MS);
  const rem = ms - day * DAY_MS;
  const h = Math.floor(rem / HOUR_MS);
  const mi = Math.floor((rem - h * HOUR_MS) / MIN_MS);
  const { y, m, d } = civilFromDays(day);
  // 1970-01-01 (day 0) was a Thursday; with 0 = Sunday, Thursday = 4.
  const weekday = (((day + 4) % 7) + 7) % 7;
  return { y, m, d, h, mi, day, weekday };
}

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function fmtTime(p: TimeParts): string {
  return `${pad2(p.h)}:${pad2(p.mi)}`;
}

export function fmtDate(p: TimeParts): string {
  return `${WEEKDAYS[p.weekday]} ${MONTHS[p.m - 1]} ${p.d}`;
}

export function fmtFull(p: TimeParts): string {
  return `${fmtDate(p)}, ${fmtTime(p)}`;
}

/** Format a signed minute offset as +05:30 / -08:00 / +00:00. */
export function fmtOffset(offsetMin: number): string {
  const sign = offsetMin < 0 ? "-" : "+";
  const abs = Math.abs(offsetMin);
  return `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
}

// ── Explicit timezone model (the rule table IS the lesson) ───────────────────

/**
 * 2024 EU clock-change instants, hardcoded as data. The real EU rule: clocks
 * change at 01:00 UTC on the last Sunday of March and of October. In 2024
 * those Sundays are March 31 and October 27.
 */
export const CET_DST_START = utcMs(2024, 3, 31, 1, 0); // -> CEST (UTC+2)
export const CET_DST_END = utcMs(2024, 10, 27, 1, 0); // -> CET (UTC+1)

export interface ZoneDef {
  id: string;
  label: string;
  short: string;
  baseOffsetMin: number;
  /** If present: add extraMin when startUtcMs <= t < endUtcMs. */
  dst?: { startUtcMs: number; endUtcMs: number; extraMin: number; note: string };
}

export const ZONES: ReadonlyArray<ZoneDef> = [
  { id: "utc", label: "UTC", short: "UTC", baseOffsetMin: 0 },
  {
    id: "ist",
    label: "UTC+05:30 fixed (India)",
    short: "UTC+05:30",
    baseOffsetMin: 330,
  },
  {
    id: "fixed-m8",
    label: "UTC-08:00 fixed offset",
    short: "UTC-08:00",
    baseOffsetMin: -480,
  },
  {
    id: "cet",
    label: "Central Europe (CET/CEST, 2024 rule)",
    short: "CET/CEST",
    baseOffsetMin: 60,
    dst: {
      startUtcMs: CET_DST_START,
      endUtcMs: CET_DST_END,
      extraMin: 60,
      note: "UTC+2 between 01:00 UTC Mar 31 and 01:00 UTC Oct 27, 2024; UTC+1 otherwise",
    },
  },
];

export function zoneById(id: string): ZoneDef {
  const z = ZONES.find((zz) => zz.id === id);
  return z ?? ZONES[0];
}

/** Offset in minutes this zone applies to the given UTC instant. */
export function zoneOffsetMin(zone: ZoneDef, ms: number): number {
  if (zone.dst && ms >= zone.dst.startUtcMs && ms < zone.dst.endUtcMs) {
    return zone.baseOffsetMin + zone.dst.extraMin;
  }
  return zone.baseOffsetMin;
}

/** Wall-clock parts for a UTC instant in a zone: shift, then read as UTC. */
export function localParts(zone: ZoneDef, ms: number): TimeParts {
  return partsFromMs(ms + zoneOffsetMin(zone, ms) * MIN_MS);
}

/**
 * The naive bug: subtracting wall-clock timestamps as if they were physical
 * time. Returns minutes of wall-clock difference between two UTC instants
 * read through a zone's local clock.
 */
export function naiveWallDiffMin(zone: ZoneDef, aMs: number, bMs: number): number {
  const aLocal = aMs + zoneOffsetMin(zone, aMs) * MIN_MS;
  const bLocal = bMs + zoneOffsetMin(zone, bMs) * MIN_MS;
  return (bLocal - aLocal) / MIN_MS;
}

/** True elapsed minutes between two UTC instants. */
export function trueDiffMin(aMs: number, bMs: number): number {
  return (bMs - aMs) / MIN_MS;
}

// ── Section 1: constant event timeline ───────────────────────────────────────

export interface GuideEvent {
  id: string;
  label: string;
  utc: number;
}

export const EVENTS: ReadonlyArray<GuideEvent> = [
  { id: "e1", label: "Order placed", utc: utcMs(2024, 3, 30, 12, 0) },
  { id: "e2", label: "Payment captured", utc: utcMs(2024, 3, 30, 23, 45) },
  { id: "e3", label: "Shipment scanned", utc: utcMs(2024, 3, 31, 0, 30) },
  { id: "e4", label: "Out for delivery", utc: utcMs(2024, 3, 31, 1, 30) },
  { id: "e5", label: "Support ticket opened", utc: utcMs(2024, 10, 27, 0, 30) },
  { id: "e6", label: "Ticket escalated", utc: utcMs(2024, 10, 27, 1, 15) },
];

// ── Section 2: DST hour strips ───────────────────────────────────────────────

export type DstMode = "spring" | "fall";

export const STRIP_LEN = 7;
/** Index of the first cell at or after the transition instant (01:00 UTC). */
export const STRIP_BOUNDARY_INDEX = 3;

export function stripStart(mode: DstMode): number {
  return mode === "spring" ? utcMs(2024, 3, 30, 22, 0) : utcMs(2024, 10, 26, 22, 0);
}

export interface StripCell {
  utc: number;
  utcParts: TimeParts;
  local: TimeParts;
  offsetMin: number;
  afterBoundary: boolean;
}

export function stripCells(mode: DstMode): StripCell[] {
  const start = stripStart(mode);
  const zone = zoneById("cet");
  const boundary = mode === "spring" ? CET_DST_START : CET_DST_END;
  const cells: StripCell[] = [];
  for (let i = 0; i < STRIP_LEN; i++) {
    const t = start + i * HOUR_MS;
    cells.push({
      utc: t,
      utcParts: partsFromMs(t),
      local: localParts(zone, t),
      offsetMin: zoneOffsetMin(zone, t),
      afterBoundary: t >= boundary,
    });
  }
  return cells;
}

// ── Seeded PRNG ──────────────────────────────────────────────────────────────

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Sections 3 + 4: irregular reading series ─────────────────────────────────

export const READINGS_SEED = 20240325;
/** Monday Mar 25 2024 00:00 UTC through Monday Apr 8 2024 00:00 UTC: 2 weeks. */
export const READINGS_START = utcMs(2024, 3, 25, 0, 0);
export const READINGS_END = utcMs(2024, 4, 8, 0, 0);

/** Traffic incident window: extra load added to readings inside it. */
export const SPIKE_START = utcMs(2024, 3, 29, 13, 0);
export const SPIKE_END = utcMs(2024, 3, 29, 17, 0);
export const SPIKE_EXTRA = 650;

export interface Reading {
  t: number;
  v: number;
}

/**
 * Deterministic irregular series: one reading every 25 to 95 minutes,
 * value = diurnal sine (base 220, amplitude 140, peak at 14:30 UTC)
 * + uniform noise in [-25, +25] + SPIKE_EXTRA inside the incident window.
 * Values are rounded to integers ("requests per minute").
 */
export function generateReadings(): Reading[] {
  const rng = mulberry32(READINGS_SEED);
  const out: Reading[] = [];
  let t = READINGS_START;
  while (t < READINGS_END) {
    const hourOfDay = (t % DAY_MS) / HOUR_MS;
    const diurnal = 220 + 140 * Math.sin(((hourOfDay - 8.5) / 24) * 2 * Math.PI);
    const noise = (rng() - 0.5) * 50;
    const spike = t >= SPIKE_START && t < SPIKE_END ? SPIKE_EXTRA : 0;
    out.push({ t, v: Math.max(0, Math.round(diurnal + noise + spike)) });
    t += Math.round(25 + rng() * 70) * MIN_MS;
  }
  return out;
}

export const READINGS: ReadonlyArray<Reading> = generateReadings();

// ── Resampling ───────────────────────────────────────────────────────────────

export type Granularity = "hourly" | "daily" | "weekly";

export interface Bucket {
  start: number;
  end: number;
  /** null means: no reading fell in this bucket. */
  mean: number | null;
  n: number;
}

/** Monday-anchored week start (days since epoch). Epoch day 0 = Thursday. */
export function weekStartDay(day: number): number {
  return day - ((((day % 7) - 4) + 7) % 7);
}

/**
 * Aggregate readings onto a FIXED grid covering [READINGS_START, READINGS_END)
 * so empty grid slots surface as mean = null instead of silently vanishing.
 */
export function resample(
  readings: ReadonlyArray<Reading>,
  bucketMs: number
): Bucket[] {
  const buckets: Bucket[] = [];
  for (let s = READINGS_START; s < READINGS_END; s += bucketMs) {
    buckets.push({ start: s, end: s + bucketMs, mean: null, n: 0 });
  }
  const sums = new Array(buckets.length).fill(0);
  for (const r of readings) {
    const i = Math.floor((r.t - READINGS_START) / bucketMs);
    if (i < 0 || i >= buckets.length) continue;
    sums[i] += r.v;
    buckets[i].n += 1;
  }
  for (let i = 0; i < buckets.length; i++) {
    if (buckets[i].n > 0) buckets[i].mean = sums[i] / buckets[i].n;
  }
  return buckets;
}

export function resampleByGranularity(
  readings: ReadonlyArray<Reading>,
  g: Granularity
): Bucket[] {
  if (g === "hourly") return resample(readings, HOUR_MS);
  if (g === "daily") return resample(readings, DAY_MS);
  return resample(readings, 7 * DAY_MS); // READINGS_START is a Monday
}

// ── Gap injection + fill policies ────────────────────────────────────────────

/** Two simulated collector outages (UTC windows readings are dropped from). */
export const GAP1_START = utcMs(2024, 3, 27, 6, 0);
export const GAP1_END = utcMs(2024, 3, 28, 2, 0); // 20 hours
export const GAP2_START = utcMs(2024, 4, 3, 0, 0);
export const GAP2_END = utcMs(2024, 4, 4, 12, 0); // 36 hours

export function applyGaps(readings: ReadonlyArray<Reading>): Reading[] {
  return readings.filter(
    (r) =>
      !(r.t >= GAP1_START && r.t < GAP1_END) &&
      !(r.t >= GAP2_START && r.t < GAP2_END)
  );
}

export type FillPolicy = "nan" | "ffill" | "zero";

export interface FilledSeries {
  /** One value per bucket; null only under the "nan" policy. */
  values: Array<number | null>;
  /** Indices of buckets whose value was invented by the policy. */
  filledIdx: number[];
  /** Mean over non-null values (observed-only for "nan"). */
  mean: number;
}

export function applyFillPolicy(buckets: ReadonlyArray<Bucket>, policy: FillPolicy): FilledSeries {
  const values: Array<number | null> = [];
  const filledIdx: number[] = [];
  let last: number | null = null;
  for (let i = 0; i < buckets.length; i++) {
    const m = buckets[i].mean;
    if (m !== null) {
      values.push(m);
      last = m;
    } else if (policy === "nan") {
      values.push(null);
    } else if (policy === "zero") {
      values.push(0);
      filledIdx.push(i);
    } else {
      values.push(last); // ffill; null only if the series starts with a gap
      if (last !== null) filledIdx.push(i);
    }
  }
  const observed = values.filter((v): v is number => v !== null);
  const mean = observed.length > 0 ? observed.reduce((a, b) => a + b, 0) / observed.length : 0;
  return { values, filledIdx, mean };
}
