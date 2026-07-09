// Pure data module for the Designing Eval Datasets guide.
// No React imports. Everything here is deterministic so the server and client
// render identical output, and so a verifier can recompute every displayed
// number by executing this module with node/tsx.

export type CategoryId = "billing" | "reasoning" | "tone" | "retrieval";

export interface SliceConfig {
  id: CategoryId;
  label: string;
  /** Share of simulated production traffic (all shares sum to 1). */
  share: number;
  /**
   * Simulated true pass rate of the current model on this slice.
   * This is a simulation parameter: in real life it is the unknown
   * quantity your eval set is trying to estimate.
   */
  truePassRate: number;
  /** Series color from the guide token table. */
  color: string;
  blurb: string;
}

export const SLICES: readonly SliceConfig[] = [
  {
    id: "billing",
    label: "Billing and refunds",
    share: 0.4,
    truePassRate: 0.8,
    color: "#3bb4a4",
    blurb: "Routine policy lookups. The model is strong here.",
  },
  {
    id: "tone",
    label: "Tone and formatting",
    share: 0.3,
    truePassRate: 0.7,
    color: "#93c5fd",
    blurb: "Style rewrites and structured output requests.",
  },
  {
    id: "reasoning",
    label: "Multi-step reasoning",
    share: 0.15,
    truePassRate: 0.45,
    color: "#a855f7",
    blurb: "Chained calculations and eligibility logic.",
  },
  {
    id: "retrieval",
    label: "Long-context retrieval",
    share: 0.15,
    truePassRate: 0.35,
    color: "#ef4444",
    blurb: "Needle-in-a-haystack lookups over long documents.",
  },
];

export interface EvalTask {
  id: string;
  category: CategoryId;
  text: string;
  /** True label: does the current model pass this task? (Simulation truth.) */
  passes: boolean;
}

export const POOL_SIZE = 400;

/**
 * Deterministic LCG PRNG (spec section 10). Returns a stateful generator so
 * repeated calls advance the sequence. Never used in render scope.
 */
export function createRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const TASK_TEMPLATES: Record<CategoryId, readonly string[]> = {
  billing: [
    "Customer asks why they were charged twice for one order",
    "Refund request for an item returned after 28 days",
    "Explain a prorated charge after a mid-cycle plan upgrade",
    "Customer disputes a currency-conversion fee",
    "Cancel a subscription and confirm the final billing date",
  ],
  tone: [
    "Rewrite a blunt outage notice as an apologetic status update",
    "Summarize a support thread as three neutral bullet points",
    "Convert a rambling complaint into a structured ticket",
    "Draft a polite decline of a feature request",
    "Reformat a policy answer as a numbered checklist",
  ],
  reasoning: [
    "Compute the refund owed across two overlapping discount codes",
    "Decide loyalty-tier eligibility from three usage rules",
    "Work out shipping cost with a weight and distance table",
    "Chain two policy clauses to answer an edge-case question",
    "Reconcile an invoice line total against unit prices",
  ],
  retrieval: [
    "Find the cancellation clause buried in a 40-page contract",
    "Quote the exact SLA figure from an attached policy PDF",
    "Locate the one changed field in a long changelog",
    "Answer from paragraph 62 of the terms of service",
    "Pull the correct API limit from long reference docs",
  ],
};

function buildPool(): EvalTask[] {
  const tasks: EvalTask[] = [];
  for (const slice of SLICES) {
    const count = Math.round(slice.share * POOL_SIZE);
    const passCount = Math.round(slice.truePassRate * count);
    const templates = TASK_TEMPLATES[slice.id];
    for (let i = 0; i < count; i++) {
      tasks.push({
        id: `${slice.id}-${i + 1}`,
        category: slice.id,
        text: `${templates[i % templates.length]} (case ${i + 1})`,
        passes: i < passCount,
      });
    }
  }
  return tasks;
}

/** The full pool of simulated production failures/tasks. Constant. */
export const POOL: readonly EvalTask[] = buildPool();

export const TASK_BY_ID: ReadonlyMap<string, EvalTask> = new Map(
  POOL.map((t) => [t.id, t])
);

/**
 * A fixed seeded shuffle of the pool. "Random" sampling draws tasks in this
 * order, so sampling is deterministic given the user's action sequence.
 */
function buildGlobalOrder(): string[] {
  const ids = POOL.map((t) => t.id);
  const rng = createRng(20260709);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

export const GLOBAL_ORDER: readonly string[] = buildGlobalOrder();

/** Next `count` unsampled task ids in the seeded global order. */
export function drawRandom(
  sampled: ReadonlySet<string>,
  count: number
): string[] {
  const out: string[] = [];
  for (const id of GLOBAL_ORDER) {
    if (out.length >= count) break;
    if (!sampled.has(id)) out.push(id);
  }
  return out;
}

/** Next `count` unsampled task ids of one category, in seeded global order. */
export function drawFromCategory(
  sampled: ReadonlySet<string>,
  category: CategoryId,
  count: number
): string[] {
  const out: string[] = [];
  for (const id of GLOBAL_ORDER) {
    if (out.length >= count) break;
    const task = TASK_BY_ID.get(id);
    if (task && task.category === category && !sampled.has(id)) out.push(id);
  }
  return out;
}

/** Remaining unsampled pool count for a category. */
export function remainingInCategory(
  sampled: ReadonlySet<string>,
  category: CategoryId
): number {
  let n = 0;
  for (const t of POOL) {
    if (t.category === category && !sampled.has(t.id)) n++;
  }
  return n;
}

export function sliceById(id: CategoryId): SliceConfig {
  const slice = SLICES.find((s) => s.id === id);
  if (!slice) throw new Error(`Unknown slice: ${id}`);
  return slice;
}
