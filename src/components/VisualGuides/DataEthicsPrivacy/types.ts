// Pure data + math for the Data Ethics & Privacy guide. No React in this file.
// Both tables below are fully synthetic and fully visible in the guide; every
// number on screen (matches, k, class sizes, query errors, utility) is computed
// live from these records by the functions in this file.

// ── The released hospital table (names removed, quasi-identifiers kept) ─────

export type Gender = "F" | "M";

export interface HealthRecord {
  id: number;
  zip: string;
  age: number;
  gender: Gender;
  diagnosis: string;
}

/**
 * 32 synthetic discharge records for the fictional town of Midvale.
 * Names have been "anonymized" away; ZIP, age, and gender remain.
 */
export const HEALTH_RECORDS: readonly HealthRecord[] = [
  { id: 1, zip: "54801", age: 23, gender: "F", diagnosis: "Asthma" },
  { id: 2, zip: "54801", age: 26, gender: "F", diagnosis: "Anxiety disorder" },
  { id: 3, zip: "54802", age: 29, gender: "F", diagnosis: "Migraine" },
  { id: 4, zip: "54802", age: 21, gender: "M", diagnosis: "Asthma" },
  { id: 5, zip: "54803", age: 27, gender: "M", diagnosis: "Back pain" },
  { id: 6, zip: "54801", age: 31, gender: "F", diagnosis: "Migraine" },
  { id: 7, zip: "54802", age: 34, gender: "F", diagnosis: "Type 2 diabetes" },
  { id: 8, zip: "54803", age: 38, gender: "F", diagnosis: "Anxiety disorder" },
  { id: 9, zip: "54801", age: 33, gender: "M", diagnosis: "Hypertension" },
  { id: 10, zip: "54802", age: 36, gender: "M", diagnosis: "Back pain" },
  { id: 11, zip: "54803", age: 39, gender: "M", diagnosis: "Asthma" },
  { id: 12, zip: "54801", age: 42, gender: "F", diagnosis: "Hypertension" },
  { id: 13, zip: "54803", age: 47, gender: "F", diagnosis: "Type 2 diabetes" },
  { id: 14, zip: "54801", age: 44, gender: "M", diagnosis: "Type 2 diabetes" },
  { id: 15, zip: "54802", age: 45, gender: "M", diagnosis: "Hypertension" },
  { id: 16, zip: "54802", age: 48, gender: "M", diagnosis: "Migraine" },
  { id: 17, zip: "55120", age: 22, gender: "F", diagnosis: "Back pain" },
  { id: 18, zip: "55121", age: 28, gender: "F", diagnosis: "Asthma" },
  { id: 19, zip: "55120", age: 24, gender: "M", diagnosis: "Anxiety disorder" },
  { id: 20, zip: "55120", age: 25, gender: "M", diagnosis: "Migraine" },
  { id: 21, zip: "55121", age: 29, gender: "M", diagnosis: "Hypertension" },
  { id: 22, zip: "55120", age: 32, gender: "F", diagnosis: "Asthma" },
  { id: 23, zip: "55121", age: 35, gender: "F", diagnosis: "Hypertension" },
  { id: 24, zip: "55121", age: 37, gender: "F", diagnosis: "Back pain" },
  { id: 25, zip: "55120", age: 30, gender: "M", diagnosis: "Type 2 diabetes" },
  { id: 26, zip: "55120", age: 35, gender: "M", diagnosis: "Anxiety disorder" },
  { id: 27, zip: "55121", age: 38, gender: "M", diagnosis: "Migraine" },
  { id: 28, zip: "55120", age: 41, gender: "F", diagnosis: "Migraine" },
  { id: 29, zip: "55120", age: 46, gender: "F", diagnosis: "Anxiety disorder" },
  { id: 30, zip: "55121", age: 43, gender: "F", diagnosis: "Asthma" },
  { id: 31, zip: "55121", age: 43, gender: "M", diagnosis: "Back pain" },
  { id: 32, zip: "55121", age: 43, gender: "M", diagnosis: "Hypertension" },
] as const;

// ── The public directory the attacker links against ─────────────────────────

export interface DirectoryPerson {
  name: string;
  zip: string;
  age: number;
  gender: Gender;
}

/**
 * 12 entries from Midvale's public voter roll (synthetic names, same
 * quasi-identifiers). Some link to exactly one hospital record, one links to
 * two, and two link to none.
 */
