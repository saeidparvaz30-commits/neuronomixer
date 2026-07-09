// Pure math for the LLM-as-Judge guide. No React imports.
// Every displayed number (scores, agreement, Cohen's kappa, flips) comes from
// executing these functions on the corpus in types.ts. A verifier can recompute
// everything by running this module with node/tsx.

import { Answer, Choice, CorpusItem, JUDGE_MODEL } from "./types";

export interface JudgeSettings {
  /** 0-100: how heavily the rubric weights factual accuracy over style */
  strictness: number;
  /** 0-100: bonus for the answer shown first */
  positionBias: number;
  /** 0-100: bonus for the longer answer, scaled by how much longer it is */
  verbosityBias: number;
  /** 0-100: bonus for answers written by the judge's own model */
  selfPreference: number;
}

export const DEFAULT_SETTINGS: JudgeSettings = {
  strictness: 50,
  positionBias: 0,
  verbosityBias: 0,
  selfPreference: 0,
};

/** Maximum bias bonuses on the 0-1 quality scale, at a slider value of 100. */
export const POSITION_MAX_BONUS = 0.3;
export const VERBOSITY_MAX_BONUS = 0.5;
export const SELF_PREF_MAX_BONUS = 0.3;

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export interface RubricWeights {
  accuracy: number;
  coverage: number;
  clarity: number;
}

/**
 * Strictness reallocates rubric weight between substance and style.
 * At 0 the judge cares about polish (accuracy x0.5, clarity x2.0);
 * at 100 it cares almost only about facts (accuracy x3.0, clarity x0.5).
 */
export function rubricWeights(strictness: number): RubricWeights {
  const s = clamp01(strictness / 100);
  return {
    accuracy: 0.5 + 2.5 * s,
    coverage: 1,
    clarity: 2 - 1.5 * s,
  };
}

/** Weighted rubric quality, normalized to the 0-1 scale. */
export function rubricQuality(a: Answer, w: RubricWeights): number {
  const total = w.accuracy + w.coverage + w.clarity;
  const raw =
    w.accuracy * (a.features.accuracy / 4) +
    w.coverage * (a.features.coverage / 3) +
    w.clarity * (a.features.clarity / 3);
  return raw / total;
}

/**
 * Relative length advantage of `own` over `other`: word-count difference
 * divided by the mean length, clamped to [0, 1]. Zero when own is shorter.
 */
export function lengthAdvantage(ownWords: number, otherWords: number): number {
  const mean = (ownWords + otherWords) / 2;
  if (mean <= 0) return 0;
  return Math.max(0, Math.min(1, (ownWords - otherWords) / mean));
}

export interface AnswerScore {
  base: number;
  positionBonus: number;
  verbosityBonus: number;
  selfBonus: number;
  total: number;
}

export function scoreAnswer(
  answer: Answer,
  opponent: Answer,
  isFirst: boolean,
  settings: JudgeSettings
): AnswerScore {
  const w = rubricWeights(settings.strictness);
  const base = rubricQuality(answer, w);

  const positionBonus = isFirst
    ? (clamp01(settings.positionBias / 100)) * POSITION_MAX_BONUS
    : 0;

  const adv = lengthAdvantage(countWords(answer.text), countWords(opponent.text));
  const verbosityBonus = clamp01(settings.verbosityBias / 100) * VERBOSITY_MAX_BONUS * adv;

  const selfBonus =
    answer.author === JUDGE_MODEL
      ? clamp01(settings.selfPreference / 100) * SELF_PREF_MAX_BONUS
      : 0;

  return {
    base,
    positionBonus,
    verbosityBonus,
    selfBonus,
    total: base + positionBonus + verbosityBonus + selfBonus,
  };
}

export interface ItemVerdict {
  itemId: number;
  first: AnswerScore;
  second: AnswerScore;
  choice: Choice;
  agrees: boolean;
}

