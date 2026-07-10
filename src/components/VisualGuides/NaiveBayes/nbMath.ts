/**
 * Pure math for the naive-bayes guide. No React imports.
 *
 * Every number the guide displays is computed here from the visible
 * corpus (spam filter view) or the on-screen points (Gaussian view),
 * so a verifier can recompute all of them with node/tsx:
 * priors, Laplace-smoothed likelihoods, log-odds contributions,
 * posteriors, Gaussian fits, and the decision boundary contour.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Spam filter view: Bernoulli naive Bayes over a tiny visible corpus
// ─────────────────────────────────────────────────────────────────────────────

export const VOCAB = ["free", "winner", "click", "meeting", "invoice", "lunch"] as const;
export type VocabWord = (typeof VOCAB)[number];

export type MessageLabel = "spam" | "ham";

export interface CorpusMessage {
  id: string;
  text: string;
  /** Which vocabulary words appear in the text (kept explicit and checkable). */
  words: readonly VocabWord[];
  label: MessageLabel;
}

/** The entire training corpus. All priors and default likelihoods come from these ten messages. */
export const CORPUS: readonly CorpusMessage[] = [
  { id: "s1", text: "Winner! Click to claim your free prize", words: ["winner", "click", "free"], label: "spam" },
  { id: "s2", text: "Your free trial ends soon, click now", words: ["free", "click"], label: "spam" },
  { id: "s3", text: "Winner alert, your free gift is inside", words: ["winner", "free"], label: "spam" },
  { id: "s4", text: "Final notice: click to unlock your free reward", words: ["click", "free"], label: "spam" },
  { id: "h1", text: "Team meeting moved to 3pm", words: ["meeting"], label: "ham" },
  { id: "h2", text: "Invoice 204 attached, due Friday", words: ["invoice"], label: "ham" },
  { id: "h3", text: "Lunch after the meeting?", words: ["lunch", "meeting"], label: "ham" },
  { id: "h4", text: "Please review the invoice before our meeting", words: ["invoice", "meeting"], label: "ham" },
  { id: "h5", text: "Are you free for lunch tomorrow?", words: ["free", "lunch"], label: "ham" },
  { id: "h6", text: "Click the shared doc link before standup", words: ["click"], label: "ham" },
];

export interface CorpusPriors {
  spamCount: number;
  hamCount: number;
  total: number;
  pSpam: number;
  pHam: number;
}

/** Class priors are the label frequencies in the corpus. */
export function corpusPriors(corpus: readonly CorpusMessage[]): CorpusPriors {
  const spamCount = corpus.filter((m) => m.label === "spam").length;
  const total = corpus.length;
  const hamCount = total - spamCount;
  return { spamCount, hamCount, total, pSpam: spamCount / total, pHam: hamCount / total };
}

export interface WordLikelihoods {
  /** P(word present | spam), aligned with the vocab argument. */
  spam: number[];
  /** P(word present | ham), aligned with the vocab argument. */
  ham: number[];
}

/**
 * Laplace add-1 smoothed Bernoulli likelihoods estimated from the corpus:
 * P(w | c) = (count of class-c messages containing w + 1) / (class-c messages + 2).
 */
export function corpusLikelihoods(
  corpus: readonly CorpusMessage[],
  vocab: readonly string[]
): WordLikelihoods {
  const spamMsgs = corpus.filter((m) => m.label === "spam");
  const hamMsgs = corpus.filter((m) => m.label === "ham");
  const count = (msgs: readonly CorpusMessage[], w: string) =>
    msgs.filter((m) => (m.words as readonly string[]).includes(w)).length;
  return {
    spam: vocab.map((w) => (count(spamMsgs, w) + 1) / (spamMsgs.length + 2)),
    ham: vocab.map((w) => (count(hamMsgs, w) + 1) / (hamMsgs.length + 2)),
  };
}

