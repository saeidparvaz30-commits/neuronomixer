/**
 * Pure math module for the "Monitoring and Drift for LLM Apps" guide.
 * No React imports. Every displayed number in the guide (simulated traffic,
 * CUSUM statistics, detection delays, false-alarm rates, tradeoff curve)
 * is computed by the functions in this file, so a verifier can recompute
 * them by executing this module with node/tsx.
 */

// ── Simulation constants ─────────────────────────────────────────────────────

/** Simulated window length: 120 hourly traffic buckets (5 days). */
export const T = 120;

/** First hours assumed in-control; the detector estimates its baseline here. */
export const BASELINE_WINDOW = 30;

/** The injected regression ramps to full magnitude over this many hours. */
export const RAMP_HOURS = 8;

export type MetricKey = "judge" | "refusal" | "latency" | "tokens";

export const METRIC_KEYS: readonly MetricKey[] = [
  "judge",
  "refusal",
  "latency",
  "tokens",
];

export interface Baseline {
  mean: number;
  sd: number;
}

/**
 * In-control behavior of the simulated app. These are simulation parameters
 * of a fictional LLM application, not vendor figures.
 */
export const BASELINES: Record<MetricKey, Baseline> = {
  judge: { mean: 0.86, sd: 0.03 },
  refusal: { mean: 0.04, sd: 0.012 },
  latency: { mean: 1800, sd: 140 },
  tokens: { mean: 620, sd: 45 },
};

/** Full-magnitude effect of input drift (severity 1) on each metric. */
export const DRIFT_EFFECT: Record<MetricKey, number> = {
  judge: 0,
  refusal: 0.06,
  latency: 450,
  tokens: 160,
};

/** Direction of degradation to monitor: judge score falls, the rest rise. */
export const MONITOR_DIRECTION: Record<MetricKey, 1 | -1> = {
  judge: -1,
  refusal: 1,
  latency: 1,
  tokens: 1,
};

export interface Scenario {
  /** Hour the regression starts. Must be greater than BASELINE_WINDOW. */
  onset: number;
  /** Judge-score drop at full ramp (0 to 0.15). */
  qualityDrop: number;
  /** Input-drift severity multiplier (0 to 1). */
  driftSeverity: number;
}

export const DEFAULT_SCENARIO: Scenario = {
  onset: 70,
  qualityDrop: 0,
  driftSeverity: 0,
};

// ── Seeded PRNG (deterministic, hydration-safe) ─────────────────────────────

