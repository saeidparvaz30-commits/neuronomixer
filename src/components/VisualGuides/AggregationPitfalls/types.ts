// Pure data + math for the Aggregation Pitfalls guide. No React in this file.
// Every rate, count, gap, tie point, and winner displayed on the page is
// recomputed from these constants and functions in the browser on every
// interaction. Nothing is scripted.

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// ── Section 1: two clinics, two severity groups ─────────────────────────────

export type ClinicId = "north" | "river";
export type ViewId = "pooled" | "grouped";

export interface ClinicMeta {
  id: ClinicId;
  label: string;
  color: string;
  /** Recovery probability for mild cases (fixed skill, shown to the learner). */
  mildRate: number;
  /** Recovery probability for severe cases (fixed skill, shown to the learner). */
  severeRate: number;
  note: string;
}

/** Patients treated per clinic. Equal on purpose: only the mix differs. */
export const CLINIC_TOTAL = 800;

export const SHARE_MIN = 5;
export const SHARE_MAX = 95;
export const SHARE_DEFAULT = 30;

export const CLINICS: readonly ClinicMeta[] = [
  {
    id: "north",
    label: "Northside",
    color: "#3bb4a4",
    mildRate: 0.93,
    severeRate: 0.73,
    note: "The referral center. Better with mild cases and better with severe cases.",
  },
  {
    id: "river",
    label: "Riverside",
    color: "#a855f7",
    mildRate: 0.87,
    severeRate: 0.69,
    note: "The neighborhood clinic. Worse with mild cases and worse with severe cases.",
  },
] as const;

export const CLINIC_META: Record<ClinicId, ClinicMeta> = Object.fromEntries(
  CLINICS.map((c) => [c.id, c])
) as Record<ClinicId, ClinicMeta>;

export interface GroupOutcome {
  treated: number;
  recovered: number;
}

export interface ClinicOutcomes {
  mild: GroupOutcome;
  severe: GroupOutcome;
}

/**
 * Turns a severe-share slider position into whole patients and whole
 * recoveries for one clinic. Counts are integers so every displayed rate is
 * an honest recovered/treated fraction of visible people.
 */
export function clinicOutcomes(id: ClinicId, severeSharePct: number): ClinicOutcomes {
  const meta = CLINIC_META[id];
  const severeTreated = Math.round((CLINIC_TOTAL * severeSharePct) / 100);
  const mildTreated = CLINIC_TOTAL - severeTreated;
  return {
    mild: { treated: mildTreated, recovered: Math.round(mildTreated * meta.mildRate) },
    severe: { treated: severeTreated, recovered: Math.round(severeTreated * meta.severeRate) },
  };
}

export function pooledOutcome(o: ClinicOutcomes): GroupOutcome {
  return {
    treated: o.mild.treated + o.severe.treated,
    recovered: o.mild.recovered + o.severe.recovered,
  };
}

export function rateOf(o: GroupOutcome): number {
  return o.treated === 0 ? 0 : o.recovered / o.treated;
}

export type Winner = ClinicId | "tie";

export function winnerOf(northRate: number, riverRate: number): Winner {
  if (northRate > riverRate) return "north";
  if (riverRate > northRate) return "river";
  return "tie";
}

export interface ParadoxState {
  mildWinner: Winner;
  severeWinner: Winner;
  pooledWinner: Winner;
  /** True when one clinic wins BOTH severity groups yet loses the pooled table. */
  active: boolean;
}

export function evalParadox(north: ClinicOutcomes, river: ClinicOutcomes): ParadoxState {
  const mildWinner = winnerOf(rateOf(north.mild), rateOf(river.mild));
  const severeWinner = winnerOf(rateOf(north.severe), rateOf(river.severe));
  const pooledWinner = winnerOf(
    rateOf(pooledOutcome(north)),
    rateOf(pooledOutcome(river))
  );
  const active =
    mildWinner !== "tie" &&
    mildWinner === severeWinner &&
    pooledWinner !== "tie" &&
    pooledWinner !== mildWinner;
  return { mildWinner, severeWinner, pooledWinner, active };
}

/**
 * Severe share (in %) at which the given clinic's pooled rate would equal
 * targetRate, before rounding to whole patients and before clamping to the
 * reachable slider range. Solves
 * mildRate * (1 - a) + severeRate * a = targetRate for a. Can fall outside
 * [SHARE_MIN, SHARE_MAX] when the target rate is not reachable by any mix.
 */
export function tieSevereSharePctRaw(id: ClinicId, targetRate: number): number {
  const meta = CLINIC_META[id];
  const a = (meta.mildRate - targetRate) / (meta.mildRate - meta.severeRate);
  return a * 100;
}

/** Same as tieSevereSharePctRaw, clamped to [0, 100] for display. */
export function tieSevereSharePct(id: ClinicId, targetRate: number): number {
  return clamp(tieSevereSharePctRaw(id, targetRate), 0, 100);
}

export function fmtPct(rate: number, digits = 1): string {
  return `${(rate * 100).toFixed(digits)}%`;
}

/** Formats a rate difference as signed percentage points. */
export function fmtPts(delta: number, digits = 1): string {
  const pts = delta * 100;
  return `${pts >= 0 ? "+" : ""}${pts.toFixed(digits)} pts`;
}

/** Formats an absolute rate difference as unsigned percentage points. */
export function fmtGapPts(delta: number, digits = 1): string {
  return `${Math.abs(delta * 100).toFixed(digits)} pts`;
}

// ── Section 2: one funnel, two denominators ─────────────────────────────────

export type DenomId = "user" | "session";

/**
 * Store A: the browsing store. People open it habitually, so its buyers are
 * spread across many sessions. Each buyer purchases in exactly one session.
 */
export const STORE_A = {
  id: "browse",
  label: "Store A, the browsing store",
  short: "Store A",
  color: "#3bb4a4",
  users: 100,
  buyers: 60,
} as const;

/**
 * Store B: the errand store. People arrive with intent, buy or leave, and
 * rarely come back the same month. Each buyer purchases in exactly one session.
 */
export const STORE_B = {
  id: "errand",
  label: "Store B, the errand store",
  short: "Store B",
  color: "#a855f7",
  users: 100,
  sessions: 120,
  buyers: 50,
} as const;

export const SPU_MIN = 2;
export const SPU_MAX = 8;
export const SPU_DEFAULT = 4;

export function storeASessions(sessionsPerUser: number): number {
  return STORE_A.users * sessionsPerUser;
}