export interface WordContribution {
  word: string;
  present: boolean;
  /**
   * log( P(evidence for this word | spam) / P(evidence | ham) ).
   * Evidence is "word present" or "word absent"; positive pushes toward spam.
   */
  logRatio: number;
}

export interface PosteriorResult {
  pSpam: number;
  pHam: number;
  /** Total log odds: prior term plus every word contribution. */
  logOdds: number;
  /** log( P(spam) / P(ham) ), the prior contribution. */
  priorLog: number;
  contributions: WordContribution[];
}

/**
 * Bernoulli naive Bayes posterior for a message described by which vocab
 * words are present. Absent words contribute (1 - likelihood) factors.
 * Computed in log space; the posterior is the sigmoid of the log odds.
 */
export function bernoulliPosterior(
  present: readonly boolean[],
  likeSpam: readonly number[],
  likeHam: readonly number[],
  pSpam: number,
  pHam: number,
  vocab: readonly string[] = VOCAB
): PosteriorResult {
  const priorLog = Math.log(pSpam / pHam);
  let logOdds = priorLog;
  const contributions: WordContribution[] = vocab.map((word, i) => {
    const s = present[i] ? likeSpam[i] : 1 - likeSpam[i];
    const h = present[i] ? likeHam[i] : 1 - likeHam[i];
    const logRatio = Math.log(s / h);
    logOdds += logRatio;
    return { word, present: present[i], logRatio };
  });
  const post = 1 / (1 + Math.exp(-logOdds));
  return { pSpam: post, pHam: 1 - post, logOdds, priorLog, contributions };
}

// ─────────────────────────────────────────────────────────────────────────────
// Gaussian naive Bayes view: 2D points, per-axis Gaussians, decision boundary
// ─────────────────────────────────────────────────────────────────────────────

export interface Pt {
  x: number;
  y: number;
}

/** Data domain for both features. */
export const DOMAIN = { x0: 0, x1: 10, y0: 0, y1: 10 } as const;

/** Variance floor so a stacked cluster cannot produce a degenerate Gaussian. */
export const VAR_FLOOR = 0.05;

export const INITIAL_HAM_POINTS: readonly Pt[] = [
  { x: 2.4, y: 3.1 },
  { x: 3.6, y: 2.2 },
  { x: 1.9, y: 4.0 },
  { x: 3.1, y: 3.8 },
  { x: 4.2, y: 2.9 },
  { x: 2.8, y: 1.8 },
  { x: 3.9, y: 4.4 },
  { x: 1.6, y: 2.6 },
];

export const INITIAL_SPAM_POINTS: readonly Pt[] = [
  { x: 6.2, y: 7.1 },
  { x: 7.4, y: 6.3 },
  { x: 8.1, y: 7.8 },
  { x: 6.8, y: 5.6 },
  { x: 7.9, y: 6.9 },
  { x: 5.9, y: 6.6 },
  { x: 7.1, y: 8.2 },
  { x: 8.6, y: 5.9 },
];

export interface ClassFit {
  mean: [number, number];
  /** Per-axis MLE variance with VAR_FLOOR applied: the diagonal covariance. */
  variance: [number, number];
  prior: number;
  n: number;
}

export interface GNBFit {
  ham: ClassFit;
  spam: ClassFit;
}

function fitClass(pts: readonly Pt[], prior: number): ClassFit {
  const n = pts.length;
  const mx = pts.reduce((a, p) => a + p.x, 0) / n;
  const my = pts.reduce((a, p) => a + p.y, 0) / n;
  const vx = Math.max(VAR_FLOOR, pts.reduce((a, p) => a + (p.x - mx) ** 2, 0) / n);
  const vy = Math.max(VAR_FLOOR, pts.reduce((a, p) => a + (p.y - my) ** 2, 0) / n);
  return { mean: [mx, my], variance: [vx, vy], prior, n };
}

