// Pure deterministic math for the Diffusion Models guide.
// No React, no side effects, no Math.random: every value is seeded and
// reproducible so server and client render identical output.

/** Number of diffusion timesteps. t runs from 0 (clean data) to T (pure noise). */
export const T = 50;

/** Number of points in the 2D spiral point cloud. */
export const NUM_POINTS = 300;

export type ScheduleId = "cosine" | "linear";

export interface Point2D {
  x: number;
  y: number;
}

export const SCHEDULE_META: Record<ScheduleId, { label: string; color: string }> = {
  cosine: { label: "Cosine", color: "#3bb4a4" },
  linear: { label: "Linear", color: "#a855f7" },
};

// ── Deterministic PRNG (SPEC v2 LCG constants) ───────────────────────────────

function lcgNext(state: number): number {
  // (2^32 - 1) * 1664525 < 2^53, so the multiply is exact in doubles.
  return (state * 1664525 + 1013904223) >>> 0;
}

/** Stateful uniform PRNG in [0, 1), built on the shared LCG constants. */
export function createPrng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = lcgNext(state);
    return state / 0x100000000;
  };
}

/** Deterministic standard normal N(0, 1) samples via Box-Muller. */
export function createGaussian(seed: number): () => number {
  const rand = createPrng(seed);
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const v = spare;
      spare = null;
      return v;
    }
    let u1 = rand();
    while (u1 <= 1e-12) u1 = rand();
    const u2 = rand();
    const mag = Math.sqrt(-2 * Math.log(u1));
    spare = mag * Math.sin(2 * Math.PI * u2);
    return mag * Math.cos(2 * Math.PI * u2);
  };
}

// ── Data: a deterministic 2D spiral, roughly unit scale ──────────────────────

function buildSpiral(): Point2D[] {
  const jitter = createGaussian(20260705);
  const pts: Point2D[] = [];
  for (let i = 0; i < NUM_POINTS; i++) {
    const s = i / (NUM_POINTS - 1);
    const angle = s * 4 * Math.PI; // two full turns
    const radius = 0.25 + 1.55 * s;
    pts.push({
      x: radius * Math.cos(angle) * 0.72 + jitter() * 0.045,
      y: radius * Math.sin(angle) * 0.72 + jitter() * 0.045,
    });
  }
  return pts;
}

function buildEps(): Point2D[] {
  const g = createGaussian(987654321);
  const pts: Point2D[] = [];
  for (let i = 0; i < NUM_POINTS; i++) {
    pts.push({ x: g(), y: g() });
  }
  return pts;
}

/** The clean data x0: a fixed spiral of NUM_POINTS points. */
export const X0: readonly Point2D[] = buildSpiral();

/** One fixed standard-normal eps per point. The same eps at every timestep. */
export const EPS: readonly Point2D[] = buildEps();

// ── Noise schedules: alphaBar_t for t = 0..T ─────────────────────────────────

/**
 * Cosine schedule (Nichol & Dhariwal 2021):
 *   f(t) = cos^2( ((t/T + s) / (1 + s)) * pi/2 ),  s = 0.008
 *   alphaBar_t = f(t) / f(0)
 */
function buildCosineAlphaBar(): number[] {
  const s = 0.008;
  const f = (t: number) =>
    Math.cos((((t / T + s) / (1 + s)) * Math.PI) / 2) ** 2;
  const f0 = f(0);
  return Array.from({ length: T + 1 }, (_, t) => f(t) / f0);
}

/**
 * Linear beta schedule: the DDPM betas (1e-4 to 0.02 over 1000 steps)
 * rescaled to T = 50, i.e. beta_t linearly spaced from 0.002 to 0.4.
 *   alphaBar_t = prod_{i=1..t} (1 - beta_i),  alphaBar_0 = 1
 */
function buildLinearAlphaBar(): number[] {
  const scale = 1000 / T;
  const betaStart = 1e-4 * scale;
  const betaEnd = 0.02 * scale;
  const out: number[] = [1];
  let acc = 1;
  for (let t = 1; t <= T; t++) {
    const beta = betaStart + ((t - 1) / (T - 1)) * (betaEnd - betaStart);
    acc *= 1 - beta;
    out.push(acc);
  }
  return out;
}

/** alphaBar_t lookup per schedule; index by timestep t in [0, T]. */
export const ALPHA_BAR: Record<ScheduleId, readonly number[]> = {
  cosine: buildCosineAlphaBar(),
  linear: buildLinearAlphaBar(),
};

// ── Forward process (exact closed form) ──────────────────────────────────────

/**
 * x_t = sqrt(alphaBar_t) * x0 + sqrt(1 - alphaBar_t) * eps
 * applied per point with its fixed eps. At t = 0 this returns x0 exactly;
 * at t = T it is (numerically) pure noise.
 */
export function forwardPoints(t: number, schedule: ScheduleId): Point2D[] {
  const alphaBar = ALPHA_BAR[schedule][t];
  const a = Math.sqrt(alphaBar);
  const b = Math.sqrt(1 - alphaBar);
  return X0.map((p, i) => ({
    x: a * p.x + b * EPS[i].x,
    y: a * p.y + b * EPS[i].y,
  }));
}
