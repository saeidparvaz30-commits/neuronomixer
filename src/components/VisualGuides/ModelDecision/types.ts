// Pure data + math for the "Which AI Model Should I Use?" guide.
// No React imports. A verifier can recompute every displayed number by
// importing these functions and executing them with node or tsx:
//   blendedPrice, passesConstraints, paretoFrontier, evaluate,
//   cheapestFrontierPrice, monthlyCostUsd.

export type LatencyClass = "fast" | "medium" | "slow";
export type LatencyCeiling = "any" | "medium" | "fast";

export const LATENCY_ORDER: Record<LatencyClass, number> = {
  fast: 0,
  medium: 1,
  slow: 2,
};

export const LATENCY_LABEL: Record<LatencyClass, string> = {
  fast: "Fast",
  medium: "Medium",
  slow: "Slow",
};

export interface ModelRow {
  id: string;
  name: string;
  short: string;
  openWeights: boolean;
  /** Generic 0 to 100 capability index. An editable assumption, not a published benchmark score. */
  capability: number;
  /** USD per million input tokens. Editable assumption. */
  priceIn: number;
  /** USD per million output tokens. Editable assumption. */
  priceOut: number;
  /** Context window in thousands of tokens. */
  contextK: number;
  latency: LatencyClass;
}

/**
 * Curated default dataset. Every value is an EDITABLE ASSUMPTION with
 * defaults as of July 2026: list-price style estimates and generic
 * capability tiers, not vendor-verified benchmark results. The math below
 * is exact over whatever values are currently in the table.
 */
export const DEFAULT_MODELS: readonly ModelRow[] = [
  {
    id: "claude-opus",
    name: "Claude Opus (frontier)",
    short: "Opus",
    openWeights: false,
    capability: 96,
    priceIn: 15,
    priceOut: 75,
    contextK: 200,
    latency: "slow",
  },
  {
    id: "claude-sonnet",
    name: "Claude Sonnet",
    short: "Sonnet",
    openWeights: false,
    capability: 90,
    priceIn: 3,
    priceOut: 15,
    contextK: 1000,
    latency: "medium",
  },
  {
    id: "claude-haiku",
    name: "Claude Haiku",
    short: "Haiku",
    openWeights: false,
    capability: 76,
    priceIn: 1,
    priceOut: 5,
    contextK: 200,
    latency: "fast",
  },
  {
    id: "gpt-frontier",
    name: "GPT frontier tier",
    short: "GPT-F",
    openWeights: false,
    capability: 94,
    priceIn: 10,
    priceOut: 40,
    contextK: 400,
    latency: "slow",
  },
  {
    id: "gpt-mini",
    name: "GPT mini tier",
    short: "GPT-mini",
    openWeights: false,
    capability: 80,
    priceIn: 0.4,
    priceOut: 1.6,
    contextK: 128,
    latency: "fast",
  },
  {
    id: "gemini-pro",
    name: "Gemini Pro tier",
    short: "Gem-Pro",
    openWeights: false,
    capability: 88,
    priceIn: 2.5,
    priceOut: 15,
    contextK: 1000,
    latency: "medium",
  },
  {
    id: "gemini-flash",
    name: "Gemini Flash tier",
    short: "Gem-Flash",
    openWeights: false,
    capability: 78,
    priceIn: 0.3,
    priceOut: 2.5,
    contextK: 1000,
    latency: "fast",
  },
  {
    id: "llama-large",
    name: "Llama 70B class (open)",
    short: "Llama",
    openWeights: true,
    capability: 82,
    priceIn: 0.9,
    priceOut: 0.9,
    contextK: 128,
    latency: "medium",
  },
  {
    id: "mistral-small",
    name: "Mistral small (open)",
    short: "Mistral",
    openWeights: true,
    capability: 70,
    priceIn: 0.2,
    priceOut: 0.6,
    contextK: 128,
    latency: "fast",
  },
  {
    id: "qwen-large",
    name: "Qwen 72B class (open)",
    short: "Qwen",
    openWeights: true,
    capability: 84,
    priceIn: 0.5,
    priceOut: 1.5,
    contextK: 256,
    latency: "medium",
  },
  {
    id: "deepseek-r",
    name: "DeepSeek reasoning (open)",
    short: "DeepSeek",
    openWeights: true,
    capability: 87,
    priceIn: 0.55,
    priceOut: 2.2,
    contextK: 128,
    latency: "slow",
  },
];

// ── Constraints ──────────────────────────────────────────────────────────────

export type ConstraintKey = "quality" | "budget" | "latency" | "context" | "hosting";

export const FAILURE_LABEL: Record<ConstraintKey, string> = {
  quality: "below quality floor",
  budget: "over budget",
  latency: "too slow",
  context: "context too small",
  hosting: "not open weights",
};

/** Budget ceiling steps in USD per blended Mtok. Infinity means no limit. */
export const BUDGET_STEPS: readonly number[] = [
  0.25, 0.5, 1, 2, 4, 8, 15, 30, 60, Infinity,
];

/** Minimum context window steps, in thousands of tokens. */
export const CONTEXT_STEPS: readonly number[] = [8, 32, 128, 200, 400, 1000];

