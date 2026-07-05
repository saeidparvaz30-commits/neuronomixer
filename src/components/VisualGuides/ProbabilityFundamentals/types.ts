// ── Types for Probability Fundamentals visual guide ────────────────────────

export type EventType = "coin_flip" | "die_roll" | "card_draw";
export type Operator = "none" | "AND" | "OR" | "NOT";

export interface CompoundEvent {
  firstType: EventType;
  firstOutcome: string;
  operator: Operator;
  secondType: EventType | null;
  secondOutcome: string | null;
  theoretical: number;
}

export interface SimState {
  isRunning: boolean;
  trialCount: number;
  matchCount: number;
  experimental: number;
  /** running experimental P sampled every 50 trials */
  history: number[];
  completed: boolean;
}

export type VennMode = "AND" | "OR" | "NOT";

export interface ProbabilityState {
  event: CompoundEvent;
  sim: SimState;
  vennMode: VennMode;
  /** JSON.stringify of each distinct CompoundEvent built */
  eventsBuilt: string[];
  simulationRun: boolean;
  vennRegionsClicked: string[];
}

// ── Outcome options ──────────────────────────────────────────────────────────

export const COIN_OUTCOMES = ["Heads", "Tails"] as const;

export const DIE_OUTCOMES = [
  "1", "2", "3", "4", "5", "6",
  "Even number", "Odd number", "> 3",
] as const;

export const CARD_OUTCOMES = [
  "Heart", "Spade", "Diamond", "Club",
  "Red card", "Black card", "Face card", "Ace",
] as const;

export type CoinOutcome = typeof COIN_OUTCOMES[number];
export type DieOutcome = typeof DIE_OUTCOMES[number];
export type CardOutcome = typeof CARD_OUTCOMES[number];

// ── Probability look-up ──────────────────────────────────────────────────────

export const SINGLE_P: Record<EventType, Record<string, number>> = {
  coin_flip: {
    Heads: 0.5,
    Tails: 0.5,
  },
  die_roll: {
    "1": 1 / 6,
    "2": 1 / 6,
    "3": 1 / 6,
    "4": 1 / 6,
    "5": 1 / 6,
    "6": 1 / 6,
    "Even number": 3 / 6,
    "Odd number": 3 / 6,
    "> 3": 3 / 6,
  },
  card_draw: {
    Heart: 13 / 52,
    Spade: 13 / 52,
    Diamond: 13 / 52,
    Club: 13 / 52,
    "Red card": 26 / 52,
    "Black card": 26 / 52,
    "Face card": 12 / 52,
    Ace: 4 / 52,
  },
};

export function outcomesFor(type: EventType): readonly string[] {
  if (type === "coin_flip") return COIN_OUTCOMES;
  if (type === "die_roll") return DIE_OUTCOMES;
  return CARD_OUTCOMES;
}

export function labelFor(type: EventType): string {
  if (type === "coin_flip") return "Coin Flip";
  if (type === "die_roll") return "Die Roll";
  return "Card Draw";
}

// ── Sample-space machinery ───────────────────────────────────────────────────
// Each event type is a finite sample space; outcomes are subsets of it.
// Compound events on the SAME type are evaluated on ONE draw from that space
// ("Roll a 1 OR 2" is a single roll: 2/6), exactly like overlapping sets in
// the Venn diagram section. Events on DIFFERENT types are independent draws.

export function sampleSpaceSize(type: EventType): number {
  return type === "coin_flip" ? 2 : type === "die_roll" ? 6 : 52;
}

/** Does elementary outcome `index` of the sample space satisfy `outcome`? */
function matchesOutcome(type: EventType, index: number, outcome: string): boolean {
  if (type === "coin_flip") {
    return (index === 0 ? "Heads" : "Tails") === outcome;
  }
  if (type === "die_roll") {
    const n = index + 1;
    if (outcome === "Even number") return n % 2 === 0;
    if (outcome === "Odd number") return n % 2 !== 0;
    if (outcome === "> 3") return n > 3;
    return String(n) === outcome;
  }
  // card_draw: 0–12 Hearts, 13–25 Spades, 26–38 Diamonds, 39–51 Clubs;
  // rank within suit: 0 = Ace, 10 = J, 11 = Q, 12 = K
  const suitIndex = Math.floor(index / 13);
  const rank = index % 13;
  const isRed = suitIndex === 0 || suitIndex === 2;
  if (outcome === "Heart") return suitIndex === 0;
  if (outcome === "Spade") return suitIndex === 1;
  if (outcome === "Diamond") return suitIndex === 2;
  if (outcome === "Club") return suitIndex === 3;
  if (outcome === "Red card") return isRed;
  if (outcome === "Black card") return !isRed;
  if (outcome === "Face card") return rank >= 10 && rank <= 12;
  if (outcome === "Ace") return rank === 0;
  return false;
}

/** Number of elementary outcomes satisfying `outcome`. */
export function countMatching(type: EventType, outcome: string): number {
  const N = sampleSpaceSize(type);
  let c = 0;
  for (let i = 0; i < N; i++) if (matchesOutcome(type, i, outcome)) c++;
  return c;
}

