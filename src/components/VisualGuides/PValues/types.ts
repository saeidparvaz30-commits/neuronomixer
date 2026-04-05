export type TestType = "one-tailed" | "two-tailed";

// ── Gaussian random (Box-Muller) ─────────────────────────────────────────────
export function gaussRand(mu = 0, sigma = 1): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mu + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function stdDev(arr: number[]): number {
  const m = mean(arr);
  const n = arr.length;
  return Math.sqrt(arr.reduce((a, v) => a + (v - m) ** 2, 0) / (n - 1));
}

// ── Unpaired t-statistic ─────────────────────────────────────────────────────
export function computeTStat(a: number[], b: number[]): number {
  const ma = mean(a), mb = mean(b);
  const sa = stdDev(a), sb = stdDev(b);
  const n = a.length;
  const pooled = Math.sqrt(((n - 1) * sa ** 2 + (n - 1) * sb ** 2) / (2 * n - 2));
  if (pooled === 0) return 0;
  return (ma - mb) / (pooled * Math.sqrt(2 / n));
}

// ── t-distribution (lgamma + betai + betacf) ─────────────────────────────────
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
  const MAXIT = 200, EPS = 3e-7, FPMIN = 1e-30;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d; let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; d = 1 / d;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; d = 1 / d;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return bt * betacf(a, b, x) / a;
  return 1 - bt * betacf(b, a, 1 - x) / b;
}

export function tCDF(t: number, df: number): number {
  const x = df / (df + t * t);
  const ib = betai(df / 2, 0.5, x);
  return t >= 0 ? 1 - ib / 2 : ib / 2;
}

export function tPDF(t: number, df: number): number {
  return Math.exp(lgamma((df + 1) / 2) - lgamma(df / 2)) /
    (Math.sqrt(df * Math.PI) * Math.pow(1 + t * t / df, (df + 1) / 2));
}

export function computePValue(tStat: number, df: number, testType: TestType): number {
  const p = 1 - tCDF(Math.abs(tStat), df);
  return testType === "two-tailed" ? Math.min(2 * p, 1) : p;
}

export function generateGroups(effectSize: number, n: number): [number[], number[]] {
  const a = Array.from({ length: n }, () => gaussRand(100, 15));
  const b = Array.from({ length: n }, () => gaussRand(100 + effectSize * 10, 15));
  return [a, b];
}

export function runPermutation(a: number[], b: number[]): number {
  const combined = [...a, ...b];
  const n = a.length;
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }
  return computeTStat(combined.slice(0, n), combined.slice(n));
}

// Critical value for a given alpha and df (two-tailed)
export function criticalValue(alpha: number, df: number): number {
  // Binary search for t such that 2*(1-tCDF(t,df)) = alpha
  let lo = 0, hi = 10;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (2 * (1 - tCDF(mid, df)) < alpha) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}
