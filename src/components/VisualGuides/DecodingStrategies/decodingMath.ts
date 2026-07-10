/**
 * Pure decoding math for the decoding-strategies guide. No React imports.
 *
 * This module is the single source of every number the guide displays.
 * It trains a character n-gram model on the visible CORPUS (counts of
 * "which character follows this context"), then runs three decoding
 * strategies over the exact same model:
 *
 *   greedy      : always take the argmax character
 *   beam search : keep the `width` highest cumulative-log-prob prefixes
 *   sampling    : temperature-scale the distribution, truncate it with
 *                 top-k / top-p / min-p, renormalize, draw with an LCG rng
 *
 * A verifier can recompute every displayed value by executing these
 * functions with node/tsx.
 */

/** Context length in characters (an order-4 model: 3 chars predict the 4th). */
export const ORDER = 3;

/** The seed every decode starts from. Must appear in the corpus. */
export const SEED = "the ";

/** Continuation length for greedy, full beam decode, and each sample. */
export const DECODE_STEPS = 40;

/** Max levels of the beam tree the UI can expand. */
export const TREE_MAX_LEVELS = 8;

/** Expansions per surviving beam at each tree level. */
export const TREE_BRANCH = 3;

/** Sample count for one experiment run. */
export const BATCH_SIZE = 100;

/**
 * The visible training corpus. Lowercase letters, spaces, and periods only.
 * Deliberately repetitive so the model has strong modes (greedy loops into
 * them) and real branch points (sampling diversifies at them).
 */
export const CORPUS =
  "the model can copy the prompt and the model can mix a reply. " +
  "the model can learn the pattern or the model can quote the data. " +
  "the model writes the text and the text flows and the text flows on. " +
  "greedy decoding picks the top token and gets stuck fast. " +
  "sampling picks a rare token and breaks free. " +
  "beam search keeps a few paths and drops weak paths.";

export interface CharProb {
  char: string;
  prob: number;
  logProb: number;
}

/** levels[k] maps a length-k context to next-character counts. */
export type NGramModel = Map<string, Map<string, number>>[];

function byProbDesc(a: CharProb, b: CharProb): number {
  return b.prob - a.prob || (a.char < b.char ? -1 : 1);
}

export function buildModel(corpus: string, order: number = ORDER): NGramModel {
  const levels: NGramModel = [];
  for (let k = 0; k <= order; k++) {
    const level = new Map<string, Map<string, number>>();
    for (let i = k; i < corpus.length; i++) {
      const ctx = corpus.slice(i - k, i);
      const next = corpus[i];
      let inner = level.get(ctx);
      if (!inner) {
        inner = new Map<string, number>();
        level.set(ctx, inner);
      }
      inner.set(next, (inner.get(next) ?? 0) + 1);
    }
    levels.push(level);
  }
  return levels;
}

export interface ModelStats {
  corpusLength: number;
  vocabSize: number;
  contextCount: number;
}

export function modelStats(corpus: string, model: NGramModel): ModelStats {
  return {
    corpusLength: corpus.length,
    vocabSize: new Set(corpus.split("")).size,
    contextCount: model[ORDER].size,
  };
}

/**
 * Next-character distribution for a context, sorted by probability.
 * Stupid backoff: the longest context with observed counts wins; if the
 * full ORDER-length context was never seen, fall back to shorter ones
 * (length 0 always exists, so a distribution is always returned).
 */
export function getDistribution(
  model: NGramModel,
  text: string
): { dist: CharProb[]; usedOrder: number } {
  for (let k = Math.min(ORDER, text.length); k >= 0; k--) {
    const ctx = text.slice(text.length - k);
    const counts = model[k].get(ctx);
    if (counts && counts.size > 0) {
      let total = 0;
      counts.forEach((c) => {
        total += c;
      });
      const dist: CharProb[] = [];
      counts.forEach((c, ch) => {
        const p = c / total;
        dist.push({ char: ch, prob: p, logProb: Math.log(p) });
      });
      dist.sort(byProbDesc);
      return { dist, usedOrder: k };
    }
  }
  return { dist: [], usedOrder: 0 };
}

// ---------------------------------------------------------------- greedy

export interface GreedyStep {
  index: number;
  context: string;
  usedOrder: number;
  dist: CharProb[];
  char: string;
  logProb: number;
  cumLogProb: number;
}

