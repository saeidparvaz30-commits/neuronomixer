// Pure math and data module for the Scaling Laws guide. No React.
//
// The parametric loss law and its constants come from Hoffmann et al. 2022,
// "Training Compute-Optimal Large Language Models" (arXiv:2203.15556),
// Approach 3 parametric fit (their Equation 10):
//
//   L(N, D) = E + A / N^alpha + B / D^beta
//
// with E = 1.69, A = 406.4, B = 410.7, alpha = 0.34, beta = 0.28.
// Compute is approximated by the standard C = 6 * N * D FLOPs rule
// (Kaplan et al. 2020, arXiv:2001.08361).

export const CHINCHILLA = {
  E: 1.69,
  A: 406.4,
  B: 410.7,
  alpha: 0.34,
  beta: 0.28,
} as const;

export const CHINCHILLA_CITATION =
  "Hoffmann et al. 2022, arXiv:2203.15556, Approach 3 parametric fit";

/** Predicted cross-entropy loss for N parameters trained on D tokens. */
export function chinchillaLoss(n: number, d: number): number {
  const { E, A, B, alpha, beta } = CHINCHILLA;
  return E + A / Math.pow(n, alpha) + B / Math.pow(d, beta);
}

/** Training compute estimate in FLOPs: C = 6 N D. */
export function flopsFor(n: number, d: number): number {
  return 6 * n * d;
}

export interface Allocation {
  n: number;
  d: number;
  loss: number;
}

/**
 * Compute-optimal allocation for a FLOPs budget c, derived by minimizing
 * L(N, C / (6N)) over N. Closed form:
 *   N_opt = G * (C/6)^(beta / (alpha + beta)),
 *   G = (alpha * A / (beta * B))^(1 / (alpha + beta)).
 */
export function optimalAllocation(c: number): Allocation {
  const { A, B, alpha, beta } = CHINCHILLA;
  const G = Math.pow((alpha * A) / (beta * B), 1 / (alpha + beta));
  const n = G * Math.pow(c / 6, beta / (alpha + beta));
  const d = c / (6 * n);
  return { n, d, loss: chinchillaLoss(n, d) };
}

export interface IsoFlopPoint {
  logN: number;
  loss: number;
}

/**
 * Predicted loss along an iso-FLOP constraint: for each log10(N) in logNs,
 * D is forced to c / (6N) and the loss is evaluated there.
 */
export function lossAlongIsoFlop(c: number, logNs: number[]): IsoFlopPoint[] {
  return logNs.map((logN) => {
    const n = Math.pow(10, logN);
    return { logN, loss: chinchillaLoss(n, c / (6 * n)) };
  });
}

// ── Historical models (published parameter and token counts only) ────────────
// Every entry carries its source. Predicted losses shown in the UI are the
// Chinchilla formula evaluated at these (N, D); they are NOT the models'
// reported training losses (tokenizer and data distribution shift the
// constants).

export interface HistoricalModel {
  id: string;
  name: string;
  params: number; // N
  tokens: number; // D
  year: number;
  source: string; // short citation shown in the UI
  arxiv: string;
}

export const HISTORICAL_MODELS: HistoricalModel[] = [
  {
    id: "gpt3",
    name: "GPT-3",
    params: 175e9,
    tokens: 300e9,
    year: 2020,
    source: "Brown et al. 2020",
    arxiv: "2005.14165",
  },
  {
    id: "gopher",
    name: "Gopher",
    params: 280e9,
    tokens: 300e9,
    year: 2021,
    source: "Rae et al. 2021",
    arxiv: "2112.11446",
  },
  {
    id: "mtnlg",
    name: "MT-NLG",
    params: 530e9,
    tokens: 270e9,
    year: 2022,
    source: "Smith et al. 2022",
    arxiv: "2201.11990",
  },
  {
    id: "chinchilla",
    name: "Chinchilla",
    params: 70e9,
    tokens: 1.4e12,
    year: 2022,
    source: "Hoffmann et al. 2022",
    arxiv: "2203.15556",
  },
  {
    id: "palm",
    name: "PaLM",
    params: 540e9,
    tokens: 780e9,
    year: 2022,
    source: "Chowdhery et al. 2022",
    arxiv: "2204.02311",
  },
  {
    id: "llama65b",
    name: "LLaMA 65B",
    params: 65e9,
    tokens: 1.4e12,
    year: 2023,
    source: "Touvron et al. 2023",
    arxiv: "2302.13971",
  },
  {
    id: "llama2_70b",
    name: "Llama 2 70B",
    params: 70e9,
    tokens: 2.0e12,
    year: 2023,
    source: "Touvron et al. 2023",
    arxiv: "2307.09288",
  },
  {
    id: "llama3_405b",
    name: "Llama 3.1 405B",
    params: 405e9,
    tokens: 15.6e12,
    year: 2024,
    source: "Grattafiori et al. 2024",
    arxiv: "2407.21783",
  },
];

// ── Formatting helpers (deterministic, hydration-safe) ────────────────────────

/** 7.0e10 -> "70B", 1.4e12 -> "1.4T", 2.3e8 -> "230M". */
export function formatCount(v: number): string {
  if (v >= 1e12) return trimZero(v / 1e12) + "T";
  if (v >= 1e9) return trimZero(v / 1e9) + "B";
  if (v >= 1e6) return trimZero(v / 1e6) + "M";
  return trimZero(v / 1e3) + "K";
}

function trimZero(x: number): string {
  const s = x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2);
  return s.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

/** 3.15e23 -> "3.2e23" (scientific, one decimal in the mantissa). */
export function formatFlops(c: number): string {
  const exp = Math.floor(Math.log10(c));
  const mantissa = c / Math.pow(10, exp);
  const m = mantissa >= 9.95 ? "10" : mantissa.toFixed(1);
  return `${m}e${exp}`;
}