export const DIRECTORY: readonly DirectoryPerson[] = [
  { name: "Nora Fielding", zip: "54801", age: 23, gender: "F" },
  { name: "Priya Raman", zip: "54802", age: 34, gender: "F" },
  { name: "Marcus Webb", zip: "54801", age: 33, gender: "M" },
  { name: "Elaine Soto", zip: "54801", age: 42, gender: "F" },
  { name: "Tomas Rivera", zip: "54802", age: 48, gender: "M" },
  { name: "Dana Whitfield", zip: "55120", age: 22, gender: "F" },
  { name: "Omar Haddad", zip: "55120", age: 30, gender: "M" },
  { name: "Grete Lund", zip: "55121", age: 35, gender: "F" },
  { name: "Astrid Berge", zip: "54803", age: 38, gender: "F" },
  { name: "Victor Chen", zip: "55121", age: 43, gender: "M" },
  { name: "Ruth Ambrose", zip: "54803", age: 61, gender: "F" },
  { name: "Felix Njoku", zip: "55120", age: 52, gender: "M" },
] as const;

/** Every ZIP code that exists in Midvale (used by the per-ZIP utility query). */
export const ZIPS: readonly string[] = [
  "54801",
  "54802",
  "54803",
  "55120",
  "55121",
] as const;

export const DIAGNOSES: readonly string[] = [
  "Asthma",
  "Anxiety disorder",
  "Migraine",
  "Back pain",
  "Type 2 diabetes",
  "Hypertension",
] as const;

// ── Generalization levels ────────────────────────────────────────────────────

export type ZipLevel = 0 | 1 | 2; // full ZIP, 3-digit district, removed
export type AgeLevel = 0 | 1 | 2; // exact, decade band, removed
export type GenderLevel = 0 | 1; // shown, removed

export interface Settings {
  zip: ZipLevel;
  age: AgeLevel;
  gender: GenderLevel;
}

export const FULL_DETAIL: Settings = { zip: 0, age: 0, gender: 0 };
export const WORST_CASE: Settings = { zip: 2, age: 2, gender: 1 };
export const TARGET_K = 5;

export const ZIP_LEVEL_LABELS: readonly string[] = [
  "Full ZIP",
  "District only",
  "Removed",
] as const;
export const AGE_LEVEL_LABELS: readonly string[] = [
  "Exact age",
  "Decade band",
  "Removed",
] as const;
export const GENDER_LEVEL_LABELS: readonly string[] = [
  "Shown",
  "Removed",
] as const;

export function generalizeZip(zip: string, level: ZipLevel): string {
  if (level === 0) return zip;
  if (level === 1) return `${zip.slice(0, 3)}**`;
  return "*";
}

function decadeOf(age: number): number {
  return Math.floor(age / 10) * 10;
}

export function generalizeAge(age: number, level: AgeLevel): string {
  if (level === 0) return String(age);
  if (level === 1) return `${decadeOf(age)} to ${decadeOf(age) + 9}`;
  return "*";
}

export function generalizeGender(gender: Gender, level: GenderLevel): string {
  return level === 0 ? gender : "*";
}

interface QuasiIdentifiers {
  zip: string;
  age: number;
  gender: Gender;
}

/** The equivalence-class key of a row (or directory person) under `s`. */
export function quasiKey(q: QuasiIdentifiers, s: Settings): string {
  return `${generalizeZip(q.zip, s.zip)}|${generalizeAge(q.age, s.age)}|${generalizeGender(q.gender, s.gender)}`;
}

export function settingsKey(s: Settings): string {
  return `${s.zip}-${s.age}-${s.gender}`;
}

// ── k-anonymity ──────────────────────────────────────────────────────────────

export interface KAnonymityResult {
  /** Size of the smallest equivalence class: the k in k-anonymity. */
  k: number;
  /** Number of distinct equivalence classes in the release. */
  classCount: number;
  /** All class sizes, sorted descending (for the class-size strip). */
  classSizes: number[];
  /** The generalized quasi-identifier values of one smallest class. */
  smallestClassKey: string;
}

export function kAnonymity(s: Settings): KAnonymityResult {
  const classes = new Map<string, number>();
  for (const r of HEALTH_RECORDS) {
    const key = quasiKey(r, s);
    classes.set(key, (classes.get(key) ?? 0) + 1);
  }
  let k = Infinity;
  let smallestClassKey = "";
  for (const [key, size] of classes) {
    if (size < k) {
      k = size;
      smallestClassKey = key;
    }
  }
  return {
    k,
    classCount: classes.size,
    classSizes: [...classes.values()].sort((a, b) => b - a),
    smallestClassKey,
  };
}

// ── The linkage attack (a real join over the two tables) ────────────────────

/** All released records consistent with this person under generalization `s`. */
export function matchesFor(
  person: DirectoryPerson,
  s: Settings
): HealthRecord[] {
  const target = quasiKey(person, s);
  return HEALTH_RECORDS.filter((r) => quasiKey(r, s) === target);
}