export function greedyDecode(
  model: NGramModel,
  seed: string,
  steps: number
): GreedyStep[] {
  let text = seed;
  let cum = 0;
  const out: GreedyStep[] = [];
  for (let i = 0; i < steps; i++) {
    const { dist, usedOrder } = getDistribution(model, text);
    const top = dist[0];
    cum += top.logProb;
    out.push({
      index: i,
      context: text.slice(-ORDER),
      usedOrder,
      dist,
      char: top.char,
      logProb: top.logProb,
      cumLogProb: cum,
    });
    text += top.char;
  }
  return out;
}

// ------------------------------------------------------------------ beam

export interface BeamNode {
  id: string;
  parentId: string;
  char: string;
  text: string;
  logProb: number;
  cumLogProb: number;
  kept: boolean;
  rank: number | null;
}

export interface BeamLevel {
  nodes: BeamNode[];
}

/**
 * Beam search over the n-gram model, keeping the full candidate list at
 * every level so the UI can draw kept and pruned nodes.
 */
export function beamSearchTree(
  model: NGramModel,
  seed: string,
  levelCount: number,
  width: number,
  branch: number = TREE_BRANCH
): BeamLevel[] {
  let beams: { id: string; text: string; cumLogProb: number }[] = [
    { id: "root", text: seed, cumLogProb: 0 },
  ];
  const levels: BeamLevel[] = [];
  for (let l = 0; l < levelCount; l++) {
    const candidates: BeamNode[] = [];
    beams.forEach((b) => {
      const { dist } = getDistribution(model, b.text);
      dist.slice(0, branch).forEach((cp, j) => {
        candidates.push({
          id: `L${l}-${b.id}-${j}`,
          parentId: b.id,
          char: cp.char,
          text: b.text + cp.char,
          logProb: cp.logProb,
          cumLogProb: b.cumLogProb + cp.logProb,
          kept: false,
          rank: null,
        });
      });
    });
    candidates.sort(
      (a, b) => b.cumLogProb - a.cumLogProb || (a.text < b.text ? -1 : 1)
    );
    for (let r = 0; r < Math.min(width, candidates.length); r++) {
      candidates[r].kept = true;
      candidates[r].rank = r;
    }
    levels.push({ nodes: candidates });
    beams = candidates
      .filter((c) => c.kept)
      .map((c) => ({ id: c.id, text: c.text, cumLogProb: c.cumLogProb }));
  }
  return levels;
}

/** Full-horizon beam decode; returns final beams sorted best first. */
export function beamDecode(
  model: NGramModel,
  seed: string,
  steps: number,
  width: number,
  branch: number = TREE_BRANCH
): { text: string; cumLogProb: number }[] {
  let beams = [{ text: seed, cumLogProb: 0 }];
  for (let i = 0; i < steps; i++) {
    const candidates: { text: string; cumLogProb: number }[] = [];
    beams.forEach((b) => {
      const { dist } = getDistribution(model, b.text);
      dist.slice(0, branch).forEach((cp) => {
        candidates.push({
          text: b.text + cp.char,
          cumLogProb: b.cumLogProb + cp.logProb,
        });
      });
    });
    candidates.sort(
      (a, b) => b.cumLogProb - a.cumLogProb || (a.text < b.text ? -1 : 1)
    );
    beams = candidates.slice(0, width);
  }
  return beams;
}

// -------------------------------------------------------------- sampling

export type TruncMethod = "topk" | "topp" | "minp";

export interface SamplerSettings {
  temperature: number;
  method: TruncMethod;
  topK: number;
  topP: number;
  minP: number;
}

export const DEFAULT_SETTINGS: SamplerSettings = {
  temperature: 1.0,
  method: "topk",
  topK: 5,
  topP: 0.9,
  minP: 0.1,
};

/** Temperature scaling: p_i^(1/T), renormalized (done in log space). */
export function applyTemperature(dist: CharProb[], t: number): CharProb[] {
  const invT = 1 / Math.max(t, 1e-6);
  const scaled = dist.map((d) => d.logProb * invT);
  const maxL = Math.max(...scaled);
  const exps = scaled.map((l) => Math.exp(l - maxL));
  const z = exps.reduce((a, b) => a + b, 0);
  return dist
    .map((d, i) => {
      const p = exps[i] / z;
      return { char: d.char, prob: p, logProb: Math.log(p) };
    })
    .sort(byProbDesc);
}

export interface TruncRow {
  char: string;
  /** Probability after temperature, before truncation. */
  prob: number;
  /** Probability after truncation and renormalization (0 if cut). */
  renormProb: number;
  kept: boolean;
}

/**
 * Truncate a temperature-scaled distribution (sorted desc) with the active
 * method, then renormalize the survivors. Always keeps at least one char.
 */
