// Pure math for the Cost and Latency Engineering guide. No React imports.
// A verifier can execute every exported function with node/tsx and recompute
// every number the guide displays.

export const CATEGORY_ACCENT = "#ec4899";

const MTOK = 1_000_000;

export const MONTH_DAYS = 30;
export const MAX_REUSE = 20;

export interface Prices {
  /** USD per million input (prompt) tokens. Editable assumption. */
  inPerMTok: number;
  /** USD per million output tokens. Editable assumption. */
  outPerMTok: number;
}

export interface Workload {
  promptTokens: number;
  outputTokens: number;
  requestsPerDay: number;
}

export interface CacheKnobs {
  /** Fraction of the prompt that is a cacheable shared prefix (0..1). */
  cachedShare: number;
  /** Cache write price as a multiple of the input price. */
  writeMult: number;
  /** Cache read price as a multiple of the input price. */
  readMult: number;
}

// Editable assumptions. Placeholder defaults as of July 2026, not any vendor's
// official price list; the UI lets the user overwrite all of them.
export const DEFAULT_PRICES: Prices = { inPerMTok: 3, outPerMTok: 15 };
export const DEFAULT_WORKLOAD: Workload = {
  promptTokens: 8000,
  outputTokens: 400,
  requestsPerDay: 5000,
};
export const DEFAULT_TTFT_MS = 500;
export const DEFAULT_TPOT_MS = 25;
export const DEFAULT_CACHE_KNOBS: CacheKnobs = {
  cachedShare: 0.75,
  writeMult: 1.25,
  readMult: 0.1,
};

// ── Cost ────────────────────────────────────────────────────────────────────

export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  perRequest: number;
  perDay: number;
  perMonth: number;
  /** Fraction of the per-request cost that is input (prompt) spend. */
  inputShare: number;
}

export function computeRequestCost(w: Workload, p: Prices): CostBreakdown {
  const inputCost = (w.promptTokens / MTOK) * p.inPerMTok;
  const outputCost = (w.outputTokens / MTOK) * p.outPerMTok;
  const perRequest = inputCost + outputCost;
  const perDay = perRequest * w.requestsPerDay;
  return {
    inputCost,
    outputCost,
    perRequest,
    perDay,
    perMonth: perDay * MONTH_DAYS,
    inputShare: perRequest > 0 ? inputCost / perRequest : 0,
  };
}

// ── Latency ─────────────────────────────────────────────────────────────────

export interface LatencyBreakdown {
  ttftMs: number;
  genMs: number;
  totalMs: number;
  /** Fraction of the total wait spent before the first token. */
  ttftShare: number;
  tokensPerSecond: number;
}

/** Total response time = TTFT + outputTokens * TPOT. */
export function computeLatency(
  ttftMs: number,
  tpotMs: number,
  outputTokens: number
): LatencyBreakdown {
  const genMs = tpotMs * outputTokens;
  const totalMs = ttftMs + genMs;
  return {
    ttftMs,
    genMs,
    totalMs,
    ttftShare: totalMs > 0 ? ttftMs / totalMs : 0,
    tokensPerSecond: tpotMs > 0 ? 1000 / tpotMs : 0,
  };
}

/** Tokens visible t ms after the request starts, when streaming. */
export function tokensVisibleAt(
  tMs: number,
  ttftMs: number,
  tpotMs: number,
  outputTokens: number
): number {
  if (outputTokens <= 0 || tMs < ttftMs) return 0;
  if (tpotMs <= 0) return outputTokens;
  return Math.min(outputTokens, Math.floor((tMs - ttftMs) / tpotMs) + 1);
}

/** Compress long waits so the on-screen race lasts at most maxDemoMs. */
export function racePlayback(
  totalMs: number,
  maxDemoMs = 5000
): { demoMs: number; speed: number } {
  const demoMs = Math.min(Math.max(totalMs, 1), maxDemoMs);
  return { demoMs, speed: totalMs / demoMs };
}

// ── Prompt cache ────────────────────────────────────────────────────────────

