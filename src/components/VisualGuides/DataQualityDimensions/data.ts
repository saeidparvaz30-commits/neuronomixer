// Data + pure computation for "The Six Faces of Bad Data".
// Everything here is deterministic: literal constants, no Date.now(), no randomness.

export const REFERENCE_TODAY = "2026-07-01"; // pinned audit date (hydration-safe)
export const FRESH_WINDOW_DAYS = 365;
export const SIGNUP_MIN = "2015-01-01";
export const FRESH_CUTOFF = "2025-07-01"; // REFERENCE_TODAY minus 365 days, precomputed for display

export const FIELDS = [
  "name",
  "email",
  "country",
  "phone",
  "signupDate",
  "lastUpdated",
] as const;
export type FieldName = (typeof FIELDS)[number];

export interface CustomerRow {
  id: number;
  name: string | null;
  email: string | null;
  country: string | null;
  phone: string | null;
  signupDate: string | null;
  lastUpdated: string | null;
}

export const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
export const PHONE_RE = /^\+\d{1,3} \d{6,10}$/;
export const NAME_RE = /^[A-Za-z][A-Za-z' .-]*$/;
export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const COUNTRY_PREFIX: Record<string, string> = {
  US: "+1 ",
  GB: "+44 ",
  DE: "+49 ",
  NO: "+47 ",
  FR: "+33 ",
  JP: "+81 ",
};

/** Literal constant base dataset: 14 rows, every dimension at 100 percent. */
export const BASE_ROWS: ReadonlyArray<CustomerRow> = [
  { id: 1,  name: "Ava Thompson",  email: "ava.thompson@nordicdata.io",        country: "US", phone: "+1 4155550132",  signupDate: "2019-03-12", lastUpdated: "2026-05-14" },
  { id: 2,  name: "John Smith",    email: "john.smith@acmecorp.com",           country: "GB", phone: "+44 2075550198", signupDate: "2017-11-05", lastUpdated: "2026-06-20" },
  { id: 3,  name: "Yuki Tanaka",   email: "yuki.tanaka@sakuratech.jp",         country: "JP", phone: "+81 355500147",  signupDate: "2021-06-30", lastUpdated: "2026-04-02" },
  { id: 4,  name: "Maria Lopez",   email: "maria.lopez@solarisretail.com",     country: "US", phone: "+1 3055550173",  signupDate: "2018-09-21", lastUpdated: "2026-03-18" },
  { id: 5,  name: "Sofia Berg",    email: "sofia.berg@fjordanalytics.no",      country: "NO", phone: "+47 22555018",   signupDate: "2020-01-15", lastUpdated: "2026-06-08" },
  { id: 6,  name: "Lucas Weber",   email: "lucas.weber@rheinlogistik.de",      country: "DE", phone: "+49 3055550166", signupDate: "2016-04-27", lastUpdated: "2026-02-25" },
  { id: 7,  name: "Elise Laurent", email: "elise.laurent@parisfintech.fr",     country: "FR", phone: "+33 145550122",  signupDate: "2022-08-09", lastUpdated: "2026-05-30" },
  { id: 8,  name: "Omar Haddad",   email: "omar.haddad@atlascloud.com",        country: "US", phone: "+1 2125550184",  signupDate: "2019-12-02", lastUpdated: "2026-01-19" },
  { id: 9,  name: "Emma Wilson",   email: "emma.wilson@thamesmedia.co.uk",     country: "GB", phone: "+44 1615550111", signupDate: "2015-07-14", lastUpdated: "2026-06-27" },
  { id: 10, name: "Nora Iversen",  email: "nora.iversen@polarsoft.no",         country: "NO", phone: "+47 23555049",   signupDate: "2023-02-18", lastUpdated: "2026-03-05" },
  { id: 11, name: "Felix Braun",   email: "felix.braun@alpengruppe.de",        country: "DE", phone: "+49 8955550129", signupDate: "2020-10-11", lastUpdated: "2026-04-21" },
  { id: 12, name: "Chloe Martin",  email: "chloe.martin@lyonlabs.fr",          country: "FR", phone: "+33 472550163",  signupDate: "2024-05-06", lastUpdated: "2026-06-01" },
  { id: 13, name: "Kenji Sato",    email: "kenji.sato@fujidesign.jp",          country: "JP", phone: "+81 662550178",  signupDate: "2018-02-23", lastUpdated: "2025-12-12" },
  { id: 14, name: "Grace Chen",    email: "grace.chen@harborsecurity.com",     country: "US", phone: "+1 6175550157",  signupDate: "2021-09-08", lastUpdated: "2026-05-22" },
];

/** Verified name + email pairs from signed onboarding contracts (the source of truth). */
export const GROUND_TRUTH: ReadonlyArray<{
  id: number;
  field: "name" | "email";
  value: string;
}> = [
  { id: 2,  field: "name",  value: "John Smith" },
  { id: 2,  field: "email", value: "john.smith@acmecorp.com" },
  { id: 5,  field: "name",  value: "Sofia Berg" },
  { id: 5,  field: "email", value: "sofia.berg@fjordanalytics.no" },
  { id: 9,  field: "name",  value: "Emma Wilson" },
  { id: 9,  field: "email", value: "emma.wilson@thamesmedia.co.uk" },
  { id: 12, field: "name",  value: "Chloe Martin" },
  { id: 12, field: "email", value: "chloe.martin@lyonlabs.fr" },
  { id: 13, field: "name",  value: "Kenji Sato" },
  { id: 13, field: "email", value: "kenji.sato@fujidesign.jp" },
  { id: 14, field: "name",  value: "Grace Chen" },
  { id: 14, field: "email", value: "grace.chen@harborsecurity.com" },
];

export const GROUND_TRUTH_IDS: ReadonlySet<number> = new Set(GROUND_TRUTH.map((g) => g.id));

// ── Dimensions ────────────────────────────────────────────────────────────────

export type DimensionId =
  | "completeness"
  | "uniqueness"
  | "validity"
  | "consistency"
  | "timeliness"
  | "accuracy";

export const DIMENSIONS: ReadonlyArray<{
  id: DimensionId;
  label: string;
  question: string;
  test: string;
}> = [
  { id: "completeness", label: "Completeness", question: "Is the value there at all?",           test: "percent of non-null cells across all six fields" },
  { id: "uniqueness",   label: "Uniqueness",   question: "Is each customer recorded once?",      test: "duplicate rows found by exact email key match" },
  { id: "validity",     label: "Validity",     question: "Does the value look right?",           test: "email pattern check plus signup date range check" },
  { id: "consistency",  label: "Consistency",  question: "Do the fields agree with each other?", test: "country column versus phone country code" },
  { id: "timeliness",   label: "Timeliness",   question: "Is the value current?",                test: `last updated within ${FRESH_WINDOW_DAYS} days of the pinned audit date ${REFERENCE_TODAY}` },
  { id: "accuracy",     label: "Accuracy",     question: "Is the value actually true?",          test: "field-by-field match against the verified contract file" },
];

// ── Defects ───────────────────────────────────────────────────────────────────

export type DefectId =
  | "missing"
  | "duplicate"
  | "invalid"
  | "inconsistent"
  | "stale"
  | "inaccurate";

export const NO_DEFECTS: Record<DefectId, boolean> = {
  missing: false,
  duplicate: false,
  invalid: false,
  inconsistent: false,
  stale: false,
  inaccurate: false,
};

export const DEFECTS: ReadonlyArray<{
  id: DefectId;
  label: string;
  action: string;
  hits: DimensionId;
  hitsLabel: string;
}> = [
  {
    id: "missing",
    label: "Blank out fields",
    action: "Sets email on rows 3 and 10, phone on row 8, and name on row 12 to null.",
    hits: "completeness",
    hitsLabel: "Completeness",
  },
  {
    id: "duplicate",
    label: "Paste a customer twice",
    action: "Appends exact copies of rows 2 and 5 to the bottom of the table.",
    hits: "uniqueness",
    hitsLabel: "Uniqueness",
  },
  {
    id: "invalid",
    label: "Mangle formats",
    action: "Drops the @ from row 4's email, pushes row 6's signup date to 2031, and gives row 11 the month 13.",
    hits: "validity",
    hitsLabel: "Validity",
  },
  {
    id: "inconsistent",
    label: "Cross the wires",
    action: "Rewrites the phone country codes on rows 1, 7, and 13 so they contradict the country column.",
    hits: "consistency",
    hitsLabel: "Consistency",
  },
  {
    id: "stale",
    label: "Let records age",
    action: "Pushes last-updated on rows 2, 5, 9, and 14 back to dates in 2022 through 2024.",
    hits: "timeliness",
    hitsLabel: "Timeliness",
  },
  {
    id: "inaccurate",
    label: "Drift from the truth",
    action: "Respells verified names and emails on rows 2, 5, 9, and 13. Every new value still passes every format check.",
    hits: "accuracy",
    hitsLabel: "Accuracy",
  },
];

/** Applies the active defect toggles to the base rows. Pure and deterministic. */
export function buildDataset(active: Record<DefectId, boolean>): CustomerRow[] {
  const rows = BASE_ROWS.map((r) => ({ ...r }));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const get = (id: number) => byId.get(id) as CustomerRow;

  if (active.missing) {
    get(3).email = null;
    get(10).email = null;
    get(8).phone = null;
    get(12).name = null;
  }
  if (active.invalid) {
    get(4).email = "maria.lopez.solarisretail.com"; // no @
    get(6).signupDate = "2031-04-12"; // in the future relative to the audit date
    get(11).signupDate = "1999-13-05"; // month 13 does not exist
  }
  if (active.inconsistent) {
    get(1).phone = "+44 4155550132"; // US row, GB code
    get(7).phone = "+1 145550122"; // FR row, US code
    get(13).phone = "+47 662550178"; // JP row, NO code
  }
  if (active.stale) {
    get(2).lastUpdated = "2023-03-14";
    get(5).lastUpdated = "2024-01-20";
    get(9).lastUpdated = "2022-11-02";
    get(14).lastUpdated = "2023-08-08";
  }
  if (active.inaccurate) {
    get(2).email = "jon.smith@acmecorp.com"; // valid format, wrong spelling
    get(5).name = "Sonja Berg";
    get(9).email = "emma.wilson@thamesmediagroup.co.uk";
    get(13).name = "Kenji Saito";
  }
  if (active.duplicate) {
    rows.push({ ...get(2) }, { ...get(5) });
  }
  return rows;
}

// ── Date math (deterministic, string-driven) ─────────────────────────────────

/** ISO string to day count since epoch, or null if not a real calendar date. */
export function dayNumber(iso: string): number | null {
  if (!ISO_DATE_RE.test(iso)) return null;
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  const d = Number(iso.slice(8, 10));
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const t = Date.UTC(y, m - 1, d);
  const dt = new Date(t); // constructed from a fixed number: deterministic
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  return Math.floor(t / 86400000);
}

// ── Dimension meters ─────────────────────────────────────────────────────────

export interface DimensionResult {
  pct: number; // 0..1, share of checks that pass
  bad: number;
  checked: number;
  caption: string;
}

export function computeDimensions(
  rows: CustomerRow[]
): Record<DimensionId, DimensionResult> {
  const todayDay = dayNumber(REFERENCE_TODAY) as number;
  const minSignupDay = dayNumber(SIGNUP_MIN) as number;

  // Completeness: non-null cells over all rows x six fields
  const totalCells = rows.length * FIELDS.length;
  let nullCells = 0;
  for (const r of rows) {
    for (const f of FIELDS) if (r[f] === null) nullCells++;
  }

  // Uniqueness: duplicate rows via exact (case-insensitive) email key match
  const emailCounts = new Map<string, number>();
  let nonNullEmails = 0;
  for (const r of rows) {
    if (r.email !== null) {
      nonNullEmails++;
      const k = r.email.toLowerCase();
      emailCounts.set(k, (emailCounts.get(k) ?? 0) + 1);
    }
  }
  const dupRows = nonNullEmails - emailCounts.size;

  // Validity: email format + signup date is a real date inside [SIGNUP_MIN, today]
  let vChecks = 0;
  let vBad = 0;
  for (const r of rows) {
    if (r.email !== null) {
      vChecks++;
      if (!EMAIL_RE.test(r.email)) vBad++;
    }
    if (r.signupDate !== null) {
      vChecks++;
      const d = dayNumber(r.signupDate);
      if (d === null || d < minSignupDay || d > todayDay) vBad++;
    }
  }

  // Consistency: phone country code must match the country column
  let cChecks = 0;
  let cBad = 0;
  for (const r of rows) {
    if (r.country !== null && r.phone !== null) {
      const prefix = COUNTRY_PREFIX[r.country];
      if (prefix) {
        cChecks++;
        if (!r.phone.startsWith(prefix)) cBad++;
      }
    }
  }

  // Timeliness: last updated within the freshness window of the pinned audit date
  let tChecks = 0;
  let tBad = 0;
  for (const r of rows) {
    if (r.lastUpdated !== null) {
      tChecks++;
      const d = dayNumber(r.lastUpdated);
      if (d === null || d > todayDay || todayDay - d > FRESH_WINDOW_DAYS) tBad++;
    }
  }

  // Accuracy: compare every non-null verified field against the contract file
  let aChecks = 0;
  let aBad = 0;
  for (const truth of GROUND_TRUTH) {
    for (const r of rows) {
      if (r.id === truth.id && r[truth.field] !== null) {
        aChecks++;
        if (r[truth.field] !== truth.value) aBad++;
      }
    }
  }

  const share = (bad: number, checked: number) =>
    checked === 0 ? 1 : (checked - bad) / checked;

  return {
    completeness: {
      pct: share(nullCells, totalCells),
      bad: nullCells,
      checked: totalCells,
      caption: `${totalCells - nullCells} of ${totalCells} cells hold a value`,
    },
    uniqueness: {
      pct: share(dupRows, rows.length),
      bad: dupRows,
      checked: rows.length,
      caption: `${dupRows} duplicate ${dupRows === 1 ? "row" : "rows"} of ${rows.length} by exact email key`,
    },
    validity: {
      pct: share(vBad, vChecks),
      bad: vBad,
      checked: vChecks,
      caption: `${vChecks - vBad} of ${vChecks} format checks pass (email pattern, signup range)`,
    },
    consistency: {
      pct: share(cBad, cChecks),
      bad: cBad,
      checked: cChecks,
      caption: `${cChecks - cBad} of ${cChecks} country and phone pairs agree`,
    },
    timeliness: {
      pct: share(tBad, tChecks),
      bad: tBad,
      checked: tChecks,
      caption: `${tChecks - tBad} of ${tChecks} rows updated since ${FRESH_CUTOFF}`,
    },
    accuracy: {
      pct: share(aBad, aChecks),
      bad: aBad,
      checked: aChecks,
      caption: `${aChecks - aBad} of ${aChecks} verified fields match the contract file`,
    },
  };
}

// ── Rule builder ─────────────────────────────────────────────────────────────

export type RuleId = "not-null" | "unique" | "in-range" | "matches-format";

export const RULES: ReadonlyArray<{ id: RuleId; label: string; blurb: string }> = [
  { id: "not-null",       label: "not-null",       blurb: "flags rows where the column is null" },
  { id: "unique",         label: "unique",         blurb: "flags every row whose value appears more than once" },
  { id: "in-range",       label: "in-range",       blurb: `flags dates outside ${SIGNUP_MIN} to ${REFERENCE_TODAY} (date columns only)` },
  { id: "matches-format", label: "matches-format", blurb: "flags values that fail the column's format pattern" },
];

export function ruleApplicable(column: FieldName, rule: RuleId): boolean {
  if (rule === "in-range") return column === "signupDate" || column === "lastUpdated";
  return true;
}

export function matchesFormat(column: FieldName, v: string): boolean {
  switch (column) {
    case "name":
      return NAME_RE.test(v);
    case "email":
      return EMAIL_RE.test(v);
    case "country":
      return Object.prototype.hasOwnProperty.call(COUNTRY_PREFIX, v);
    case "phone":
      return PHONE_RE.test(v);
    case "signupDate":
    case "lastUpdated":
      return dayNumber(v) !== null;
  }
}

/** Returns the offending row indices (positions in the current dataset). */
export function evaluateRule(
  rows: CustomerRow[],
  column: FieldName,
  rule: RuleId
): number[] {
  const offenders: number[] = [];
  const todayDay = dayNumber(REFERENCE_TODAY) as number;
  const minDay = dayNumber(SIGNUP_MIN) as number;

  if (rule === "not-null") {
    rows.forEach((r, i) => {
      if (r[column] === null) offenders.push(i);
    });
  } else if (rule === "unique") {
    const groups = new Map<string, number[]>();
    rows.forEach((r, i) => {
      const v = r[column];
      if (v !== null) {
        const k = String(v).toLowerCase();
        const g = groups.get(k) ?? [];
        g.push(i);
        groups.set(k, g);
      }
    });
    for (const g of groups.values()) {
      if (g.length > 1) offenders.push(...g);
    }
    offenders.sort((a, b) => a - b);
  } else if (rule === "in-range") {
    rows.forEach((r, i) => {
      const v = r[column];
      if (v === null) return;
      const d = dayNumber(String(v));
      if (d === null) return; // unparseable is a format problem, not a range problem
      if (d < minDay || d > todayDay) offenders.push(i);
    });
  } else {
    rows.forEach((r, i) => {
      const v = r[column];
      if (v === null) return;
      if (!matchesFormat(column, String(v))) offenders.push(i);
    });
  }
  return offenders;
}

export const FIELD_LABELS: Record<FieldName, string> = {
  name: "name",
  email: "email",
  country: "country",
  phone: "phone",
  signupDate: "signupDate",
  lastUpdated: "lastUpdated",
};
