// Tidy Data guide: datasets and pivot logic.
// All datasets are literal constants (no RNG anywhere), so server and client
// render identically and every displayed number is recomputable from this file.

export type TableMode = "wide" | "long";

// ── Lab 1: city temperatures, years spread across columns ────────────────────

export const CITIES = ["Oslo", "Madrid", "Cairo"] as const;
export type City = (typeof CITIES)[number];

export const YEARS = [2021, 2022, 2023, 2024] as const;
export type Year = (typeof YEARS)[number];

/** Illustrative annual mean temperatures in Celsius (constants, clearly labeled illustrative in the UI). */
export const WIDE_TEMPS: Record<City, Record<Year, number>> = {
  Oslo: { 2021: 6.9, 2022: 7.4, 2023: 7.1, 2024: 7.8 },
  Madrid: { 2021: 15.4, 2022: 16.1, 2023: 15.8, 2024: 16.5 },
  Cairo: { 2021: 22.1, 2022: 22.6, 2023: 22.3, 2024: 22.9 },
};

export const CITY_COLORS: Record<City, string> = {
  Oslo: "#1e5d8a",
  Madrid: "#3bb4a4",
  Cairo: "#a855f7",
};

export const YEAR_COLORS: Record<Year, string> = {
  2021: "#1e5d8a",
  2022: "#3bb4a4",
  2023: "#a855f7",
  2024: "#ec4899",
};

export interface LongRow {
  city: City;
  year: Year;
  tempC: number;
}

/** pivot_longer: melt the year columns into (city, year, tempC) observation rows. */
export function pivotLonger(): LongRow[] {
  const rows: LongRow[] = [];
  for (const city of CITIES) {
    for (const year of YEARS) {
      rows.push({ city, year, tempC: WIDE_TEMPS[city][year] });
    }
  }
  return rows;
}

/** pivot_wider: rebuild the wide table from long rows (the inverse operation). */
export function pivotWider(rows: LongRow[]): Record<City, Partial<Record<Year, number>>> {
  const wide: Record<City, Partial<Record<Year, number>>> = {
    Oslo: {},
    Madrid: {},
    Cairo: {},
  };
  for (const r of rows) {
    wide[r.city][r.year] = r.tempC;
  }
  return wide;
}

/** True iff pivot_wider(pivot_longer(wide)) reproduces every original cell exactly. */
export function roundTripOk(): boolean {
  const rebuilt = pivotWider(pivotLonger());
  for (const city of CITIES) {
    for (const year of YEARS) {
      if (rebuilt[city][year] !== WIDE_TEMPS[city][year]) return false;
    }
  }
  return true;
}

// ── Lab 2: choose-the-variables exercise (blood pressure diary) ──────────────

export type ColumnKind = "id" | "value";
export type Choice = "id" | "melt";

export interface ExerciseCol {
  key: string;
  label: string;
  /** Ground truth: is this column an identifier variable, or values of one measurement spread wide? */
  kind: ColumnKind;
  /** Unit of the numbers stored in this column ("" for names/labels). */
  unit: string;
  /** The variable value hiding inside the column header, if any. */
  hiddenValue?: string;
}

export const EX_COLS: ExerciseCol[] = [
  { key: "patient", label: "patient", kind: "id", unit: "" },
  { key: "weight_kg", label: "weight_kg", kind: "id", unit: "kg" },
  { key: "bp_week1", label: "bp_week1", kind: "value", unit: "mmHg", hiddenValue: "week 1" },
  { key: "bp_week2", label: "bp_week2", kind: "value", unit: "mmHg", hiddenValue: "week 2" },
  { key: "bp_week3", label: "bp_week3", kind: "value", unit: "mmHg", hiddenValue: "week 3" },
];

export type ExerciseRow = Record<string, string | number>;

/** Illustrative systolic blood pressure readings (mmHg) plus patient attributes. */
export const EX_ROWS: ExerciseRow[] = [
  { patient: "P1", weight_kg: 70, bp_week1: 128, bp_week2: 126, bp_week3: 122 },
  { patient: "P2", weight_kg: 84, bp_week1: 141, bp_week2: 138, bp_week3: 135 },
  { patient: "P3", weight_kg: 63, bp_week1: 118, bp_week2: 117, bp_week3: 119 },
];

export interface ExercisePivotRow {
  ids: { key: string; value: string | number }[];
  measurement: string;
  value: string | number;
}

export interface ExerciseResult {
  rows: ExercisePivotRow[];
  idColKeys: string[];
  meltColKeys: string[];
  /** Identifier columns the learner wrongly melted into the value column. */
  meltedIdCols: string[];
  /** Measurement columns the learner wrongly kept as headers. */
  leftBehindValueCols: string[];
  /** Distinct units now mixed inside the single value column. */
  unitsInValueColumn: string[];
  isTidy: boolean;
}

/**
 * Run the learner's pivot: melt every column they marked "melt", keep the rest
 * as identifiers, then check tidiness. The check is computed, not hardcoded:
 * a result is tidy iff (a) at least one column was melted, (b) no identifier
 * column got melted (each result row would stop being one observation of one
 * measurement), and (c) no measurement column was left behind as a header
 * (a variable would still be hiding in column names).
 */
export function runExercisePivot(choice: Record<string, Choice>): ExerciseResult | null {
  const meltCols = EX_COLS.filter((c) => choice[c.key] === "melt");
  const idCols = EX_COLS.filter((c) => choice[c.key] !== "melt");
  if (meltCols.length === 0) return null;

  const rows: ExercisePivotRow[] = [];
  for (const dataRow of EX_ROWS) {
    for (const col of meltCols) {
      rows.push({
        ids: idCols.map((c) => ({ key: c.key, value: dataRow[c.key] })),
        measurement: col.label,
        value: dataRow[col.key],
      });
    }
  }

  const meltedIdCols = meltCols.filter((c) => c.kind === "id").map((c) => c.label);
  const leftBehindValueCols = idCols.filter((c) => c.kind === "value").map((c) => c.label);
  const unitsInValueColumn = Array.from(
    new Set(meltCols.map((c) => (c.unit === "" ? "unitless labels" : c.unit)))
  );
  const isTidy = meltedIdCols.length === 0 && leftBehindValueCols.length === 0;

  return {
    rows,
    idColKeys: idCols.map((c) => c.key),
    meltColKeys: meltCols.map((c) => c.key),
    meltedIdCols,
    leftBehindValueCols,
    unitsInValueColumn,
    isTidy,
  };
}
