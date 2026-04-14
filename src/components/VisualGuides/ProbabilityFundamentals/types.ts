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

/** Compute theoretical probability of a CompoundEvent. */
export function calcTheoretical(
  firstType: EventType,
  firstOutcome: string,
  operator: Operator,
  secondType: EventType | null,
  secondOutcome: string | null,
): number {
  const pA = SINGLE_P[firstType]?.[firstOutcome] ?? 0;

  if (operator === "none") return pA;

  if (operator === "NOT") return 1 - pA;

  if (!secondType || !secondOutcome) return pA;

  const pB = SINGLE_P[secondType]?.[secondOutcome] ?? 0;

  if (operator === "AND") return pA * pB;

  // OR: P(A) + P(B) - P(A AND B)
  return pA + pB - pA * pB;
}

// ── Simulation helpers ───────────────────────────────────────────────────────

/** Simulate whether a single EventType/outcome pair occurred. */
function checkSingleEvent(type: EventType, outcome: string): boolean {
  if (type === "coin_flip") {
    const result = Math.random() < 0.5 ? "Heads" : "Tails";
    return result === outcome;
  }

  if (type === "die_roll") {
    const n = Math.floor(Math.random() * 6) + 1;
    if (outcome === "Even number") return n % 2 === 0;
    if (outcome === "Odd number") return n % 2 !== 0;
    if (outcome === "> 3") return n > 3;
    return String(n) === outcome;
  }

  // card_draw — draw a card from a 52-card deck
  // Suits: 0–12 = Hearts, 13–25 = Spades, 26–38 = Diamonds, 39–51 = Clubs
  // Rank within suit: 0 = Ace, 1–9 = 2–10, 10 = Jack, 11 = Queen, 12 = King
  const card = Math.floor(Math.random() * 52);
  const suitIndex = Math.floor(card / 13); // 0=Hearts, 1=Spades, 2=Diamonds, 3=Clubs
  const rank = card % 13; // 0=Ace, 10=J, 11=Q, 12=K
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

/** Simulate a single trial; returns true if the compound event occurred. */
export function simulateTrial(event: CompoundEvent): boolean {
  const { firstType, firstOutcome, operator, secondType, secondOutcome } = event;

  const aHit = checkSingleEvent(firstType, firstOutcome);

  if (operator === "none") return aHit;
  if (operator === "NOT") return !aHit;

  const bHit =
    secondType && secondOutcome
      ? checkSingleEvent(secondType, secondOutcome)
      : false;

  if (operator === "AND") return aHit && bHit;
  // OR
  return aHit || bHit;
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
