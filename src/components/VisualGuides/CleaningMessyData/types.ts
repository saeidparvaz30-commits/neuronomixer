// Pure data + cleaning logic for the Cleaning Messy Data guide. No React in this file.
// The raw export below is a FIXED, fully visible dataset (deterministic, no randomness).
// Every count and percentage displayed in the guide is computed from RAW_ROWS by the
// real cleaning functions defined here; nothing is pre-baked.

export interface RawRow {
  id: number;
  /** Free-text country field, as typed by respondents. */
  country: string;
  /** Signup date, pasted in whatever format each source system used. */
  signupDate: string;
  /** Hours per week using the product, stored as text. */
  hours: string;
}

/**
 * The survey export, verbatim. 24 rows, three messy columns:
 * - country: 9 distinct raw strings that are really only 3 countries
 * - signupDate: mixed ISO, US slash, month-name, and dotted formats plus junk
 * - hours: numbers stored as text, with whitespace, decimal commas, units, and sentinels
 */
export const RAW_ROWS: readonly RawRow[] = [
  { id: 1, country: "USA", signupDate: "2026-01-15", hours: "12" },
  { id: 2, country: "usa", signupDate: "03/15/2026", hours: "8" },
  { id: 3, country: " USA ", signupDate: "2026-02-28", hours: " 8 " },
  { id: 4, country: "United States", signupDate: "Mar 5, 2026", hours: "30" },
  { id: 5, country: "UK", signupDate: "2025-11-02", hours: "5" },
  { id: 6, country: "Germany", signupDate: "1/8/2026", hours: "7,5" },
  { id: 7, country: "USA", signupDate: "2025-12-09", hours: "14" },
  { id: 8, country: "U.S.A.", signupDate: "January 12, 2026", hours: "21" },
  { id: 9, country: "UK", signupDate: "2026-03-01", hours: "10" },
  { id: 10, country: "United Kingdom", signupDate: "11/30/2025", hours: "2" },
  { id: 11, country: "UK", signupDate: "2026.03.22", hours: "16" },
  { id: 12, country: "Germany", signupDate: "2025-10-21", hours: "12h" },
  { id: 13, country: "USA", signupDate: "4 Feb 2026", hours: "7" },
  { id: 14, country: " USA ", signupDate: "2026-04-11", hours: "25" },
  { id: 15, country: "United States", signupDate: " 2026-02-14 ", hours: "9" },
  { id: 16, country: "UK", signupDate: "07/04/2025", hours: "15 " },
  { id: 17, country: "Germany", signupDate: "2026-01-30", hours: "11" },
  { id: 18, country: "germany ", signupDate: "2025.08.07", hours: "ten" },
  { id: 19, country: "USA", signupDate: "19 Dec 2025", hours: "N/A" },
  { id: 20, country: "usa", signupDate: "2025-09-18", hours: "20 hrs" },
  { id: 21, country: "U.S.A.", signupDate: "12/05/2025", hours: "N/A" },
  { id: 22, country: "UK", signupDate: "last spring", hours: "18" },
  { id: 23, country: "United Kingdom", signupDate: "n/a", hours: "12,5" },
  { id: 24, country: "germany ", signupDate: "2026-13-40", hours: "-" },
] as const;

export const TOTAL_ROWS = RAW_ROWS.length;

// ── Cleaning steps ───────────────────────────────────────────────────────────

export type StepId = "trim" | "casefold" | "map" | "dates" | "numbers";

export interface StepState {
  trim: boolean;
  casefold: boolean;
  map: boolean;
  dates: boolean;
  numbers: boolean;
}

export const NO_STEPS: StepState = {
  trim: false,
  casefold: false,
  map: false,
  dates: false,
  numbers: false,
};

export const ALL_STEPS: StepState = {
  trim: true,
  casefold: true,
  map: true,
  dates: true,
  numbers: true,
};

export interface StepMeta {
  id: StepId;
  label: string;
  short: string;
  appliesTo: string;
  description: string;
}

/** Pipeline order is fixed: steps always execute top to bottom, whatever order you toggle them. */
export const STEPS: readonly StepMeta[] = [
  {
    id: "trim",
    label: "Trim whitespace",
    short: "Trim",
    appliesTo: "all columns",
    description:
      "Strip leading and trailing spaces from every cell. Invisible characters are the cheapest bug you will ever fix.",
  },
  {
    id: "casefold",
    label: "Casefold categories",
    short: "Casefold",
    appliesTo: "country",
    description:
      "Lowercase the category column so values that differ only by capitalization become one value.",
  },
  {
    id: "map",
    label: "Map synonyms to canonical labels",
    short: "Map",
    appliesTo: "country",
    description:
      "Look each value up in a hand-written dictionary and replace known synonyms with one canonical label. The lookup is exact, so it works best after trim and casefold.",
  },
  {
    id: "dates",
    label: "Parse mixed date formats",
    short: "Dates",
    appliesTo: "signup_date",
    description:
      "Swap the strict ISO-only loader for a multi-format parser that also reads US slash dates, month names, and dotted dates, then normalizes everything to ISO.",
  },
  {
    id: "numbers",
    label: "Coerce text to numbers",
    short: "Numbers",
    appliesTo: "hours_per_week",
    description:
      "Convert the text column to numbers: trim, strip trailing units like h or hrs, and accept a decimal comma. Sentinels like N/A become missing, not zero.",
  },
] as const;

