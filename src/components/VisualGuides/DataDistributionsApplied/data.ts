// Seeded datasets + statistics for the Data Distributions in Context guide.
// Everything here is deterministic (mulberry32 with literal seeds) so the
// server and client render identical data, and every displayed number is
// recomputable from these arrays.

export type ShapeId =
  | "right-skewed"
  | "heavy-tailed"
  | "bimodal"
  | "sentinel"
  | "zero-inflated";

export type DatasetId =
  | "transactions"
  | "response"
  | "heights"
  | "sensor"
  | "returns";

export interface DatasetGroup {
  name: string;
  values: number[];
}

export interface Dataset {
  id: DatasetId;
  tabLabel: string;
  columnName: string;
  story: string;
  unitSuffix: string;
  values: number[];
  groups?: DatasetGroup[];
  logSupported: boolean;
  logDisabledReason?: string;
  sentinel?: number;
  shape: ShapeId;
  shapeLabel: string;
  fmt: (v: number) => string;
}

// ── Seeded PRNG ───────────────────────────────────────────────────────────────

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function poisson(lambda: number, rand: () => number): number {
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= rand();
  } while (p > limit);
  return k - 1;
}

const N = 400;

// ── Dataset generators (module scope, run once, fully deterministic) ─────────

function makeTransactions(): number[] {
  const rand = mulberry32(20260701);
  const out: number[] = [];
  for (let i = 0; i < N; i++) {
    const v = Math.exp(3.6 + 0.9 * gaussian(rand));
    out.push(Math.round(v * 100) / 100);
  }
  return out;
}

function makeResponseTimes(): number[] {
  const rand = mulberry32(20260702);
  const out: number[] = [];
  for (let i = 0; i < N; i++) {
    const slowPath = rand() < 0.1;
    const v = slowPath
      ? Math.exp(6.6 + 0.7 * gaussian(rand))
      : Math.exp(4.7 + 0.35 * gaussian(rand));
    out.push(Math.max(1, Math.round(v)));
  }
  return out;
}

function makeHeights(): { values: number[]; groups: DatasetGroup[] } {
  const rand = mulberry32(20260703);
  const squadA: number[] = [];
  const squadB: number[] = [];
  for (let i = 0; i < 220; i++) {
    squadA.push(Math.round((165.5 + 5.5 * gaussian(rand)) * 10) / 10);
  }
  for (let i = 0; i < 180; i++) {
    squadB.push(Math.round((184.0 + 6.0 * gaussian(rand)) * 10) / 10);
  }
  return {
    values: [...squadA, ...squadB],
    groups: [
      { name: "Women's squad", values: squadA },
      { name: "Men's squad", values: squadB },
    ],
  };
}

export const SENTINEL_VALUE = -999;

function makeSensor(): number[] {
  const rand = mulberry32(20260704);
  const out: number[] = [];
  for (let i = 0; i < N; i++) {
    const failedRead = rand() < 0.07;
    const v = Math.round((21.6 + 1.1 * gaussian(rand)) * 10) / 10;
    out.push(failedRead ? SENTINEL_VALUE : v);
  }
  return out;
}

function makeReturns(): number[] {
  const rand = mulberry32(20260705);
  const out: number[] = [];
  for (let i = 0; i < N; i++) {
    const structuralZero = rand() < 0.58;
    out.push(structuralZero ? 0 : poisson(3.2, rand));
  }
  return out;
}

const HEIGHTS = makeHeights();

const fmtDollars = (v: number) =>
  `$${v.toLocaleString("en-US", { maximumFractionDigits: v < 10 ? 2 : 0 })}`;
const fmtMs = (v: number) => `${Math.round(v).toLocaleString("en-US")} ms`;
const fmtCm = (v: number) => `${v.toFixed(1)} cm`;
const fmtDegC = (v: number) => `${v.toFixed(1)} C`;
const fmtCount = (v: number) => `${Math.round(v)}`;