export function judgeItem(item: CorpusItem, settings: JudgeSettings): ItemVerdict {
  const first = scoreAnswer(item.first, item.second, true, settings);
  const second = scoreAnswer(item.second, item.first, false, settings);
  // An exact tie goes to the first answer: itself a tiny position artifact,
  // which is why the corpus is authored to avoid ties at default settings.
  const choice: Choice = first.total >= second.total ? "first" : "second";
  return { itemId: item.id, first, second, choice, agrees: choice === item.human };
}

export function judgeCorpus(
  corpus: readonly CorpusItem[],
  settings: JudgeSettings
): ItemVerdict[] {
  return corpus.map((item) => judgeItem(item, settings));
}

export interface KappaBreakdown {
  /** Observed agreement rate */
  po: number;
  /** Expected chance agreement from both raters' marginal pick rates */
  pe: number;
  kappa: number;
}

/**
 * Cohen's kappa for two raters over the binary categories first/second.
 * po = observed agreement rate; pe = expected agreement by chance from the
 * raters' marginal distributions; kappa = (po - pe) / (1 - pe).
 */
export function kappaBreakdown(
  judge: readonly Choice[],
  human: readonly Choice[]
): KappaBreakdown {
  const n = judge.length;
  if (n === 0 || n !== human.length) return { po: 0, pe: 0, kappa: 0 };

  let agree = 0;
  let judgeFirst = 0;
  let humanFirst = 0;
  for (let i = 0; i < n; i++) {
    if (judge[i] === human[i]) agree++;
    if (judge[i] === "first") judgeFirst++;
    if (human[i] === "first") humanFirst++;
  }

  const po = agree / n;
  const pJ = judgeFirst / n;
  const pH = humanFirst / n;
  const pe = pJ * pH + (1 - pJ) * (1 - pH);

  if (1 - pe < 1e-12) return { po, pe, kappa: po >= 1 ? 1 : 0 };
  return { po, pe, kappa: (po - pe) / (1 - pe) };
}

export function cohenKappa(judge: readonly Choice[], human: readonly Choice[]): number {
  return kappaBreakdown(judge, human).kappa;
}

export interface AgreementStats {
  agree: number;
  total: number;
  rate: number;
  /** Chance agreement implied by the two raters' marginal pick rates */
  pe: number;
  kappa: number;
}

export function agreementStats(
  verdicts: readonly ItemVerdict[],
  corpus: readonly CorpusItem[]
): AgreementStats {
  const humanById = new Map(corpus.map((c) => [c.id, c.human]));
  const judgeChoices = verdicts.map((v) => v.choice);
  const humanChoices = verdicts.map((v) => humanById.get(v.itemId) as Choice);
  const agree = verdicts.filter((v) => v.agrees).length;
  const total = verdicts.length;
  const breakdown = kappaBreakdown(judgeChoices, humanChoices);
  return {
    agree,
    total,
    rate: total > 0 ? agree / total : 0,
    pe: breakdown.pe,
    kappa: breakdown.kappa,
  };
}

/** Landis and Koch (1977) interpretation bands, a common convention. */
export function kappaLabel(kappa: number): string {
  if (kappa < 0) return "Worse than chance";
  if (kappa <= 0.2) return "Slight";
  if (kappa <= 0.4) return "Fair";
  if (kappa <= 0.6) return "Moderate";
  if (kappa <= 0.8) return "Substantial";
  return "Almost perfect";
}

/** Ids of items whose verdict differs between two judging runs. */
export function flippedItemIds(
  current: readonly ItemVerdict[],
  baseline: readonly ItemVerdict[]
): number[] {
  const baseById = new Map(baseline.map((v) => [v.itemId, v.choice]));
  return current
    .filter((v) => baseById.get(v.itemId) !== v.choice)
    .map((v) => v.itemId);
}

/** How many of the reader's baseline picks match the panel labels. */
export function baselineMatches(
  picks: Readonly<Record<number, Choice>>,
  corpus: readonly CorpusItem[]
): number {
  return corpus.filter((c) => picks[c.id] === c.human).length;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