export interface CacheRequestCosts {
  cachedTokens: number;
  uncachedTokens: number;
  /** Input cost of one request with no caching at all. */
  plainCost: number;
  /** Input cost of the first request: cache write premium + uncached remainder. */
  writeCost: number;
  /** Input cost of every later request: discounted read + uncached remainder. */
  readCost: number;
}

export function cacheRequestCosts(
  promptTokens: number,
  inPerMTok: number,
  k: CacheKnobs
): CacheRequestCosts {
  const cachedTokens = Math.round(promptTokens * k.cachedShare);
  const uncachedTokens = promptTokens - cachedTokens;
  const unit = inPerMTok / MTOK;
  const rest = uncachedTokens * unit;
  return {
    cachedTokens,
    uncachedTokens,
    plainCost: promptTokens * unit,
    writeCost: cachedTokens * unit * k.writeMult + rest,
    readCost: cachedTokens * unit * k.readMult + rest,
  };
}

export interface CacheCumulative {
  uncachedTotal: number;
  cachedTotal: number;
  /** cachedTotal minus uncachedTotal. Negative means caching is cheaper. */
  delta: number;
}

/**
 * Cumulative cost of n requests that share the same prompt prefix.
 * Cached path: request 1 writes the prefix, requests 2..n read it.
 * Output cost is identical on both paths and included so totals match
 * the calculator section.
 */
export function cacheCumulative(
  n: number,
  promptTokens: number,
  outputTokens: number,
  prices: Prices,
  k: CacheKnobs
): CacheCumulative {
  const rc = cacheRequestCosts(promptTokens, prices.inPerMTok, k);
  const outCost = (outputTokens / MTOK) * prices.outPerMTok;
  const uncachedTotal = n * (rc.plainCost + outCost);
  const cachedTotal =
    rc.writeCost + outCost + Math.max(0, n - 1) * (rc.readCost + outCost);
  return { uncachedTotal, cachedTotal, delta: cachedTotal - uncachedTotal };
}

/** Smallest request count at which caching is strictly cheaper, or null. */
export function cacheBreakEven(
  promptTokens: number,
  outputTokens: number,
  prices: Prices,
  k: CacheKnobs,
  maxN = 200
): number | null {
  for (let n = 1; n <= maxN; n++) {
    if (cacheCumulative(n, promptTokens, outputTokens, prices, k).delta < 0) {
      return n;
    }
  }
  return null;
}

export interface SteadySavings {
  /** Fraction of the per-request input bill saved once the prefix is warm. */
  inputShareSaved: number;
  /** Absolute USD saved per steady-state request (input side). */
  perRequestSaved: number;
  /** USD per month at the workload's request rate, steady state, ignoring the single write. */
  perMonthSaved: number;
}

export function steadyCacheSavings(
  w: Workload,
  prices: Prices,
  k: CacheKnobs
): SteadySavings {
  const rc = cacheRequestCosts(w.promptTokens, prices.inPerMTok, k);
  const perRequestSaved = rc.plainCost - rc.readCost;
  return {
    inputShareSaved: rc.plainCost > 0 ? perRequestSaved / rc.plainCost : 0,
    perRequestSaved,
    perMonthSaved: perRequestSaved * w.requestsPerDay * MONTH_DAYS,
  };
}

// ── Formatting (deterministic en-US, hydration safe) ────────────────────────

export function formatInt(n: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

export function formatUSD(v: number): string {
  const abs = Math.abs(v);
  const decimals =
    abs >= 1000 ? 0
    : abs >= 1 ? 2
    : abs >= 0.01 ? 3
    : abs >= 0.001 ? 4
    : abs === 0 ? 2
    : 5;
  const body = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(abs);
  return `${v < 0 ? "-" : ""}$${body}`;
}

export function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

export function formatPct(fraction: number, decimals = 0): string {
  return `${(fraction * 100).toFixed(decimals)}%`;
}

export function formatMult(x: number): string {
  return `${x.toFixed(2)}x`;
}
