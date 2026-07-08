// Types and constants for Random Variables & Expected Value Visual Guide

// ── Playground modes ─────────────────────────────────────────────────────────

export type PlaygroundMode = "custom" | "coin" | "lottery";

// ── Row in the payout table ───────────────────────────────────────────────────

export interface PayoutRow {
  id: string;
  outcome: number;   // xᵢ — can be negative
  probability: number; // pᵢ — should be in [0, 1]
}

// ── Simulation state ──────────────────────────────────────────────────────────

export interface SimState {
  isRunning: boolean;
  trialCount: number;
  runningSum: number;
  runningAvg: number;
  history: HistoryPoint[]; // sampled snapshots
  completed: boolean;
  totalTrials: number;
}

export interface HistoryPoint {
  trial: number;
  avg: number;
}

export const DEFAULT_SIM: SimState = {
  isRunning: false,
  trialCount: 0,
  runningSum: 0,
  runningAvg: 0,
  history: [],
  completed: false,
  totalTrials: 1000,
};

// ── Fixed distributions ───────────────────────────────────────────────────────

export const FAIR_COIN_ROWS: PayoutRow[] = [
  { id: "coin-h", outcome: 1, probability: 0.5 },
  { id: "coin-t", outcome: -1, probability: 0.5 },
];

// Powerball-style simplified 5-tier lottery
// $2 ticket cost is factored into EV contribution as: prize * p - ticketCostShare
// We split the $2 cost proportionally as 2 * p for marginal cost per tier
export interface LotteryTier {
  label: string;
  prize: number;       // raw prize amount in dollars
  probability: number; // 1 in odds (true probability)
  odds: string;        // human-readable "1 in X"
}

export const LOTTERY_TIERS: LotteryTier[] = [
  { label: "Jackpot",      prize: 200_000_000, probability: 1 / 292_201_338, odds: "1 in 292,201,338" },
  { label: "Match 5",      prize: 1_000_000,   probability: 1 / 11_688_054,  odds: "1 in 11,688,054" },
  { label: "Match 4+PB",   prize: 50_000,      probability: 1 / 913_129,     odds: "1 in 913,129" },
  { label: "Match 4",      prize: 100,         probability: 1 / 36_525,      odds: "1 in 36,525" },
  { label: "Match 3+PB",   prize: 100,         probability: 1 / 14_494,      odds: "1 in 14,494" },
  { label: "Match 3",      prize: 7,           probability: 1 / 580,         odds: "1 in 580" },
  { label: "Match 2+PB",   prize: 7,           probability: 1 / 701,         odds: "1 in 701" },
  { label: "Match 1+PB",   prize: 4,           probability: 1 / 92,          odds: "1 in 92" },
  { label: "Match PB only",prize: 4,           probability: 1 / 38,          odds: "1 in 38" },
];

export const LOTTERY_TICKET_COST = 2;

/** Compute EV for a set of payout rows (returns NaN if probabilities invalid) */
export function computeEV(rows: PayoutRow[]): number {
  return rows.reduce((sum, r) => sum + r.outcome * r.probability, 0);
}

/** Sum of all probabilities */
export function sumProbabilities(rows: PayoutRow[]): number {
  return rows.reduce((s, r) => s + r.probability, 0);
}

/** Probabilities are valid when they sum to ~1.0 */
export function probabilitiesValid(rows: PayoutRow[]): boolean {
  const s = sumProbabilities(rows);
  return Math.abs(s - 1.0) <= 0.001;
}

/** Sample one outcome from a distribution (for simulation) */
export function sampleOutcome(rows: PayoutRow[]): number {
  const r = Math.random();
  let cumulative = 0;
  for (const row of rows) {
    cumulative += row.probability;
    if (r <= cumulative) return row.outcome;
  }
  return rows[rows.length - 1].outcome;
}

/** Build lottery payout rows (net gain = prize - ticket cost) */
export function buildLotteryRows(): PayoutRow[] {
  const rows: PayoutRow[] = LOTTERY_TIERS.map((tier) => ({
    id: tier.label,
    outcome: tier.prize - LOTTERY_TICKET_COST,
    probability: tier.probability,
  }));

  // Add the "win nothing" row
  const winProb = LOTTERY_TIERS.reduce((s, t) => s + t.probability, 0);
  rows.push({
    id: "no-win",
    outcome: -LOTTERY_TICKET_COST,
    probability: 1 - winProb,
  });

  return rows;
}

// ── Default custom distribution ───────────────────────────────────────────────

export const DEFAULT_CUSTOM_ROWS: PayoutRow[] = [
  { id: "r1", outcome: 10, probability: 0.2 },
  { id: "r2", outcome: 5, probability: 0.3 },
  { id: "r3", outcome: 0, probability: 0.3 },
  { id: "r4", outcome: -5, probability: 0.2 },
];
