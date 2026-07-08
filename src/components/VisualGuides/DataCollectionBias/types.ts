// Pure data + math for the Data Collection Bias guide. No React in this file.
// Everything displayed in the guide is computed from the structures defined here.

// ── Seeded PRNG (mulberry32) ─────────────────────────────────────────────────
// Deterministic 32-bit generator, uniform in [0, 1). All initial data flows
// through this so the server and client render identical numbers.

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function mean(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

// ── Section 1: a city of 400 people and three collection channels ───────────

export interface Person {
  age: number;
  /** Daily hours online, the attribute the survey tries to measure. */
  hours: number;
  hasLandline: boolean;
  hasApp: boolean;
  freeDaytime: boolean;
  /** Would this person actually answer if reached? (non-response layer) */
  willAnswer: boolean;
}

export const POPULATION_SEED = 20260708;
export const POPULATION_SIZE = 400;

/** Landline ownership rises steeply with age. */
function pLandline(age: number): number {
  if (age >= 65) return 0.85;
  if (age >= 45) return 0.5;
  if (age >= 30) return 0.18;
  return 0.06;
}

/** App installation falls with age. */
function pApp(age: number): number {
  if (age <= 30) return 0.9;
  if (age <= 45) return 0.6;
  if (age <= 64) return 0.3;
  return 0.1;
}

/** Free on a weekday afternoon: students and retirees, mostly. */
function pDaytime(age: number): number {
  if (age >= 65) return 0.8;
  if (age < 25) return 0.65;
  return 0.22;
}

/**
 * Generates the fixed city, sorted by age so channel masking reads as a
 * visible band in the dot grid. Heavy internet users are more willing to
 * answer a survey about internet use (the non-response layer).
 */
export function generatePopulation(): Person[] {
  const rand = mulberry32(POPULATION_SEED);
  const people: Person[] = [];
  for (let i = 0; i < POPULATION_SIZE; i++) {
    const age = 18 + Math.floor(rand() * 68); // 18..85
    const base = 8.5 - ((age - 18) * 5.5) / 67; // 8.5 h/day at 18 down to 3.0 at 85
    const hours = clamp(base + (rand() - 0.5) * 3, 0.5, 12);
    const hasLandline = rand() < pLandline(age);
    const hasApp = rand() < pApp(age);
    const freeDaytime = rand() < pDaytime(age);
    const willAnswer = rand() < clamp(0.2 + hours * 0.05, 0, 0.8);
    people.push({ age, hours, hasLandline, hasApp, freeDaytime, willAnswer });
  }
  return people.sort((a, b) => a.age - b.age);
}

export type ChannelId = "census" | "landline" | "app" | "mall";

export interface ChannelMeta {
  id: ChannelId;
  label: string;
  short: string;
  color: string;
  reaches: (p: Person) => boolean;
  whoAnswers: string;
  whoIsMissing: string;
}

export const CHANNELS: readonly ChannelMeta[] = [
  {
    id: "census",
    label: "Full census (truth)",
    short: "Census",
    color: "#94a3b8",
    reaches: () => true,
    whoAnswers: "Everyone. This is the ground truth you almost never get to see.",
    whoIsMissing: "Nobody. Real collection channels never look like this.",
  },
  {
    id: "landline",
    label: "Landline phone survey",
    short: "Landline",
    color: "#a855f7",
    reaches: (p) => p.hasLandline,
    whoAnswers: "Mostly older residents: landline ownership rises steeply with age.",
    whoIsMissing: "Almost everyone under 45. They were never dialable, so no follow-up fixes it.",
  },
  {
    id: "app",
    label: "In-app poll",
    short: "App poll",
    color: "#3bb4a4",
    reaches: (p) => p.hasApp,
    whoAnswers: "Mostly younger residents who installed the app.",
    whoIsMissing: "Most people over 45, and everyone who never installed the app at all.",
  },
  {
    id: "mall",
    label: "Mall intercept (weekday, 2pm)",
    short: "Mall 2pm",
    color: "#60a5fa",
    reaches: (p) => p.freeDaytime,
    whoAnswers: "People free on a weekday afternoon: students and retirees, mostly.",
    whoIsMissing: "The working-age middle. Note the gap can stay small while a whole band of the city is absent.",
  },
] as const;

export const BIASED_CHANNEL_IDS: readonly ChannelId[] = ["landline", "app", "mall"];

// ── Section 2: Wald's bombers (simulated fleet, not historical data) ────────

export type ZoneId = "wings" | "fuselage" | "tail" | "engines" | "cockpit";

export interface ZoneMeta {
  id: ZoneId;
  label: string;
  /** Share of incoming hits, proportional to exposed area. */
  areaShare: number;
  /** P(plane returns | hit in this zone), without armor. */
  baseSurvival: number;
}

export const ZONES: readonly ZoneMeta[] = [
  { id: "wings", label: "Wings", areaShare: 0.3, baseSurvival: 0.9 },
  { id: "fuselage", label: "Fuselage", areaShare: 0.3, baseSurvival: 0.88 },
  { id: "tail", label: "Tail", areaShare: 0.15, baseSurvival: 0.86 },
  { id: "engines", label: "Engines", areaShare: 0.15, baseSurvival: 0.32 },
  { id: "cockpit", label: "Cockpit", areaShare: 0.1, baseSurvival: 0.35 },
] as const;

export const ZONE_META: Record<ZoneId, ZoneMeta> = Object.fromEntries(
  ZONES.map((z) => [z.id, z])
) as Record<ZoneId, ZoneMeta>;

export const FLEET_SEED = 19440615;
export const FLEET_SIZE = 500;
export const ARMOR_SLOTS = 2;
/** Armor prevents this fraction of the losses a hit in that zone would cause. */
export const ARMOR_EFFECT = 0.7;

export interface Plane {
  zone: ZoneId;
  /** Survival roll in [0,1): survives iff roll < effective survival prob. */
  roll: number;
  /** Fractional position of the hit inside its zone's shape. */
  hitU: number;
  hitV: number;
  survived: boolean;
}

export function generateFleet(): Plane[] {
  const rand = mulberry32(FLEET_SEED);
  const fleet: Plane[] = [];
  for (let i = 0; i < FLEET_SIZE; i++) {
    const u = rand();
    let acc = 0;
    let zone: ZoneId = ZONES[ZONES.length - 1].id;
    for (const z of ZONES) {
      acc += z.areaShare;
      if (u < acc) {
        zone = z.id;
        break;
      }
    }
    const hitU = rand();
    const hitV = rand();
    const roll = rand();
    const survived = roll < ZONE_META[zone].baseSurvival;
    fleet.push({ zone, roll, hitU, hitV, survived });
  }
  return fleet;
}

export function armoredSurvival(base: number): number {
  return base + (1 - base) * ARMOR_EFFECT;
}

/** Re-flies the exact same 500 sorties (same hits, same rolls) with armor on. */
export function survivorsWithArmor(
  fleet: readonly Plane[],
  armor: ReadonlySet<ZoneId>
): number {
  let n = 0;
  for (const p of fleet) {
    const base = ZONE_META[p.zone].baseSurvival;
    const eff = armor.has(p.zone) ? armoredSurvival(base) : base;
    if (p.roll < eff) n++;
  }
  return n;
}

export function hitCounts(
  planes: readonly Plane[]
): Record<ZoneId, number> {
  const counts = { wings: 0, fuselage: 0, tail: 0, engines: 0, cockpit: 0 };
  for (const p of planes) counts[p.zone]++;
  return counts;
}

/** The naive plan: armor the zones with the MOST hits on returning planes. */
export function naiveArmor(returnedCounts: Record<ZoneId, number>): ZoneId[] {
  return [...ZONES]
    .sort((a, b) => returnedCounts[b.id] - returnedCounts[a.id])
    .slice(0, ARMOR_SLOTS)
    .map((z) => z.id);
}

/** Wald's inversion: armor the zones with the FEWEST hits on returning planes. */
export function waldArmor(returnedCounts: Record<ZoneId, number>): ZoneId[] {
  return [...ZONES]
    .sort((a, b) => returnedCounts[a.id] - returnedCounts[b.id])
    .slice(0, ARMOR_SLOTS)
    .map((z) => z.id);
}

// ── Section 3: the invisibility checklist ───────────────────────────────────

export const CHECKLIST_SCENARIO =
  "A transit agency measures rider satisfaction with a prompt inside its mobile app, shown after each completed trip. The dashboard proudly reports 4.5 out of 5. Which groups could never appear in that number?";

export interface ChecklistGroup {
  id: string;
  label: string;
  invisible: boolean;
  feedback: string;
}

export const CHECKLIST_GROUPS: readonly ChecklistGroup[] = [
  {
    id: "no-app",
    label: "Riders who pay with cash or a travel card and never installed the app",
    invisible: true,
    feedback:
      "Correct. The prompt lives inside the app, so these riders can never appear, no matter how many trips they take.",
  },
  {
    id: "commuters",
    label: "Daily commuters who complete the in-app prompt",
    invisible: false,
    feedback:
      "This group is visible. They are exactly who the channel reaches; the question is who else exists around them.",
  },
  {
    id: "churned",
    label: "Former riders who quit transit after last year's service cuts",
    invisible: true,
    feedback:
      "Correct. They left before the channel could ever ask them. The unhappiest customers often exit the data first.",
  },
  {
    id: "power-raters",
    label: "Enthusiasts who rate every single trip",
    invisible: false,
    feedback:
      "Visible, and if anything overweighted: they show up once per trip, not once per person.",
  },
  {
    id: "dismissers",
    label: "Riders who always swipe the prompt away without answering",
    invisible: true,
    feedback:
      "Correct. This is non-response: reachable but silent, and the silence is rarely random.",
  },
  {
    id: "tourists",
    label: "Tourists riding on single paper tickets",
    invisible: true,
    feedback:
      "Correct. No app, no account, no prompt: an entire rider segment with zero rows in the table.",
  },
] as const;

export const CHECKLIST_HIDDEN_COUNT = CHECKLIST_GROUPS.filter(
  (g) => g.invisible
).length;
