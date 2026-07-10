/**
 * Pure math for the KV Cache guide. No React.
 *
 * Every number the guide displays is computed here from the on-screen
 * configuration. Bytes use binary units (1 GB = 1024^3 bytes), which is how
 * GPU memory is reported by nvidia-smi.
 */

// ── Dtypes ────────────────────────────────────────────────────────────────

export type Dtype = "fp32" | "fp16" | "int8";

export const DTYPES: { id: Dtype; label: string; bytes: number }[] = [
  { id: "fp32", label: "FP32", bytes: 4 },
  { id: "fp16", label: "FP16 / BF16", bytes: 2 },
  { id: "int8", label: "INT8", bytes: 1 },
];

export function dtypeBytes(d: Dtype): number {
  return d === "fp32" ? 4 : d === "fp16" ? 2 : 1;
}

// ── Attention variants ────────────────────────────────────────────────────

export type AttnVariant = "mha" | "gqa" | "mqa";

/** Query heads per KV head under GQA, as used by Llama 3 (64 q heads, 8 kv heads). */
export const GQA_GROUP_SIZE = 8;

export function kvHeadsFor(variant: AttnVariant, queryHeads: number): number {
  if (variant === "mha") return queryHeads;
  if (variant === "mqa") return 1;
  return Math.max(1, Math.round(queryHeads / GQA_GROUP_SIZE));
}

// ── KV cache size ─────────────────────────────────────────────────────────

export interface CacheConfig {
  layers: number;
  kvHeads: number;
  headDim: number;
  seqLen: number;
  bytesPerValue: number;
}

/**
 * Total KV cache bytes for batch size 1:
 * 2 (one K tensor + one V tensor) x layers x kvHeads x headDim x seqLen x bytes.
 */
export function kvCacheBytes(cfg: CacheConfig): number {
  return 2 * cfg.layers * cfg.kvHeads * cfg.headDim * cfg.seqLen * cfg.bytesPerValue;
}

/** Bytes written to the cache per generated token (one position, all layers). */
export function bytesPerToken(cfg: Omit<CacheConfig, "seqLen">): number {
  return 2 * cfg.layers * cfg.kvHeads * cfg.headDim * cfg.bytesPerValue;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes.toFixed(0)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  if (gb < 1024) return `${gb.toFixed(2)} GB`;
  return `${(gb / 1024).toFixed(2)} TB`;
}

// ── Attention FLOPs, with vs without cache ────────────────────────────────
//
// Counted from the attention formula softmax(QK^T / sqrt(d)) V, scores and
// weighted sum only (projections and MLP excluded, softmax itself ignored):
// one query attending over L cached positions costs, per layer per query head,
//   QK^T : 2 x L x d   (multiply + add per element)
//   AV   : 2 x L x d
// so 4 x L x d. Query heads count in full even under GQA: sharing K/V shrinks
// memory, not the number of dot products.

/** FLOPs for ONE decode step when L tokens (including the new one) are cached. */
export function decodeStepFlops(
  cachedLen: number,
  layers: number,
  queryHeads: number,
  headDim: number
): number {
  return 4 * cachedLen * headDim * layers * queryHeads;
}

/**
 * FLOPs for one full causal forward pass over n tokens (query i attends to i
 * positions): sum_{i=1..n} 4 i d = 2 n (n+1) d, per layer per query head.
 */
export function fullCausalAttnFlops(
  n: number,
  layers: number,
  queryHeads: number,
  headDim: number
): number {
  return 2 * n * (n + 1) * headDim * layers * queryHeads;
}

/** Total attention FLOPs to prefill `prompt` tokens then decode `gen` tokens WITH a KV cache. */
export function totalFlopsWithCache(
  prompt: number,
  gen: number,
  layers: number,
  queryHeads: number,
  headDim: number
): number {
  let total = fullCausalAttnFlops(prompt, layers, queryHeads, headDim);
  // sum_{t=1..gen} 4 (prompt + t) d = 4 d (gen*prompt + gen(gen+1)/2)
  total += 4 * headDim * layers * queryHeads * (gen * prompt + (gen * (gen + 1)) / 2);
  return total;
}

