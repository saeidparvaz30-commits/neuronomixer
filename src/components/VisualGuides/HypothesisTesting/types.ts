// ── Math helpers ──────────────────────────────────────────────────────────────
export function gaussRand(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function stdDev(arr: number[]): number {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1));
}

// Welch's t-test (unequal variances)
export function computeTStat(a: number[], b: number[]): number {
  const ma = mean(a), mb = mean(b);
  const sa = stdDev(a), sb = stdDev(b);
  const na = a.length, nb = b.length;
  const se = Math.sqrt(sa ** 2 / na + sb ** 2 / nb);
  return se === 0 ? 0 : (ma - mb) / se;
}

// lgamma for p-value
function lgamma(x: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

function betacf(a: number, b: number, x: number): number {
  const MAXIT = 100, EPS = 3e-7;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d; let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d; const delta = d * c; h *= delta;
    if (Math.abs(delta - 1) < EPS) break;
  }
  return h;
}

function betai(a: number, b: number, x: number): number {
  if (x < 0 || x > 1) return 0;
  if (x === 0 || x === 1) return x;
  const lbeta = lgamma(a) + lgamma(b) - lgamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;
  if (x < (a + 1) / (a + b + 2)) return front * betacf(a, b, x);
  return 1 - (Math.exp(Math.log(1 - x) * b + Math.log(x) * a - lbeta) / b) * betacf(b, a, 1 - x);
}

// Welch–Satterthwaite degrees of freedom
function welchDf(a: number[], b: number[]): number {
  const sa = stdDev(a), sb = stdDev(b), na = a.length, nb = b.length;
  const va = sa ** 2 / na, vb = sb ** 2 / nb;
  return (va + vb) ** 2 / (va ** 2 / (na - 1) + vb ** 2 / (nb - 1));
}

export function computePValue(a: number[], b: number[]): number {
  const t = Math.abs(computeTStat(a, b));
  const df = welchDf(a, b);
  const x = df / (df + t * t);
  return betai(df / 2, 0.5, x); // two-tailed
}

// ── Sample generation ─────────────────────────────────────────────────────────
export interface GroupConfig {
  n: number;
  mean: number;
  std: number;
}

export function generateGroup(cfg: GroupConfig): number[] {
  return Array.from({ length: cfg.n }, () => cfg.mean + gaussRand() * cfg.std);
}

// ── Simulation ────────────────────────────────────────────────────────────────
export interface SimResult {
  pValue: number;
  rejected: boolean;
}

export function runSimulation(
  controlCfg: GroupConfig,
  treatmentCfg: GroupConfig,
  alpha: number,
  runs: number
): SimResult[] {
  return Array.from({ length: runs }, () => {
    const ctrl = generateGroup(controlCfg);
    const treat = generateGroup(treatmentCfg);
    const p = computePValue(ctrl, treat);
    return { pValue: p, rejected: p < alpha };
  });
}

// Null hypothesis: same mean
export function runNullSimulation(
  n: number,
  std: number,
  alpha: number,
  runs: number
): SimResult[] {
  return Array.from({ length: runs }, () => {
    const ctrl = generateGroup({ n, mean: 0, std });
    const treat = generateGroup({ n, mean: 0, std });
    const p = computePValue(ctrl, treat);
    return { pValue: p, rejected: p < alpha };
  });
}

export function computeHistogram(values: number[], bins: number): { x: number; count: number }[] {
  const min = Math.min(...values), max = Math.max(...values);
  const w = (max - min) / bins || 1;
  const counts = Array.from({ length: bins }, () => 0);
  for (const v of values) {
    const i = Math.min(Math.floor((v - min) / w), bins - 1);
    counts[i]++;
  }
  return counts.map((count, i) => ({ x: min + (i + 0.5) * w, count }));
}