// ── Country column: trim, casefold, synonym mapping ────────────────────────

/** Canonical labels the messy column should converge to. */
export const CANONICAL_COUNTRIES = ["USA", "UK", "Germany"] as const;

const CANONICAL_SET = new Set<string>(CANONICAL_COUNTRIES);

/**
 * Synonym dictionary. Keys are exact strings as they look AFTER trim + casefold;
 * that exactness is the point: mapping applied to raw values misses most rows.
 */
export const CATEGORY_MAP: Record<string, string> = {
  usa: "USA",
  "u.s.a.": "USA",
  "united states": "USA",
  uk: "UK",
  "united kingdom": "UK",
  germany: "Germany",
};

export const CATEGORY_MAP_ENTRIES: readonly { from: string; to: string }[] =
  Object.entries(CATEGORY_MAP).map(([from, to]) => ({ from, to }));

export const CATEGORY_COLORS: Record<string, string> = {
  USA: "#3bb4a4",
  UK: "#60a5fa",
  Germany: "#a855f7",
};

/** Applies the enabled country-column steps in pipeline order. */
export function transformCountry(raw: string, steps: StepState): string {
  let v = raw;
  if (steps.trim) v = v.trim();
  if (steps.casefold) v = v.toLowerCase();
  if (steps.map) {
    const mapped = CATEGORY_MAP[v];
    if (mapped !== undefined) v = mapped;
  }
  return v;
}

export function isCanonicalCountry(v: string): boolean {
  return CANONICAL_SET.has(v);
}

/** How many rows' country value (after trim/casefold per current steps) hits the dictionary. */
export function dictionaryMatches(rows: readonly RawRow[], steps: StepState): number {
  let n = 0;
  for (const r of rows) {
    let v = r.country;
    if (steps.trim) v = v.trim();
    if (steps.casefold) v = v.toLowerCase();
    if (CATEGORY_MAP[v] !== undefined) n++;
  }
  return n;
}

export interface CategoryCount {
  value: string;
  count: number;
  canonical: boolean;
}

/** Distinct country values with row counts, sorted by count desc then alphabetically. */
export function countryCounts(rows: readonly RawRow[], steps: StepState): CategoryCount[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const v = transformCountry(r.country, steps);
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count, canonical: isCanonicalCountry(value) }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

// ── Date column: strict vs flexible parsing ─────────────────────────────────

export interface IsoDate {
  y: number;
  m: number;
  d: number;
}

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeap(y: number): boolean {
  return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
}

function daysInMonth(y: number, m: number): number {
  if (m === 2 && isLeap(y)) return 29;
  return MONTH_DAYS[m - 1] ?? 31;
}

function validDate(y: number, m: number, d: number): IsoDate | null {
  if (y < 1900 || y > 2100) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > daysInMonth(y, m)) return null;
  return { y, m, d };
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

/** The naive loader: accepts exactly YYYY-MM-DD and nothing else. */
export function parseDateStrict(v: string): IsoDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  return validDate(Number(m[1]), Number(m[2]), Number(m[3]));
}

/**
 * The cleaning-step parser: trims its input, then tries ISO, US slash
 * (month first, a documented assumption), month-name, and dotted formats.
 */
export function parseDateFlexible(v: string): IsoDate | null {
  const s = v.trim();

  const iso = parseDateStrict(s);
  if (iso) return iso;

  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (us) return validDate(Number(us[3]), Number(us[1]), Number(us[2]));

  const dotted = /^(\d{4})\.(\d{2})\.(\d{2})$/.exec(s);
  if (dotted) return validDate(Number(dotted[1]), Number(dotted[2]), Number(dotted[3]));

  const monthFirst = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/.exec(s);
  if (monthFirst) {
    const month = MONTH_NAMES[monthFirst[1].toLowerCase()];
    if (month !== undefined) return validDate(Number(monthFirst[3]), month, Number(monthFirst[2]));
  }

  const dayFirst = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(s);
  if (dayFirst) {
    const month = MONTH_NAMES[dayFirst[2].toLowerCase()];
    if (month !== undefined) return validDate(Number(dayFirst[3]), month, Number(dayFirst[1]));
  }

  return null;
}

export function toIso(d: IsoDate): string {
  const mm = String(d.m).padStart(2, "0");
  const dd = String(d.d).padStart(2, "0");
  return `${d.y}-${mm}-${dd}`;
}

// ── Hours column: strict numeric vs coercion ────────────────────────────────

