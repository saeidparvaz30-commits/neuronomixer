// Pure math for the "How LLMs See" guide. No React in this module.
//
// What is real here: patch extraction reads the exact pixels the user drew,
// and every embedding is a genuine matrix multiplication of those pixels
// against the projection matrix. What is seeded pseudo-random (and disclosed
// as such in the UI): the projection matrix entries and the text embedding
// table, which stand in for learned weights. The arithmetic is real, the
// weights are not trained.

export const GRID = 24;
export const EMBED_DIM = 8;
export const PATCH_SIZES = [4, 6, 8, 12] as const;
export const DEFAULT_PATCH_SIZE = 8;

export const PROMPT_TOKENS = ["<bos>", "describe", "this", "image"] as const;

export type PresetId = "circle" | "gradient" | "checker" | "cross";

export const PRESETS: { id: PresetId; label: string }[] = [
  { id: "circle", label: "Ring" },
  { id: "gradient", label: "Gradient" },
  { id: "checker", label: "Checkerboard" },
  { id: "cross", label: "Cross" },
];

// ── Deterministic pseudo-random stream (SPEC LCG constants) ─────────────────

/** n uniforms in [0, 1) from the shared LCG, fully determined by the seed. */
export function seededUniforms(seed: number, n: number): number[] {
  let s = seed >>> 0;
  const out: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    out[i] = s / 0xffffffff;
  }
  return out;
}

/** djb2-style string hash, used to seed per-token text embeddings. */
export function hashString(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  }
  return h;
}

// ── Projection matrix (fixed, seeded, disclosed as untrained) ────────────────

const projectionCache = new Map<number, number[][]>();

/**
 * W has shape (patchSize^2 x EMBED_DIM). Entries are zero-mean uniforms in
 * [-1, 1] scaled by 1 / patchSize (= 1 / sqrt(inputDim)), so embedding
 * magnitudes stay comparable across patch sizes. Deterministic per size.
 */
export function projectionMatrix(patchSize: number): number[][] {
  const cached = projectionCache.get(patchSize);
  if (cached) return cached;
  const inDim = patchSize * patchSize;
  const flat = seededUniforms(97 + patchSize * 1009, inDim * EMBED_DIM);
  const w: number[][] = [];
  for (let i = 0; i < inDim; i++) {
    const row: number[] = new Array(EMBED_DIM);
    for (let j = 0; j < EMBED_DIM; j++) {
      row[j] = (flat[i * EMBED_DIM + j] * 2 - 1) / patchSize;
    }
    w.push(row);
  }
  projectionCache.set(patchSize, w);
  return w;
}

// ── Text embeddings (fixed seeded lookup table, disclosed as untrained) ──────

const textEmbedCache = new Map<string, number[]>();

export function textEmbedding(token: string): number[] {
  const cached = textEmbedCache.get(token);
  if (cached) return cached;
  const e = seededUniforms(hashString("tok:" + token), EMBED_DIM).map(
    (v) => v * 2 - 1
  );
  textEmbedCache.set(token, e);
  return e;
}

// ── Patch extraction and projection (real math over on-screen pixels) ────────

export interface Patch {
  index: number;
  row: number;
  col: number;
  /** patchSize * patchSize grayscale values in [0, 1], row-major. */
  pixels: number[];
}

export function extractPatches(pixels: number[], patchSize: number): Patch[] {
  const per = GRID / patchSize;
  const patches: Patch[] = [];
  for (let pr = 0; pr < per; pr++) {
    for (let pc = 0; pc < per; pc++) {
      const vals: number[] = [];
      for (let y = 0; y < patchSize; y++) {
        for (let x = 0; x < patchSize; x++) {
          vals.push(pixels[(pr * patchSize + y) * GRID + (pc * patchSize + x)]);
        }
      }
      patches.push({ index: pr * per + pc, row: pr, col: pc, pixels: vals });
    }
  }
  return patches;
}

/** e_j = sum_i x_i * W[i][j]. The actual multiplication behind every strip. */
export function projectPatch(patchPixels: number[], w: number[][]): number[] {
  const out: number[] = new Array(EMBED_DIM).fill(0);
  for (let i = 0; i < patchPixels.length; i++) {
    const x = patchPixels[i];
    for (let j = 0; j < EMBED_DIM; j++) {
      out[j] += x * w[i][j];
    }
  }
  return out;
}

// ── Preset images (pure, deterministic, hydration-safe) ─────────────────────

export function presetPixels(preset: PresetId): number[] {
  const px: number[] = new Array(GRID * GRID).fill(0);
  const c = (GRID - 1) / 2;
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      let v = 0;
      if (preset === "gradient") {
        v = (x + y) / (2 * (GRID - 1));
      } else if (preset === "checker") {
        v = (Math.floor(x / 4) + Math.floor(y / 4)) % 2;
      } else if (preset === "cross") {
        v =
          Math.abs(x - y) <= 1 || Math.abs(x + y - (GRID - 1)) <= 1 ? 1 : 0;
      } else {
        const d = Math.sqrt((x - c) * (x - c) + (y - c) * (y - c));
        v = Math.max(0, 1 - Math.abs(d - 8) / 2.5);
      }
      // Quantize so SSR and client fills match byte-for-byte.
      px[y * GRID + x] = Math.round(v * 100) / 100;
    }
  }
  return px;
}

// ── Display helpers ──────────────────────────────────────────────────────────

export function patchStats(vals: number[]): {
  mean: number;
  min: number;
  max: number;
} {
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const v of vals) {
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { mean: sum / vals.length, min, max };
}

export function patchCountFor(patchSize: number): number {
  const per = GRID / patchSize;
  return per * per;
}

export function sequenceLengthFor(patchSize: number): number {
  return PROMPT_TOKENS.length + patchCountFor(patchSize);
}

/** Grayscale ramp from the page background (#0f172a) to near-white (#f1f5f9). */
export function grayFill(v: number): string {
  const t = Math.max(0, Math.min(1, v));
  const r = Math.round(15 + t * (241 - 15));
  const g = Math.round(23 + t * (245 - 23));
  const b = Math.round(42 + t * (249 - 42));
  return `rgb(${r},${g},${b})`;
}

/** Diverging fill for embedding values: teal positive, purple negative. */
export function embedFill(v: number): string {
  const a = Math.max(0.12, Math.min(1, Math.abs(v))).toFixed(2);
  return v >= 0 ? `rgba(59,180,164,${a})` : `rgba(168,85,247,${a})`;
}

export function formatVector(e: number[]): string {
  return `[${e.map((v) => v.toFixed(2)).join(", ")}]`;
}
