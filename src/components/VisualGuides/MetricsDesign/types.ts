// Pure data + math for the Metrics That Do Not Backfire guide. No React here.
// The guide runs a small dynamical model of a content feed: a greedy optimizer
// controls the clickbait share of the mix, and every number shown on the page
// is read from this simulation state as it advances tick by tick in the browser.

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// ── Model constants (visible to the learner in the "model rules" panel) ──────

/** Simulated days per run. */
export const TOTAL_TICKS = 80;
/** Milliseconds per simulated day while a run plays. */
export const TICK_MS = 110;
/** New signups arriving every day regardless of content quality. */
export const NEW_USERS_PER_DAY = 400;
/** Feed impressions each active user sees per day. */
export const IMPRESSIONS_PER_USER = 8;
/** Base click-through rate of a quality piece. */
export const QUALITY_CTR = 0.045;
/** Base click-through rate of a clickbait piece. */
export const CLICKBAIT_CTR = 0.16;
/** Bait share the audience tolerates before trust starts eroding. */
export const BAIT_TOLERANCE = 0.3;
/** How fast trust moves toward its target level each day (lagging metric). */
export const TRUST_ADAPT = 0.1;
/** How far the optimizer may move the mix per day. */
export const OPTIMIZER_STEP = 0.04;
/** Clickbait share of the mix on day 0. */
export const START_MIX = 0.1;
/** Headlines shown on the simulated front page. */
export const FEED_SLOTS = 10;

export const GUARDRAIL_MIN_PCT = 55;
export const GUARDRAIL_MAX_PCT = 90;
export const GUARDRAIL_DEFAULT_PCT = 85;

// ── State ────────────────────────────────────────────────────────────────────

/** Slow-moving state the optimizer cannot set directly. */
export interface Core {
  /** Audience trust in the feed, 0 to 1. */
  trust: number;
  /** Active users today. */
  users: number;
}

/** Everything the dashboards display for one simulated day. */
export interface TickMetrics {
  /** Clickbait share of the mix, 0 to 1. */
  mix: number;
  trust: number;
  users: number;
  /** Day-over-day return rate, 0 to 1. */
  retention: number;
  /** Effective click-through rate, 0 to 1. */
  ctr: number;
  /** Total clicks today. */
  clicks: number;
}

// ── Model rules ──────────────────────────────────────────────────────────────

/** Trust level the audience drifts toward at a given bait share. */
export function trustTarget(mix: number): number {
  return clamp(1 - 1.4 * Math.max(0, mix - BAIT_TOLERANCE) ** 1.3, 0.02, 1);
}

/** Day-over-day return rate as a function of trust: 45% at zero, 90% at full. */
export function retentionOf(trust: number): number {
  return 0.45 + 0.45 * trust;
}

/** Effective CTR: the content mix sets the base rate, distrust suppresses it. */
export function ctrOf(mix: number, trust: number): number {
  const base = mix * CLICKBAIT_CTR + (1 - mix) * QUALITY_CTR;
  return base * (0.35 + 0.65 * trust);
}

/** Advances the world one day with the mix held at the given value. */
export function advance(
  core: Core,
  mix: number
): { core: Core; metrics: TickMetrics } {
  const trust = core.trust + TRUST_ADAPT * (trustTarget(mix) - core.trust);
  const retention = retentionOf(trust);
  const users = core.users * retention + NEW_USERS_PER_DAY;
  const ctr = ctrOf(mix, trust);
  const clicks = users * IMPRESSIONS_PER_USER * ctr;
  return {
    core: { trust, users },
    metrics: { mix, trust, users, retention, ctr, clicks },
  };
}

/** Day-0 world: the steady state of publishing at the starting mix. */
export function startCore(): Core {
  const trust = trustTarget(START_MIX);
  return { trust, users: NEW_USERS_PER_DAY / (1 - retentionOf(trust)) };
}

/** Metrics displayed before the first optimizer step (day 0). */
export function initialMetrics(): TickMetrics {
  const { trust, users } = startCore();
  const retention = retentionOf(trust);
  const ctr = ctrOf(START_MIX, trust);
  return {
    mix: START_MIX,
    trust,
    users,
    retention,
    ctr,
    clicks: users * IMPRESSIONS_PER_USER * ctr,
  };
}

// ── The optimizer ────────────────────────────────────────────────────────────

export type TargetId = "clicks" | "ctr" | "retention";

export interface TargetMeta {
  id: TargetId;
  label: string;
  hint: string;
}

export const TARGETS: readonly TargetMeta[] = [
  {
    id: "clicks",
    label: "Clicks per day",
    hint: "Feels like a north star. It is an input metric wearing a crown: easy to manufacture, silent about who leaves.",
  },
  {
    id: "ctr",
    label: "Click-through rate",
    hint: "A ratio metric. The numerator can be inflated while the audience quietly shrinks out of the denominator.",
  },
  {
    id: "retention",
    label: "Retention",
    hint: "The guardrail itself. Point the optimizer here and it simply refuses to publish bait. Safe, and it grows nothing.",
  },
] as const;

