// Mystery dataset + statistics helpers for the EDA Workflow guide.
// The dataset is generated ONCE at module load with a seeded PRNG (mulberry32),
// so it is identical on the server and the client (hydration-safe) and identical
// on every visit. Four issues are planted deliberately; see PLANTED constants.

export const SEED = 941;
export const SENTINEL = -999;

export type ColKey =
  | "reading_id"
  | "zone"
  | "temp_c"
  | "humidity_pct"
  | "voc_ppb"
  | "battery_v";

export type NumKey = "temp_c" | "humidity_pct" | "voc_ppb" | "battery_v";

export const NUM_KEYS: NumKey[] = ["temp_c", "humidity_pct", "voc_ppb", "battery_v"];
export const ALL_KEYS: ColKey[] = [
  "reading_id",
  "zone",
  "temp_c",
  "humidity_pct",
  "voc_ppb",
  "battery_v",
];

export interface Row {
  reading_id: string;
  zone: string;
  temp_c: number | null;
  humidity_pct: number | null;
  voc_ppb: number | null;
  battery_v: number | null;
}

export const VALID_ZONES = ["north", "south", "east", "west"];
export const BAD_ZONE = "Sout";

// Planted issue locations (base-array indices, before the duplicate batch is inserted)
const MISLABEL_INDEX = 23; // zone becomes "Sout"
const TEMP_NULL_INDICES = [10, 33, 71, 95]; // genuine missing values
const SENTINEL_INDICES = [5, 28, 52, 66, 84, 101]; // humidity becomes -999
const DUP_START = 40; // base rows 40..47 (ids R-041..R-048) are duplicated
const DUP_LEN = 8;
const DUP_INSERT_AT = 88; // copies inserted after base index 87

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildRows(): Row[] {
  const rand = mulberry32(SEED);
  const gauss = () => {
    const u = Math.max(rand(), 1e-12);
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  const base: Row[] = [];
  for (let i = 0; i < 112; i++) {
    const temp = 21 + 1.8 * gauss();
    const humidity = Math.min(75, Math.max(20, 46 + 6 * gauss()));
    const voc = Math.round(Math.exp(6.05 + 0.7 * gauss())); // lognormal: right-skewed
    const battery = 4.05 - 0.04 * (temp - 21) + 0.07 * gauss(); // correlated with temp
    base.push({
      reading_id: `R-${String(i + 1).padStart(3, "0")}`,
      zone: VALID_ZONES[Math.floor(rand() * VALID_ZONES.length) % VALID_ZONES.length],
      temp_c: Math.round(temp * 10) / 10,
      humidity_pct: Math.round(humidity * 10) / 10,
      voc_ppb: voc,
      battery_v: Math.round(battery * 100) / 100,
    });
  }

  // Plant the four issues (indices chosen to avoid the duplicated batch 40..47,
  // so each issue has an exact, stable count).
  base[MISLABEL_INDEX] = { ...base[MISLABEL_INDEX], zone: BAD_ZONE };
  for (const i of TEMP_NULL_INDICES) base[i] = { ...base[i], temp_c: null };
  for (const i of SENTINEL_INDICES) base[i] = { ...base[i], humidity_pct: SENTINEL };

  const dupBatch = base.slice(DUP_START, DUP_START + DUP_LEN).map((r) => ({ ...r }));
  return [...base.slice(0, DUP_INSERT_AT), ...dupBatch, ...base.slice(DUP_INSERT_AT)];
}

/** The full 120-row mystery dataset. Never mutated. */
export const ROWS: ReadonlyArray<Row> = buildRows();

// ── Missingness ──────────────────────────────────────────────────────────────

export function isMissing(row: Row, key: ColKey, sentinelOn: boolean): boolean {
  const v = row[key];
  if (v === null) return true;
  return sentinelOn && typeof v === "number" && v === SENTINEL;
}

export function missingCount(
  rows: ReadonlyArray<Row>,
  key: ColKey,
  sentinelOn: boolean
): number {
  let n = 0;
  for (const r of rows) if (isMissing(r, key, sentinelOn)) n++;
  return n;
}

/** Count of raw SENTINEL values across all numeric columns (planted: 6, all in humidity). */
export function sentinelCount(rows: ReadonlyArray<Row>): number {
  let n = 0;
  for (const r of rows) {
    for (const k of NUM_KEYS) if (r[k] === SENTINEL) n++;
  }
  return n;
}

export function numericValues(
  rows: ReadonlyArray<Row>,
  key: NumKey,
  sentinelOn: boolean
): number[] {
  const out: number[] = [];
  for (const r of rows) {
    const v = r[key];
    if (v === null) continue;
    if (sentinelOn && v === SENTINEL) continue;
    out.push(v);
  }
  return out;
}

// ── Descriptive statistics ───────────────────────────────────────────────────

export function mean(xs: number[]): number {
  if (xs.length === 0) return NaN;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

export function stdev(xs: number[]): number {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  let s = 0;
  for (const x of xs) s += (x - m) * (x - m);
  return Math.sqrt(s / (xs.length - 1));
}

/** Moment coefficient of skewness g1 = m3 / m2^(3/2). */
export function skewness(xs: number[]): number {
  const n = xs.length;
  if (n < 3) return NaN;
  const m = mean(xs);
  let m2 = 0;
  let m3 = 0;
  for (const x of xs) {
    const d = x - m;
    m2 += d * d;
    m3 += d * d * d;
  }
  m2 /= n;
  m3 /= n;
  if (m2 === 0) return 0;
  return m3 / Math.pow(m2, 1.5);
}

export function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return NaN;
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return NaN;
  return sxy / Math.sqrt(sxx * syy);
}

/** Pairwise-complete Pearson correlation between two numeric columns. */
export function pearsonPair(
  rows: ReadonlyArray<Row>,
  a: NumKey,
  b: NumKey,
  sentinelOn: boolean
): { r: number; n: number } {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const row of rows) {
    if (isMissing(row, a, sentinelOn) || isMissing(row, b, sentinelOn)) continue;
    xs.push(row[a] as number);
    ys.push(row[b] as number);
  }
  return { r: pearson(xs, ys), n: xs.length };
}