/** Number of elementary outcomes satisfying BOTH outcomes (same sample space). */
export function countMatchingBoth(type: EventType, o1: string, o2: string): number {
  const N = sampleSpaceSize(type);
  let c = 0;
  for (let i = 0; i < N; i++) {
    if (matchesOutcome(type, i, o1) && matchesOutcome(type, i, o2)) c++;
  }
  return c;
}

/** Compute theoretical probability of a CompoundEvent. */
export function calcTheoretical(
  firstType: EventType,
  firstOutcome: string,
  operator: Operator,
  secondType: EventType | null,
  secondOutcome: string | null,
): number {
  const pA = countMatching(firstType, firstOutcome) / sampleSpaceSize(firstType);

  if (operator === "none") return pA;

  if (operator === "NOT") return 1 - pA;

  if (!secondType || !secondOutcome) return pA;

  const pB = countMatching(secondType, secondOutcome) / sampleSpaceSize(secondType);

  if (firstType === secondType) {
    // Same sample space: one draw decides both events (overlapping sets).
    const pBoth =
      countMatchingBoth(firstType, firstOutcome, secondOutcome) /
      sampleSpaceSize(firstType);
    return operator === "AND" ? pBoth : pA + pB - pBoth;
  }

  // Different sample spaces: independent draws.
  if (operator === "AND") return pA * pB;

  // OR: P(A) + P(B) - P(A AND B)
  return pA + pB - pA * pB;
}

// ── Detailed trial result (for live visualizer) ──────────────────────────────

export interface TrialResult {
  hit: boolean;
  typeA: EventType;
  rawA: string;
  hitA: boolean;
  operator: Operator;
  typeB?: EventType;
  rawB?: string;
  hitB?: boolean;
}

// ── Simulation helpers ───────────────────────────────────────────────────────

/** Draw one elementary outcome index uniformly from the sample space. */
function sampleIndex(type: EventType): number {
  return Math.floor(Math.random() * sampleSpaceSize(type));
}

/** Human-readable label for an elementary outcome index. */
function indexLabel(type: EventType, index: number): string {
  if (type === "coin_flip") return index === 0 ? "Heads" : "Tails";
  if (type === "die_roll") return String(index + 1);
  const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const SUIT_SYMBOLS = ["♥", "♠", "♦", "♣"];
  return `${RANKS[index % 13]}${SUIT_SYMBOLS[Math.floor(index / 13)]}`;
}

/**
 * Simulate a single trial; returns true if the compound event occurred.
 * Same-type compounds use ONE draw evaluated against both outcomes
 * (matching calcTheoretical); different types draw independently.
 */
export function simulateTrial(event: CompoundEvent): boolean {
  const { firstType, firstOutcome, operator, secondType, secondOutcome } = event;

  const aIndex = sampleIndex(firstType);
  const aHit = matchesOutcome(firstType, aIndex, firstOutcome);

  if (operator === "none") return aHit;
  if (operator === "NOT") return !aHit;

  let bHit = false;
  if (secondType && secondOutcome) {
    const bIndex = secondType === firstType ? aIndex : sampleIndex(secondType);
    bHit = matchesOutcome(secondType, bIndex, secondOutcome);
  }

  if (operator === "AND") return aHit && bHit;
  // OR
  return aHit || bHit;
}

/** Simulate a single trial and return full detail for the live visualizer. */
export function simulateTrialDetailed(event: CompoundEvent): TrialResult {
  const { firstType, firstOutcome, operator, secondType, secondOutcome } = event;

  const aIndex = sampleIndex(firstType);
  const aHit = matchesOutcome(firstType, aIndex, firstOutcome);
  const aLabel = indexLabel(firstType, aIndex);

  if (operator === "none") {
    return { hit: aHit, typeA: firstType, rawA: aLabel, hitA: aHit, operator };
  }
  if (operator === "NOT") {
    return { hit: !aHit, typeA: firstType, rawA: aLabel, hitA: aHit, operator };
  }

  let bHit = false;
  let bLabel = "?";
  if (secondType && secondOutcome) {
    // Same type: the SAME draw decides both events (one roll, one card, ...).
    const bIndex = secondType === firstType ? aIndex : sampleIndex(secondType);
    bHit = matchesOutcome(secondType, bIndex, secondOutcome);
    bLabel = indexLabel(secondType, bIndex);
  }

  const hit = operator === "AND" ? aHit && bHit : aHit || bHit;
  return {
    hit,
    typeA: firstType, rawA: aLabel, hitA: aHit,
    operator,
    typeB: secondType ?? undefined, rawB: bLabel, hitB: bHit,
  };
}

// ── Default state ────────────────────────────────────────────────────────────

export const DEFAULT_EVENT: CompoundEvent = {
  firstType: "coin_flip",
  firstOutcome: "Heads",
  operator: "none",
  secondType: null,
  secondOutcome: null,
  theoretical: 0.5,
};

export const DEFAULT_SIM: SimState = {
  isRunning: false,
  trialCount: 0,
  matchCount: 0,
  experimental: 0,
  history: [],
  completed: false,
};

export const initialProbabilityState: ProbabilityState = {
  event: DEFAULT_EVENT,
  sim: DEFAULT_SIM,
  vennMode: "AND",
  eventsBuilt: [],
  simulationRun: false,
  vennRegionsClicked: [],
};