/** mulberry32: fast deterministic PRNG over [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One standard-normal draw via Box-Muller. */
export function randNormal(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// ── Traffic simulation ───────────────────────────────────────────────────────

/** Regression intensity at hour t: 0 before onset, linear ramp, then 1. */
export function rampAt(t: number, onset: number): number {
  if (t < onset) return 0;
  return Math.min(1, (t - onset + 1) / RAMP_HOURS);
}

export type Series = Record<MetricKey, number[]>;

/**
 * Simulate T hourly buckets of production traffic. Before `scenario.onset`
 * every metric fluctuates around its baseline; after onset the regression
 * ramps in: `qualityDrop` pulls the judge score down, `driftSeverity`
 * pushes refusal rate, latency, and token spend up.
 */
export function simulateTraffic(scenario: Scenario, seed: number): Series {
  const rng = mulberry32(seed);
  const out: Series = { judge: [], refusal: [], latency: [], tokens: [] };
  for (let t = 0; t < T; t++) {
    const r = rampAt(t, scenario.onset);
    for (const key of METRIC_KEYS) {
      const b = BASELINES[key];
      const shift =
        key === "judge"
          ? -scenario.qualityDrop * r
          : DRIFT_EFFECT[key] * scenario.driftSeverity * r;
      let v = b.mean + shift + randNormal(rng) * b.sd;
      if (key === "judge" || key === "refusal") v = clamp(v, 0, 1);
      if (key === "latency") v = Math.max(v, 200);
      if (key === "tokens") v = Math.max(v, 50);
      out[key].push(v);
    }
  }
  return out;
}

// ── CUSUM detector ───────────────────────────────────────────────────────────

export interface CusumRun {
  /** S_t per hour. Zero during the baseline window (no monitoring there). */
  stat: number[];
  /** Hours where S_t crossed h. The statistic resets to 0 after each alarm. */
  alarms: number[];
  /** Baseline mean estimated from the first BASELINE_WINDOW hours. */
  mu0: number;
  /** Baseline standard deviation from the same window (sample sd). */
  sigma0: number;
}

/**
 * One-sided tabular CUSUM. Standardizes each observation against the
 * baseline estimated from the first BASELINE_WINDOW hours, accumulates
 * deviations beyond the slack k in the degradation direction, and raises
 * an alarm when the cumulative sum exceeds the threshold h.
 *
 *   z_t = direction * (x_t - mu0) / sigma0
 *   S_t = max(0, S_{t-1} + z_t - k)
 *   alarm when S_t > h, then S_t resets to 0
 */
export function runCusum(
  values: readonly number[],
  direction: 1 | -1,
  h: number,
  k: number
): CusumRun {
  const ref = values.slice(0, BASELINE_WINDOW);
  const mu0 = ref.reduce((a, b) => a + b, 0) / ref.length;
  const variance =
    ref.reduce((a, b) => a + (b - mu0) * (b - mu0), 0) / (ref.length - 1);
  const sigma0 = Math.max(Math.sqrt(variance), 1e-9);

  const stat: number[] = [];
  const alarms: number[] = [];
  let s = 0;
  for (let t = 0; t < values.length; t++) {
    if (t < BASELINE_WINDOW) {
      stat.push(0);
      continue;
    }
    const z = (direction * (values[t] - mu0)) / sigma0;
    s = Math.max(0, s + z - k);
    stat.push(s);
    if (s > h) {
      alarms.push(t);
      s = 0;
    }
  }
  return { stat, alarms, mu0, sigma0 };
}

export interface DetectionStats {
  /** Alarms strictly before the regression onset: false alarms. */
  falseAlarms: number[];
  /** First alarm at or after onset, if any. */
  detectionHour: number | null;
  /** detectionHour minus onset, if detected. */
  detectionDelay: number | null;
}

export function detectionStats(
  alarms: readonly number[],
  onset: number
): DetectionStats {
  const falseAlarms = alarms.filter((a) => a < onset);
  const hit = alarms.find((a) => a >= onset);
  return {
    falseAlarms,
    detectionHour: hit === undefined ? null : hit,
    detectionDelay: hit === undefined ? null : hit - onset,
  };
}

// ── Honest alarm classification for the live panel ──────────────────────────

/**
 * Whether the injected scenario actually shifts the given metric. The judge
 * score only moves when a quality drop is injected; refusal rate, latency,
 * and token spend only move with input drift (DRIFT_EFFECT.judge is 0).
 */
export function metricShifted(scenario: Scenario, metric: MetricKey): boolean {
  if (metric === "judge") return scenario.qualityDrop > 0;
  return scenario.driftSeverity > 0 && DRIFT_EFFECT[metric] > 0;
}

/**
 * Classify alarms against what was really injected. An alarm is a genuine
 * detection only if it fires at or after the onset AND the scenario actually
 * shifts the monitored metric. When the metric is untouched by the scenario
 * (including no injection at all), every alarm is false, even ones that
 * happen to land after the onset hour.
 */
export function classifyAlarms(
  alarms: readonly number[],
  scenario: Scenario,
  metric: MetricKey
): DetectionStats {
  if (!metricShifted(scenario, metric)) {
    return {
      falseAlarms: [...alarms],
      detectionHour: null,
      detectionDelay: null,
    };
  }
  return detectionStats(alarms, scenario.onset);
}

// ── Threshold sweep: detection delay vs false-alarm rate ────────────────────

/** Thresholds swept for the tradeoff curve. */
export const H_GRID: readonly number[] = Array.from(
  { length: 24 },
  (_, i) => 0.5 + i * 0.5
);

/** Monte Carlo replications per threshold. */
export const SWEEP_RUNS = 40;

export interface SweepPoint {
  h: number;
  /** P(at least one alarm) in a T-hour in-control run (no regression). */
  falseAlarmProb: number;
  /** Fraction of regression runs with an alarm at or after onset. */
  detectRate: number;
  /** Mean detection delay in hours over detected runs, null if none. */
  meanDelay: number | null;
}

/**
 * Sweep the alarm threshold h and measure, by Monte Carlo, the tradeoff
 * between detection delay and false alarms. Each replication is PAIRED:
 * the in-control run and the regression run share the same seed, so they
 * differ only by the injected regression, not by luck.
 */
export function sweepThresholds(
  scenario: Scenario,
  metric: MetricKey,
  k: number,
  baseSeed: number,
  runs: number = SWEEP_RUNS,
  grid: readonly number[] = H_GRID
): SweepPoint[] {
  const direction = MONITOR_DIRECTION[metric];
  const quiet: Scenario = { ...scenario, qualityDrop: 0, driftSeverity: 0 };

  const regSeries: number[][] = [];
  const quietSeries: number[][] = [];
  for (let m = 0; m < runs; m++) {
    const seed = baseSeed + 7919 * (m + 1);
    regSeries.push(simulateTraffic(scenario, seed)[metric]);
    quietSeries.push(simulateTraffic(quiet, seed)[metric]);
  }

  return grid.map((h) => {
    let fa = 0;
    let detected = 0;
    let delaySum = 0;
    for (let m = 0; m < runs; m++) {
      const q = runCusum(quietSeries[m], direction, h, k);
      if (q.alarms.length > 0) fa++;
      const r = runCusum(regSeries[m], direction, h, k);
      const ds = detectionStats(r.alarms, scenario.onset);
      if (ds.detectionDelay !== null) {
        detected++;
        delaySum += ds.detectionDelay;
      }
    }
    return {
      h,
      falseAlarmProb: fa / runs,
      detectRate: detected / runs,
      meanDelay: detected > 0 ? delaySum / detected : null,
    };
  });
}