/** Fit means, per-axis variances, and priors from the actual on-screen points. */
export function fitGaussianNB(hamPts: readonly Pt[], spamPts: readonly Pt[]): GNBFit {
  const total = hamPts.length + spamPts.length;
  return {
    ham: fitClass(hamPts, hamPts.length / total),
    spam: fitClass(spamPts, spamPts.length / total),
  };
}

function logGauss(v: number, mean: number, variance: number): number {
  return -0.5 * Math.log(2 * Math.PI * variance) - (v - mean) ** 2 / (2 * variance);
}

/** log P(spam | x, y) - log P(ham | x, y); the shared evidence term cancels. */
export function gnbLogOdds(x: number, y: number, fit: GNBFit): number {
  const s =
    Math.log(fit.spam.prior) +
    logGauss(x, fit.spam.mean[0], fit.spam.variance[0]) +
    logGauss(y, fit.spam.mean[1], fit.spam.variance[1]);
  const h =
    Math.log(fit.ham.prior) +
    logGauss(x, fit.ham.mean[0], fit.ham.variance[0]) +
    logGauss(y, fit.ham.mean[1], fit.ham.variance[1]);
  return s - h;
}

/** Posterior P(spam | x, y) under the current fit. */
export function gnbPosterior(x: number, y: number, fit: GNBFit): number {
  return 1 / (1 + Math.exp(-gnbLogOdds(x, y, fit)));
}

/** One contour line segment in data coordinates: [ax, ay, bx, by]. */
export type Segment = [number, number, number, number];

/**
 * Marching squares on the zero level set of gnbLogOdds over DOMAIN:
 * the exact decision boundary of the fitted Gaussian naive Bayes model.
 */
export function contourSegments(fit: GNBFit, nx = 56, ny = 56): Segment[] {
  const { x0, x1, y0, y1 } = DOMAIN;
  const gx = (i: number) => x0 + ((x1 - x0) * i) / nx;
  const gy = (j: number) => y0 + ((y1 - y0) * j) / ny;
  const vals: number[][] = [];
  for (let j = 0; j <= ny; j++) {
    const row: number[] = [];
    for (let i = 0; i <= nx; i++) row.push(gnbLogOdds(gx(i), gy(j), fit));
    vals.push(row);
  }
  const segs: Segment[] = [];
  const t = (a: number, b: number) => a / (a - b);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const v00 = vals[j][i];
      const v10 = vals[j][i + 1];
      const v11 = vals[j + 1][i + 1];
      const v01 = vals[j + 1][i];
      const idx =
        (v00 > 0 ? 1 : 0) | (v10 > 0 ? 2 : 0) | (v11 > 0 ? 4 : 0) | (v01 > 0 ? 8 : 0);
      if (idx === 0 || idx === 15) continue;
      const xa = gx(i);
      const xb = gx(i + 1);
      const ya = gy(j);
      const yb = gy(j + 1);
      const bottom: [number, number] = [xa + (xb - xa) * t(v00, v10), ya];
      const top: [number, number] = [xa + (xb - xa) * t(v01, v11), yb];
      const left: [number, number] = [xa, ya + (yb - ya) * t(v00, v01)];
      const right: [number, number] = [xb, ya + (yb - ya) * t(v10, v11)];
      const add = (p: [number, number], q: [number, number]) =>
        segs.push([p[0], p[1], q[0], q[1]]);
      switch (idx) {
        case 1:
        case 14:
          add(left, bottom);
          break;
        case 2:
        case 13:
          add(bottom, right);
          break;
        case 3:
        case 12:
          add(left, right);
          break;
        case 4:
        case 11:
          add(top, right);
          break;
        case 6:
        case 9:
          add(bottom, top);
          break;
        case 7:
        case 8:
          add(left, top);
          break;
        case 5:
          add(left, top);
          add(bottom, right);
          break;
        case 10:
          add(left, bottom);
          add(top, right);
          break;
      }
    }
  }
  return segs;
}

/** Round to 2 decimals (quantization for state and rendered coordinates). */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