export const DATASETS: Dataset[] = [
  {
    id: "transactions",
    tabLabel: "Transactions",
    columnName: "order_amount",
    story:
      "One month of e-commerce order values. Most orders are small; a minority are large.",
    unitSuffix: "USD",
    values: makeTransactions(),
    logSupported: true,
    shape: "right-skewed",
    shapeLabel: "Right-skewed",
    fmt: fmtDollars,
  },
  {
    id: "response",
    tabLabel: "Response times",
    columnName: "api_latency_ms",
    story:
      "API response times. A fast common path plus a slow path of retries and cold caches.",
    unitSuffix: "ms",
    values: makeResponseTimes(),
    logSupported: true,
    shape: "heavy-tailed",
    shapeLabel: "Heavy-tailed",
    fmt: fmtMs,
  },
  {
    id: "heights",
    tabLabel: "Heights",
    columnName: "player_height_cm",
    story:
      "Heights of every player in a mixed sports club. One column, but is it one population?",
    unitSuffix: "cm",
    values: HEIGHTS.values,
    groups: HEIGHTS.groups,
    logSupported: false,
    logDisabledReason: "log scale adds nothing here: the data spans one order of magnitude",
    shape: "bimodal",
    shapeLabel: "Bimodal",
    fmt: fmtCm,
  },
  {
    id: "sensor",
    tabLabel: "Sensor readings",
    columnName: "room_temp_c",
    story:
      "Temperature readings from an IoT sensor. The device writes -999 when a read fails.",
    unitSuffix: "C",
    values: makeSensor(),
    logSupported: false,
    logDisabledReason: "log scale is undefined for the negative sentinel values",
    sentinel: SENTINEL_VALUE,
    shape: "sentinel",
    shapeLabel: "Sentinel spike",
    fmt: fmtDegC,
  },
  {
    id: "returns",
    tabLabel: "Daily returns",
    columnName: "returns_per_customer",
    story:
      "Product returns filed per customer this month. Most customers return nothing at all.",
    unitSuffix: "returns",
    values: makeReturns(),
    logSupported: false,
    logDisabledReason: "log scale is undefined at zero, and zero is the whole story here",
    shape: "zero-inflated",
    shapeLabel: "Zero-inflated",
    fmt: fmtCount,
  },
];

export const SHAPE_OPTIONS: { id: ShapeId; label: string }[] = [
  { id: "right-skewed", label: "Right-skewed" },
  { id: "heavy-tailed", label: "Heavy-tailed" },
  { id: "bimodal", label: "Bimodal" },
  { id: "sentinel", label: "Sentinel spike" },
  { id: "zero-inflated", label: "Zero-inflated" },
];

// ── Statistics ────────────────────────────────────────────────────────────────