export function metricValue(m: TickMetrics, target: TargetId): number {
  if (target === "clicks") return m.clicks;
  if (target === "ctr") return m.ctr;
  return m.retention;
}

export interface Guardrail {
  enabled: boolean;
  /** Minimum acceptable retention, in percent (55 to 90). */
  minRetentionPct: number;
}

export interface OptimizerResult {
  core: Core;
  mix: number;
  metrics: TickMetrics;
  /** True when the guardrail excluded at least one candidate this day. */
  constrained: boolean;
}

/**
 * One greedy day: try nudging the mix down, holding it, and nudging it up,
 * simulate one day ahead for each, drop candidates the guardrail forbids,
 * and keep whichever remaining candidate maximizes the chosen metric.
 * Ties prefer the current mix. If every candidate violates the guardrail,
 * the optimizer takes the one with the highest projected retention.
 */
export function optimizerStep(
  core: Core,
  mix: number,
  target: TargetId,
  guardrail: Guardrail
): OptimizerResult {
  const candidates = Array.from(
    new Set([
      clamp(mix - OPTIMIZER_STEP, 0, 1),
      mix,
      clamp(mix + OPTIMIZER_STEP, 0, 1),
    ])
  );
  const evaluated = candidates.map((c) => {
    const step = advance(core, c);
    return { mix: c, core: step.core, metrics: step.metrics };
  });

  const floor = guardrail.minRetentionPct / 100;
  let allowed = guardrail.enabled
    ? evaluated.filter((e) => e.metrics.retention >= floor)
    : evaluated;
  const constrained = guardrail.enabled && allowed.length < evaluated.length;
  if (allowed.length === 0) {
    allowed = [
      evaluated.reduce((a, b) =>
        b.metrics.retention > a.metrics.retention ? b : a
      ),
    ];
  }

  let best = allowed[0];
  for (const e of allowed) {
    const dv = metricValue(e.metrics, target) - metricValue(best.metrics, target);
    if (dv > 1e-12 || (Math.abs(dv) <= 1e-12 && e.mix === mix)) best = e;
  }
  return { core: best.core, mix: best.mix, metrics: best.metrics, constrained };
}

// ── Completed runs ───────────────────────────────────────────────────────────

export interface RunRecord {
  id: number;
  target: TargetId;
  guardrail: Guardrail;
  /** history[0] is day 0; one entry per simulated day after that. */
  history: TickMetrics[];
}

export interface RunSummary {
  start: TickMetrics;
  peak: TickMetrics;
  peakDay: number;
  final: TickMetrics;
}

export function summarize(history: readonly TickMetrics[]): RunSummary {
  let peak = history[0];
  let peakDay = 0;
  history.forEach((m, i) => {
    if (m.clicks > peak.clicks) {
      peak = m;
      peakDay = i;
    }
  });
  return {
    start: history[0],
    peak,
    peakDay,
    final: history[history.length - 1],
  };
}

// ── The simulated front page ─────────────────────────────────────────────────

export const CLICKBAIT_HEADLINES: readonly string[] = [
  "You will not BELIEVE what this dashboard hid",
  "Nine secrets your analytics team keeps from you",
  "This one weird trick doubled our numbers overnight",
  "Experts hate this growth hack",
  "The shocking truth about your feed (number 7!)",
  "Quiz: which vanity metric are you?",
  "She optimized one number. What happened next...",
] as const;

export const QUALITY_HEADLINES: readonly string[] = [
  "How retention curves actually flatten",
  "A field guide to reading funnel data",
  "What twelve months of A/B tests taught us",
  "Choosing a north star that survives contact",
  "Why lagging indicators arrive late by design",
  "Instrumenting trust: a practical playbook",
  "The quiet cost of interruptive prompts",
] as const;

export interface FeedItem {
  bait: boolean;
  text: string;
}

/**
 * Today's front page: FEED_SLOTS headlines with round(mix * FEED_SLOTS)
 * clickbait pieces spread evenly through the list. Fully deterministic in
 * (mix, tick), so server and client render the identical day-0 feed.
 */
export function feedFor(mix: number, tick: number): FeedItem[] {
  const nBait = Math.round(clamp(mix, 0, 1) * FEED_SLOTS);
  const items: FeedItem[] = [];
  let acc = 0;
  for (let i = 0; i < FEED_SLOTS; i++) {
    const next = Math.round(((i + 1) * nBait) / FEED_SLOTS);
    const bait = next > acc;
    acc = next;
    const pool = bait ? CLICKBAIT_HEADLINES : QUALITY_HEADLINES;
    items.push({ bait, text: pool[(tick + i) % pool.length] });
  }
  return items;
}

// ── Formatting ───────────────────────────────────────────────────────────────

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function fmtPct(x: number, digits = 1): string {
  return `${(x * 100).toFixed(digits)}%`;
}