export interface Constraints {
  /** Minimum capability index, 0 to 100. */
  qualityFloor: number;
  /** Index into BUDGET_STEPS. */
  budgetIdx: number;
  /** Slowest latency class still acceptable. */
  latencyCeiling: LatencyCeiling;
  /** Index into CONTEXT_STEPS. */
  contextIdx: number;
  /** Require open weights (self-hostable, data never leaves your infra). */
  openOnly: boolean;
}

/** Permissive defaults: every model in the default dataset passes. */
export const DEFAULT_CONSTRAINTS: Constraints = {
  qualityFloor: 0,
  budgetIdx: BUDGET_STEPS.length - 1,
  latencyCeiling: "any",
  contextIdx: 0,
  openOnly: false,
};

const CEILING_ORDER: Record<LatencyCeiling, number> = {
  any: 2,
  medium: 1,
  fast: 0,
};

// ── Math ─────────────────────────────────────────────────────────────────────

/** Assumed share of output tokens in the blended price (1 output : 3 input). */
export const OUT_SHARE = 0.25;

/** Blended USD per Mtok at a 3:1 input:output token mix. */
export function blendedPrice(m: ModelRow): number {
  return (1 - OUT_SHARE) * m.priceIn + OUT_SHARE * m.priceOut;
}

/** Returns the list of constraints this model fails (empty means it passes). */
export function passesConstraints(m: ModelRow, c: Constraints): ConstraintKey[] {
  const failures: ConstraintKey[] = [];
  if (m.capability < c.qualityFloor) failures.push("quality");
  if (blendedPrice(m) > BUDGET_STEPS[c.budgetIdx]) failures.push("budget");
  if (LATENCY_ORDER[m.latency] > CEILING_ORDER[c.latencyCeiling]) failures.push("latency");
  if (m.contextK < CONTEXT_STEPS[c.contextIdx]) failures.push("context");
  if (c.openOnly && !m.openWeights) failures.push("hosting");
  return failures;
}

export interface ParetoPoint {
  id: string;
  cost: number;
  cap: number;
}

/**
 * Pareto frontier on (cost lower is better, capability higher is better).
 * A point is dominated when another point is at least as good on both axes
 * and strictly better on at least one.
 */
export function paretoFrontier(points: readonly ParetoPoint[]): Set<string> {
  const frontier = new Set<string>();
  for (const p of points) {
    const dominated = points.some(
      (q) =>
        q.id !== p.id &&
        q.cost <= p.cost &&
        q.cap >= p.cap &&
        (q.cost < p.cost || q.cap > p.cap)
    );
    if (!dominated) frontier.add(p.id);
  }
  return frontier;
}

export interface EvaluatedModel {
  model: ModelRow;
  blended: number;
  failures: ConstraintKey[];
  pass: boolean;
  /** On the Pareto frontier of the models that pass all constraints. */
  onFrontier: boolean;
}

export interface Evaluation {
  rows: EvaluatedModel[];
  passingCount: number;
  frontierCount: number;
}

/**
 * The engine of the guide. Every status, count, and highlighted point on
 * screen comes from running this over the current (possibly edited) dataset
 * and the current constraints.
 */
export function evaluate(models: readonly ModelRow[], c: Constraints): Evaluation {
  const partial = models.map((model) => {
    const failures = passesConstraints(model, c);
    return {
      model,
      blended: blendedPrice(model),
      failures,
      pass: failures.length === 0,
    };
  });

  const frontier = paretoFrontier(
    partial
      .filter((r) => r.pass)
      .map((r) => ({ id: r.model.id, cost: r.blended, cap: r.model.capability }))
  );

  const rows: EvaluatedModel[] = partial.map((r) => ({
    ...r,
    onFrontier: frontier.has(r.model.id),
  }));

  return {
    rows,
    passingCount: rows.filter((r) => r.pass).length,
    frontierCount: frontier.size,
  };
}

/** Cheapest blended price among frontier models, or null when none pass. */
export function cheapestFrontierPrice(rows: readonly EvaluatedModel[]): number | null {
  const frontier = rows.filter((r) => r.onFrontier);
  if (frontier.length === 0) return null;
  return frontier.reduce((min, r) => Math.min(min, r.blended), Infinity);
}

/** Monthly cost in USD for a workload of `mtok` million blended tokens. */
export function monthlyCostUsd(blended: number, mtok: number): number {
  return blended * mtok;
}

// ── Formatting + display constants ──────────────────────────────────────────

export function formatUsd(v: number): string {
  if (!Number.isFinite(v)) return "no limit";
  if (v >= 100) return `$${Math.round(v)}`;
  if (v >= 10) return `$${v.toFixed(1)}`;
  return `$${v.toFixed(2)}`;
}

export function contextLabel(k: number): string {
  return k >= 1000 ? `${k / 1000}M` : `${k}K`;
}

export function budgetLabel(idx: number): string {
  const v = BUDGET_STEPS[idx];
  return Number.isFinite(v) ? `${formatUsd(v)} / Mtok` : "No limit";
}

// Data-vis series colors from the guide token table (literal hexes are
// allowed for series colors). Pink is the Applied AI category color.
export const PINK = "#ec4899";
export const TEAL = "#3bb4a4";
export const DIM = "#475569";
