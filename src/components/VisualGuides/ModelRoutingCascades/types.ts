// Types, constants, and labeled illustrative defaults for the
// Model Routing and Cascades guide. No React imports: a verifier can
// execute everything here plus cascadeMath.ts with node/tsx.

export interface TierParams {
  id: string;
  name: string;
  /** Cost per query in relative cost units. Illustrative, user editable. */
  cost: number;
  /**
   * Capability midpoint in [0,1]: the difficulty at which the tier is 50%
   * likely to answer correctly. Illustrative, user editable.
   */
  skill: number;
}

export interface QuerySample {
  /** True difficulty in [0,1]. */
  difficulty: number;
  /** Pre-drawn uniforms deciding correctness at each tier. */
  correctU: readonly [number, number, number];
  /** Pre-drawn uniforms for the confidence noise at each tier. */
  confU: readonly [number, number, number];
}

export interface RoutedQuery {
  index: number;
  difficulty: number;
  /** Tier index that produced the accepted answer. */
  answeredBy: number;
  correct: boolean;
  /** Total cost paid for this query (every tier invoked is paid). */
  cost: number;
  /** Self-reported confidence of the accepting tier; null when the final tier answered (no gate). */
  confidence: number | null;
}

export interface SimResult {
  routed: RoutedQuery[];
  /** Mean cost per query in cost units. */
  avgCost: number;
  /** Fraction of queries answered correctly. */
  accuracy: number;
  /** Queries answered by each tier. */
  tierCounts: number[];
  /** Accuracy of the queries each tier answered (null when a tier answered none). */
  tierAccuracy: (number | null)[];
  /** Mean self-reported confidence over gate-accepted answers (what a dashboard sees); null if none. */
  dashboardConfidence: number | null;
  /** Number of gate-accepted answers (answered before the final tier). */
  gateAcceptedCount: number;
  /** True accuracy of the gate-accepted answers; null if none. */
  gateAcceptedAccuracy: number | null;
  /** Hard queries (difficulty >= HARD_DIFFICULTY) answered by tier 0. */
  hardAtSmallCount: number;
  /** Accuracy on those hard-at-small queries; null if none. */
  hardAtSmallAccuracy: number | null;
}

export interface BaselineResult {
  avgCost: number;
  accuracy: number;
}

export interface FrontierPoint {
  threshold: number;
  avgCost: number;
  accuracy: number;
}

/** Snapshot taken when the user locks a routing policy. */
export interface PolicyLock {
  threshold: number;
  calibration: number;
  avgCost: number;
  accuracy: number;
  dashboardConfidence: number | null;
}

// ── Stream constants ─────────────────────────────────────────────────────────

export const N_QUERIES = 400;
export const STREAM_SEED = 20260709;
/** Difficulty at or above which a query counts as "hard". */
export const HARD_DIFFICULTY = 0.7;
/** Logistic width of the capability curve. */
export const SKILL_WIDTH = 0.13;

// ── Illustrative defaults (user editable in the UI) ─────────────────────────

export const DEFAULT_TIERS: readonly TierParams[] = [
  { id: "small", name: "Small", cost: 1, skill: 0.5 },
  { id: "medium", name: "Medium", cost: 6, skill: 0.75 },
  { id: "large", name: "Large", cost: 30, skill: 0.95 },
];

export const DEFAULT_THRESHOLD = 0.7;
export const DEFAULT_CALIBRATION = 1;

/** Frontier sweep granularity. */
export const FRONTIER_STEP = 0.02;

/** Winning within this accuracy tolerance of always-big counts as "equal quality". */
export const WIN_TOLERANCE = 0.01;

// ── Completion gate thresholds ───────────────────────────────────────────────

/** Gate 1: locking a policy requires at least this calibration (an honest starting point). */
export const LOCK_MIN_CALIBRATION = 0.8;
/** Gate 2: calibration must be dragged to or below this. */
export const BREAK_CALIBRATION_MAX = 0.4;
/** Gate 2: true accuracy must fall at least this far below the locked policy. */
export const BREAK_ACCURACY_DROP = 0.04;
/** Gate 2: dashboard confidence may fall at most this much and still look "healthy". */
export const BREAK_CONFIDENCE_SLACK = 0.05;

// ── Series colors (from the guide token table) ───────────────────────────────

export const TIER_COLORS: readonly string[] = ["#3bb4a4", "#a855f7", "#93c5fd"];
/** Applied AI category accent: used for the live cascade policy in charts. */
export const CASCADE_PINK = "#ec4899";