/** How many directory people link to exactly one released record under `s`. */
export function uniqueMatchCount(s: Settings): number {
  return DIRECTORY.filter((p) => matchesFor(p, s).length === 1).length;
}

// ── Utility: error of three concrete analyst queries on the release ─────────
// The analyst only sees generalized values, so each query is answered with the
// stated fallback assumptions, and its error vs the raw table is measured.

const AGE_MIN = Math.min(...HEALTH_RECORDS.map((r) => r.age));
const AGE_MAX = Math.max(...HEALTH_RECORDS.map((r) => r.age));

/** The analyst's best point estimate of a generalized age value. */
function representativeAge(age: number, level: AgeLevel): number {
  if (level === 0) return age;
  if (level === 1) return decadeOf(age) + 4.5; // midpoint of the decade band
  return (AGE_MIN + AGE_MAX) / 2; // midpoint of the release's stated age range
}

/** Q1: mean age per diagnosis. Error: mean |estimate minus truth| in years. */
export function q1AgeByDiagnosisError(s: Settings): number {
  let sum = 0;
  for (const d of DIAGNOSES) {
    const rows = HEALTH_RECORDS.filter((r) => r.diagnosis === d);
    const truth = rows.reduce((a, r) => a + r.age, 0) / rows.length;
    const est =
      rows.reduce((a, r) => a + representativeAge(r.age, s.age), 0) /
      rows.length;
    sum += Math.abs(est - truth);
  }
  return sum / DIAGNOSES.length;
}

/**
 * Q2: patient count per ZIP. District counts are split evenly across that
 * district's ZIPs; removed ZIPs are split evenly across all five ZIPs.
 * Error: mean |estimate minus truth| in patients.
 */
export function q2CountByZipError(s: Settings): number {
  const est: Record<string, number> = {};
  for (const z of ZIPS) est[z] = 0;
  for (const r of HEALTH_RECORDS) {
    if (s.zip === 0) {
      est[r.zip] += 1;
    } else if (s.zip === 1) {
      const members = ZIPS.filter((z) => z.slice(0, 3) === r.zip.slice(0, 3));
      for (const z of members) est[z] += 1 / members.length;
    } else {
      for (const z of ZIPS) est[z] += 1 / ZIPS.length;
    }
  }
  let sum = 0;
  for (const z of ZIPS) {
    const truth = HEALTH_RECORDS.filter((r) => r.zip === z).length;
    sum += Math.abs(est[z] - truth);
  }
  return sum / ZIPS.length;
}

/**
 * Q3: share of female patients per diagnosis. With gender removed the analyst
 * can only assume 50 percent. Error: mean |estimate minus truth| in share.
 */
export function q3FemaleShareError(s: Settings): number {
  let sum = 0;
  for (const d of DIAGNOSES) {
    const rows = HEALTH_RECORDS.filter((r) => r.diagnosis === d);
    const truth = rows.filter((r) => r.gender === "F").length / rows.length;
    const est = s.gender === 0 ? truth : 0.5;
    sum += Math.abs(est - truth);
  }
  return sum / DIAGNOSES.length;
}

export interface UtilityPart {
  label: string;
  /** Current mean absolute error of this query. */
  error: number;
  /** Error of the same query when everything is removed (the worst case). */
  worstError: number;
  /** 1 minus error/worstError, clamped to [0, 1]. */
  utility: number;
  unit: string;
}

export interface UtilityResult {
  /** 0 to 100: mean of the three per-query utilities. */
  score: number;
  parts: UtilityPart[];
}

export function utility(s: Settings): UtilityResult {
  const defs: Array<{
    label: string;
    fn: (x: Settings) => number;
    unit: string;
  }> = [
    { label: "Mean age per diagnosis", fn: q1AgeByDiagnosisError, unit: "yr" },
    { label: "Patients per ZIP code", fn: q2CountByZipError, unit: "patients" },
    { label: "Female share per diagnosis", fn: q3FemaleShareError, unit: "pp" },
  ];
  const parts: UtilityPart[] = defs.map(({ label, fn, unit }) => {
    const error = fn(s);
    const worstError = fn(WORST_CASE);
    const u =
      worstError === 0 ? 1 : Math.min(1, Math.max(0, 1 - error / worstError));
    return { label, error, worstError, utility: u, unit };
  });
  const score =
    (100 * parts.reduce((a, p) => a + p.utility, 0)) / parts.length;
  return { score, parts };
}

/** One tried defense setting, plotted on the tradeoff chart. */
export interface TriedSetting {
  key: string;
  settings: Settings;
  k: number;
  utilityScore: number;
}