export function truncate(
  dist: CharProb[],
  settings: SamplerSettings
): TruncRow[] {
  let keepCount = 1;
  if (settings.method === "topk") {
    keepCount = Math.min(Math.max(1, Math.round(settings.topK)), dist.length);
  } else if (settings.method === "topp") {
    let cum = 0;
    keepCount = dist.length;
    for (let i = 0; i < dist.length; i++) {
      cum += dist[i].prob;
      if (cum >= settings.topP) {
        keepCount = i + 1;
        break;
      }
    }
  } else {
    const threshold = settings.minP * dist[0].prob;
    keepCount = dist.filter((d) => d.prob >= threshold).length;
    // dist is sorted desc, so the survivors are exactly the first keepCount
    keepCount = Math.max(1, keepCount);
  }
  const keptMass = dist
    .slice(0, keepCount)
    .reduce((a, d) => a + d.prob, 0);
  return dist.map((d, i) => ({
    char: d.char,
    prob: d.prob,
    renormProb: i < keepCount ? d.prob / keptMass : 0,
    kept: i < keepCount,
  }));
}

/** Deterministic LCG rng in [0, 1). Same recurrence as the SPEC's lcg. */
export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export interface SampleResult {
  /** The continuation only (seed excluded). */
  text: string;
  /** Mean log-prob per char of the sampled chars under the BASE model. */
  meanLogProb: number;
}

export function sampleContinuation(
  model: NGramModel,
  seed: string,
  steps: number,
  settings: SamplerSettings,
  rng: () => number
): SampleResult {
  let text = seed;
  let sumLP = 0;
  for (let i = 0; i < steps; i++) {
    const { dist } = getDistribution(model, text);
    const tempered = applyTemperature(dist, settings.temperature);
    const rows = truncate(tempered, settings);
    let r = rng();
    let chosen = rows[0].char;
    for (const row of rows) {
      if (!row.kept) continue;
      r -= row.renormProb;
      if (r <= 0) {
        chosen = row.char;
        break;
      }
      chosen = row.char; // fallback to last kept row on float underflow
    }
    const base = dist.find((d) => d.char === chosen);
    sumLP += base ? base.logProb : 0;
    text += chosen;
  }
  return { text: text.slice(seed.length), meanLogProb: sumLP / steps };
}

export interface ExperimentPoint {
  id: number;
  settingsLabel: string;
  settingsKey: string;
  /** Unique continuations divided by BATCH_SIZE. */
  diversity: number;
  uniqueCount: number;
  /** Mean over samples of mean per-char base-model log-prob (nats). */
  meanLogProb: number;
  /** Most frequent continuations in the batch. */
  top: { text: string; count: number }[];
}

export function settingsLabel(s: SamplerSettings): string {
  const m =
    s.method === "topk"
      ? `top-k ${Math.round(s.topK)}`
      : s.method === "topp"
        ? `top-p ${s.topP.toFixed(2)}`
        : `min-p ${s.minP.toFixed(2)}`;
  return `T ${s.temperature.toFixed(2)}, ${m}`;
}

export function settingsKey(s: SamplerSettings): string {
  const p =
    s.method === "topk"
      ? Math.round(s.topK).toString()
      : s.method === "topp"
        ? s.topP.toFixed(2)
        : s.minP.toFixed(2);
  return `${s.method}:${p}:T${s.temperature.toFixed(2)}`;
}

export function runBatch(
  model: NGramModel,
  seed: string,
  steps: number,
  settings: SamplerSettings,
  n: number,
  rngSeed: number,
  id: number
): ExperimentPoint {
  const rng = makeRng(rngSeed);
  const counts = new Map<string, number>();
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const s = sampleContinuation(model, seed, steps, settings, rng);
    sum += s.meanLogProb;
    counts.set(s.text, (counts.get(s.text) ?? 0) + 1);
  }
  const top = Array.from(counts.entries())
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count || (a.text < b.text ? -1 : 1))
    .slice(0, 3);
  return {
    id,
    settingsLabel: settingsLabel(settings),
    settingsKey: settingsKey(settings),
    diversity: counts.size / n,
    uniqueCount: counts.size,
    meanLogProb: sum / n,
    top,
  };
}

// ------------------------------------------------------------------ misc

/** Render a space visibly; everything else passes through. */
export function displayChar(ch: string): string {
  return ch === " " ? "␣" : ch;
}

export function displayText(text: string): string {
  return text.split("").map(displayChar).join("");
}