/** Total attention FLOPs WITHOUT a cache: every step re-runs the full causal pass. */
export function totalFlopsWithoutCache(
  prompt: number,
  gen: number,
  layers: number,
  queryHeads: number,
  headDim: number
): number {
  let total = fullCausalAttnFlops(prompt, layers, queryHeads, headDim);
  for (let t = 1; t <= gen; t++) {
    total += fullCausalAttnFlops(prompt + t, layers, queryHeads, headDim);
  }
  return total;
}

export function formatFlops(f: number): string {
  if (f < 1e6) return `${(f / 1e3).toFixed(1)} KFLOPs`;
  if (f < 1e9) return `${(f / 1e6).toFixed(1)} MFLOPs`;
  if (f < 1e12) return `${(f / 1e9).toFixed(2)} GFLOPs`;
  if (f < 1e15) return `${(f / 1e12).toFixed(2)} TFLOPs`;
  return `${(f / 1e15).toFixed(2)} PFLOPs`;
}

export function formatCount(n: number): string {
  if (n < 1000) return n.toFixed(0);
  if (n < 1e6) return `${(n / 1e3).toFixed(1)}k`;
  return `${(n / 1e6).toFixed(1)}M`;
}

// ── Calculator options ────────────────────────────────────────────────────

export const SEQ_OPTIONS = [512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072];

export function formatSeq(n: number): string {
  return n >= 1024 ? `${n / 1024}k` : `${n}`;
}

/** Published GPU memory capacities (NVIDIA product specifications). */
export const GPUS: { name: string; gb: number }[] = [
  { name: "RTX 4090", gb: 24 },
  { name: "A100 80GB", gb: 80 },
  { name: "H100 80GB", gb: 80 },
];

export const GPU_CITATION = "GPU capacities from NVIDIA published product specifications.";

/**
 * Architecture presets. Values are from the model papers:
 * Llama 2 (Touvron et al., 2023), Llama 3 (Grattafiori et al., 2024).
 */
export interface Preset {
  id: string;
  label: string;
  layers: number;
  heads: number;
  headDim: number;
  variant: AttnVariant;
}

export const PRESETS: Preset[] = [
  { id: "llama2-7b", label: "Llama 2 7B", layers: 32, heads: 32, headDim: 128, variant: "mha" },
  { id: "llama3-70b", label: "Llama 3 70B", layers: 80, heads: 64, headDim: 128, variant: "gqa" },
];

export const PRESET_CITATION =
  "Preset architectures from the Llama 2 paper (Touvron et al., 2023) and the Llama 3 paper (Grattafiori et al., 2024).";

// ── Toy model for the decode animation ────────────────────────────────────

export const TOY = {
  layers: 6,
  heads: 8,
  headDim: 64,
  dtype: "fp16" as Dtype,
};

export const TOY_BYTES_PER_CELL = 2 * TOY.heads * TOY.headDim * dtypeBytes(TOY.dtype); // K+V, all heads, one layer, one position

/** Illustrative token strings; the cache mechanics and byte counts are real. */
export const TOKENS = [
  "The", "cache", "stores", "keys", "and", "values",
  "so", "each", "new", "token", "only", "computes",
  "its", "own", "then", "reads", "the", "rest",
];

export const PROMPT_LEN = 6;

/** Cache bytes for the toy model once `filled` positions are cached. */
export function toyCacheBytes(filled: number): number {
  return kvCacheBytes({
    layers: TOY.layers,
    kvHeads: TOY.heads,
    headDim: TOY.headDim,
    seqLen: filled,
    bytesPerValue: dtypeBytes(TOY.dtype),
  });
}