export function mean(xs: number[]): number {
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

export function median(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function quantile(xs: number[], q: number): number {
  const sorted = [...xs].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** Population moment coefficient of skewness: m3 / m2^1.5 */
export function skewness(xs: number[]): number {
  const m = mean(xs);
  let m2 = 0;
  let m3 = 0;
  for (const x of xs) {
    const d = x - m;
    m2 += d * d;
    m3 += d * d * d;
  }
  m2 /= xs.length;
  m3 /= xs.length;
  if (m2 <= 0) return 0;
  return m3 / Math.pow(m2, 1.5);
}

export interface HistBin {
  x0: number;
  x1: number;
  count: number;
}

/** Uniform-width histogram over [min, max] of the (optionally transformed) values. */
export function histogram(
  values: number[],
  binCount: number,
  transform?: (v: number) => number
): { bins: HistBin[]; min: number; max: number } {
  const t = transform ?? ((v: number) => v);
  const tv = values.map(t);
  let min = Infinity;
  let max = -Infinity;
  for (const v of tv) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!isFinite(min) || !isFinite(max)) return { bins: [], min: 0, max: 1 };
  if (min === max) {
    min -= 0.5;
    max += 0.5;
  }
  const width = (max - min) / binCount;
  const bins: HistBin[] = Array.from({ length: binCount }, (_, i) => ({
    x0: min + i * width,
    x1: min + (i + 1) * width,
    count: 0,
  }));
  for (const v of tv) {
    let idx = Math.floor((v - min) / width);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx].count += 1;
  }
  return { bins, min, max };
}

// ── Diagnosis (all numbers derived from the arrays above) ────────────────────

export interface Diagnosis {
  mean: number;
  median: number;
  /** (mean / median - 1) * 100; NaN-safe only for the datasets used here */
  divergencePct: number;
  skew: number;
  // transactions
  logSkew?: number;
  // response
  p95?: number;
  p99?: number;
  fracAboveMeanPct?: number;
  // heights
  groupMeans?: { name: string; mean: number }[];
  pctNearOverall?: number;
  pctNearGroup?: number;
  // sensor
  meanClean?: number;
  medianClean?: number;
  sentinelCount?: number;
  // returns
  zeroSharePct?: number;
  meanNonzero?: number;
  predictedZeroSharePct?: number;
}

export function computeDiagnosis(ds: Dataset): Diagnosis {
  const m = mean(ds.values);
  const med = median(ds.values);
  const base: Diagnosis = {
    mean: m,
    median: med,
    divergencePct: med !== 0 ? (m / med - 1) * 100 : 0,
    skew: skewness(ds.values),
  };

  if (ds.id === "transactions") {
    base.logSkew = skewness(ds.values.map((v) => Math.log10(v)));
  }

  if (ds.id === "response") {
    base.p95 = quantile(ds.values, 0.95);
    base.p99 = quantile(ds.values, 0.99);
    base.fracAboveMeanPct =
      (ds.values.filter((v) => v > m).length / ds.values.length) * 100;
  }

  if (ds.id === "heights" && ds.groups) {
    const TOL = 3; // cm
    base.groupMeans = ds.groups.map((g) => ({ name: g.name, mean: mean(g.values) }));
    base.pctNearOverall =
      (ds.values.filter((v) => Math.abs(v - m) <= TOL).length / ds.values.length) * 100;
    let near = 0;
    let total = 0;
    for (const g of ds.groups) {
      const gm = mean(g.values);
      near += g.values.filter((v) => Math.abs(v - gm) <= TOL).length;
      total += g.values.length;
    }
    base.pctNearGroup = (near / total) * 100;
  }

  if (ds.id === "sensor") {
    const clean = ds.values.filter((v) => v !== SENTINEL_VALUE);
    base.meanClean = mean(clean);
    base.medianClean = median(clean);
    base.sentinelCount = ds.values.length - clean.length;
  }

  if (ds.id === "returns") {
    const zeros = ds.values.filter((v) => v === 0).length;
    const nonzero = ds.values.filter((v) => v > 0);
    base.zeroSharePct = (zeros / ds.values.length) * 100;
    base.meanNonzero = nonzero.length > 0 ? mean(nonzero) : 0;
    base.predictedZeroSharePct = Math.exp(-m) * 100;
  }

  return base;
}

// ── Shape-matching quiz (fresh seeded columns, distinct from the gallery) ────

export interface QuizItem {
  id: string;
  title: string;
  values: number[];
  correct: ShapeId;
  explanation: string;
}

function makeQuizBimodal(): number[] {
  const rand = mulberry32(55501);
  const out: number[] = [];
  for (let i = 0; i < 200; i++) out.push(Math.round((52 + 5 * gaussian(rand)) * 10) / 10);
  for (let i = 0; i < 200; i++) out.push(Math.round((78 + 6 * gaussian(rand)) * 10) / 10);
  return out;
}

function makeQuizSentinel(): number[] {
  const rand = mulberry32(55502);
  const out: number[] = [];
  for (let i = 0; i < 400; i++) {
    const bad = rand() < 0.07;
    const v = Math.round((48 + 6 * gaussian(rand)) * 10) / 10;
    out.push(bad ? -99 : v);
  }
  return out;
}

function makeQuizZeroInflated(): number[] {
  const rand = mulberry32(55503);
  const out: number[] = [];
  for (let i = 0; i < 400; i++) {
    out.push(rand() < 0.65 ? 0 : poisson(5, rand));
  }
  return out;
}

function makeQuizSkewed(): number[] {
  const rand = mulberry32(55504);
  const out: number[] = [];
  for (let i = 0; i < 400; i++) {
    out.push(Math.round(Math.exp(3.0 + 0.6 * gaussian(rand)) * 10) / 10);
  }
  return out;
}

export const QUIZ_ITEMS: QuizItem[] = [
  {
    id: "q1",
    title: "Mystery column 1",
    values: makeQuizBimodal(),
    correct: "bimodal",
    explanation:
      "Two clear peaks with a valley between them. One column, two populations. Find the hidden grouping variable before you model anything.",
  },
  {
    id: "q2",
    title: "Mystery column 2",
    values: makeQuizSentinel(),
    correct: "sentinel",
    explanation:
      "The isolated bar far below the bulk is a single repeated code, not a tail. A real tail thins out gradually; a sentinel is one exact value repeated many times.",
  },
  {
    id: "q3",
    title: "Mystery column 3",
    values: makeQuizZeroInflated(),
    correct: "zero-inflated",
    explanation:
      "A towering spike at exactly zero next to a modest count distribution. The zeros come from a separate never-does-this population, not from the count process.",
  },
  {
    id: "q4",
    title: "Mystery column 4",
    values: makeQuizSkewed(),
    correct: "right-skewed",
    explanation:
      "A long right tail that thins smoothly, with no extreme isolated outliers. Right-skewed, and a log scale would make it roughly symmetric. Heavy tails would put far more mass at extreme values.",
  },
];