/** Explicit missing-value sentinels: not dirty, just absent. */
const MISSING_TOKENS = new Set(["n/a", "na", "-", ""]);

export function isMissingToken(v: string): boolean {
  return MISSING_TOKENS.has(v.trim().toLowerCase());
}

/** The naive check: the exact string must already be a plain number. */
export function strictNumber(v: string): number | null {
  return /^-?\d+(\.\d+)?$/.test(v) ? parseFloat(v) : null;
}

/** The cleaning-step coercion: trim, strip trailing time units, accept a decimal comma. */
export function coerceNumber(v: string): number | null {
  let t = v.trim().toLowerCase();
  if (isMissingToken(t)) return null;
  t = t.replace(/\s*(h|hrs?|hours?)$/, "");
  t = t.replace(",", ".");
  return strictNumber(t);
}

// ── Per-row cleaned view (what the table renders) ───────────────────────────

export type CellStatus = "unchanged" | "changed" | "unparsed" | "missing";

export interface CleanCell {
  raw: string;
  display: string;
  status: CellStatus;
}

export interface CleanRow {
  id: number;
  country: CleanCell;
  date: CleanCell;
  hours: CleanCell;
  countryCanonical: boolean;
  dateParsed: boolean;
  hoursParsed: boolean;
  clean: boolean;
}

function textStatus(raw: string, display: string): CellStatus {
  return display !== raw ? "changed" : "unchanged";
}

export function cleanRow(row: RawRow, steps: StepState): CleanRow {
  // country
  const countryValue = transformCountry(row.country, steps);
  const country: CleanCell = {
    raw: row.country,
    display: countryValue,
    status: textStatus(row.country, countryValue),
  };
  const countryCanonical = isCanonicalCountry(countryValue);

  // date
  const dateBase = steps.trim ? row.signupDate.trim() : row.signupDate;
  const parsedDate = steps.dates ? parseDateFlexible(dateBase) : parseDateStrict(dateBase);
  const dateDisplay = parsedDate ? toIso(parsedDate) : dateBase;
  const date: CleanCell = {
    raw: row.signupDate,
    display: dateDisplay,
    status: parsedDate
      ? textStatus(row.signupDate, dateDisplay)
      : steps.dates
        ? "unparsed"
        : textStatus(row.signupDate, dateDisplay),
  };

  // hours
  const hoursBase = steps.trim ? row.hours.trim() : row.hours;
  const parsedHours = steps.numbers ? coerceNumber(hoursBase) : strictNumber(hoursBase);
  const hoursDisplay = parsedHours !== null ? String(parsedHours) : hoursBase;
  const hours: CleanCell = {
    raw: row.hours,
    display: hoursDisplay,
    status:
      parsedHours !== null
        ? textStatus(row.hours, hoursDisplay)
        : steps.numbers
          ? isMissingToken(row.hours)
            ? "missing"
            : "unparsed"
          : textStatus(row.hours, hoursDisplay),
  };

  const dateParsed = parsedDate !== null;
  const hoursParsed = parsedHours !== null;
  return {
    id: row.id,
    country,
    date,
    hours,
    countryCanonical,
    dateParsed,
    hoursParsed,
    clean: countryCanonical && dateParsed && hoursParsed,
  };
}

export function cleanRows(rows: readonly RawRow[], steps: StepState): CleanRow[] {
  return rows.map((r) => cleanRow(r, steps));
}

// ── Aggregate stats (the live scoreboard) ───────────────────────────────────

export interface GuideStats {
  total: number;
  distinctCountries: number;
  datesParsed: number;
  hoursParsed: number;
  cleanRowCount: number;
}

export function computeStats(rows: readonly RawRow[], steps: StepState): GuideStats {
  const cleaned = cleanRows(rows, steps);
  return {
    total: cleaned.length,
    distinctCountries: countryCounts(rows, steps).length,
    datesParsed: cleaned.filter((r) => r.dateParsed).length,
    hoursParsed: cleaned.filter((r) => r.hoursParsed).length,
    cleanRowCount: cleaned.filter((r) => r.clean).length,
  };
}

/** How many cells across the three columns carry stray edge whitespace. */
export function whitespaceCellCount(rows: readonly RawRow[]): number {
  let n = 0;
  for (const r of rows) {
    if (r.country !== r.country.trim()) n++;
    if (r.signupDate !== r.signupDate.trim()) n++;
    if (r.hours !== r.hours.trim()) n++;
  }
  return n;
}

export function pct(part: number, total: number): string {
  if (total === 0) return "0";
  return ((part / total) * 100).toFixed(1);
}

/** Makes leading/trailing spaces visible as an open-box mark so trim has something to show. */
export function markEdgeWhitespace(v: string): string {
  const lead = v.length - v.trimStart().length;
  const trail = v.length - v.trimEnd().length;
  return "␣".repeat(lead) + v.trim() + "␣".repeat(trail);
}