// ── Histograms ───────────────────────────────────────────────────────────────

export interface Hist {
  edges: number[]; // length bins + 1
  counts: number[]; // length bins
  maxCount: number;
  n: number;
}

export function histogram(values: number[], bins: number): Hist {
  if (values.length === 0) {
    return { edges: [0, 1], counts: [0], maxCount: 0, n: 0 };
  }
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (lo === hi) {
    lo -= 0.5;
    hi += 0.5;
  }
  const width = (hi - lo) / bins;
  const counts = new Array<number>(bins).fill(0);
  for (const v of values) {
    let idx = Math.floor((v - lo) / width);
    if (idx >= bins) idx = bins - 1;
    if (idx < 0) idx = 0;
    counts[idx]++;
  }
  const edges: number[] = [];
  for (let i = 0; i <= bins; i++) edges.push(lo + i * width);
  return { edges, counts, maxCount: Math.max(...counts), n: values.length };
}

// ── Duplicates ───────────────────────────────────────────────────────────────

export interface DupEntry {
  id: string;
  firstRow: number; // 1-indexed position of the first occurrence
  dupRow: number; // 1-indexed position of the re-appearance
}

export interface DupInfo {
  count: number;
  entries: DupEntry[];
}

/** Exact-duplicate scan: a row counts as a duplicate if its full serialized
 *  content (every column, including the id) already appeared earlier. */
export function exactDuplicates(rows: ReadonlyArray<Row>): DupInfo {
  const seen = new Map<string, number>();
  const entries: DupEntry[] = [];
  rows.forEach((r, i) => {
    const key = JSON.stringify([
      r.reading_id,
      r.zone,
      r.temp_c,
      r.humidity_pct,
      r.voc_ppb,
      r.battery_v,
    ]);
    const first = seen.get(key);
    if (first === undefined) {
      seen.set(key, i);
    } else {
      entries.push({ id: r.reading_id, firstRow: first + 1, dupRow: i + 1 });
    }
  });
  return { count: entries.length, entries };
}

// ── Column summaries ─────────────────────────────────────────────────────────

export interface ValueCount {
  value: string;
  count: number;
}

export function valueCounts(rows: ReadonlyArray<Row>, key: ColKey): ValueCount[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const v = r[key];
    if (v === null) continue;
    const s = String(v);
    map.set(s, (map.get(s) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

export interface ColSummary {
  key: ColKey;
  dtype: "number" | "string";
  nonNull: number;
  unique: number;
}

export function summarizeColumns(rows: ReadonlyArray<Row>): ColSummary[] {
  return ALL_KEYS.map((key) => {
    const values = new Set<string>();
    let nonNull = 0;
    let dtype: "number" | "string" = "string";
    for (const r of rows) {
      const v = r[key];
      if (v === null) continue;
      nonNull++;
      if (typeof v === "number") dtype = "number";
      values.add(String(v));
    }
    return { key, dtype, nonNull, unique: values.size };
  });
}
