// Shared data + aggregation logic for the Split, Apply, Combine guide.
// The dataset is a literal constant (no randomness), so server and client
// render identically and every displayed number can be recomputed by hand.

export type Region = "North" | "South" | "East";
export type Product = "Coffee" | "Tea";

export interface Txn {
  id: number;
  region: Region;
  product: Product;
  units: number;
  revenue: number;
}

// 12 transactions. Prices are consistent: Coffee $4.50/unit, Tea $3.50/unit,
// so revenue = units * unit price for every row.
export const TRANSACTIONS: readonly Txn[] = [
  { id: 1, region: "North", product: "Coffee", units: 4, revenue: 18.0 },
  { id: 2, region: "North", product: "Tea", units: 2, revenue: 7.0 },
  { id: 3, region: "South", product: "Coffee", units: 6, revenue: 27.0 },
  { id: 4, region: "East", product: "Tea", units: 5, revenue: 17.5 },
  { id: 5, region: "South", product: "Tea", units: 3, revenue: 10.5 },
  { id: 6, region: "East", product: "Coffee", units: 2, revenue: 9.0 },
  { id: 7, region: "North", product: "Coffee", units: 8, revenue: 36.0 },
  { id: 8, region: "South", product: "Coffee", units: 3, revenue: 13.5 },
  { id: 9, region: "East", product: "Tea", units: 1, revenue: 3.5 },
  { id: 10, region: "North", product: "Tea", units: 6, revenue: 21.0 },
  { id: 11, region: "South", product: "Tea", units: 4, revenue: 14.0 },
  { id: 12, region: "North", product: "Coffee", units: 5, revenue: 22.5 },
];

export type GroupCol = "region" | "product";
export type AggFn = "count" | "sum" | "mean" | "min" | "max";
export type ValueCol = "revenue" | "units";

export const REGION_ORDER: readonly Region[] = ["North", "South", "East"];
export const PRODUCT_ORDER: readonly Product[] = ["Coffee", "Tea"];

export function groupOrder(col: GroupCol): readonly string[] {
  return col === "region" ? REGION_ORDER : PRODUCT_ORDER;
}

// Data-vis series colors (literal hexes allowed for series identity).
export const GROUP_COLORS: Record<GroupCol, Record<string, string>> = {
  region: { North: "#3bb4a4", South: "#a855f7", East: "#ec4899" },
  product: { Coffee: "#60a5fa", Tea: "#ef4444" },
};

export const AGG_LABELS: Record<AggFn, string> = {
  count: "Count",
  sum: "Sum",
  mean: "Mean",
  min: "Min",
  max: "Max",
};

export interface GroupBucket {
  key: string;
  rows: Txn[];
}

/** SPLIT: partition rows into one bucket per distinct value of the group column. */
export function groupRows(rows: readonly Txn[], col: GroupCol): GroupBucket[] {
  return groupOrder(col)
    .map((key) => ({ key, rows: rows.filter((r) => r[col] === key) }))
    .filter((g) => g.rows.length > 0);
}

/** APPLY: collapse one bucket of rows to a single number. */
export function applyAgg(rows: readonly Txn[], fn: AggFn, col: ValueCol): number {
  if (fn === "count") return rows.length;
  const vals = rows.map((r) => r[col]);
  const total = vals.reduce((a, b) => a + b, 0);
  switch (fn) {
    case "sum":
      return total;
    case "mean":
      return total / vals.length;
    case "min":
      return Math.min(...vals);
    case "max":
      return Math.max(...vals);
  }
}

export interface AggRow {
  key: string;
  value: number;
  n: number;
}

/** SPLIT + APPLY + COMBINE in one call: the whole group-by, as a new table. */
export function aggregate(
  rows: readonly Txn[],
  groupCol: GroupCol,
  fn: AggFn,
  valueCol: ValueCol
): AggRow[] {
  return groupRows(rows, groupCol).map((g) => ({
    key: g.key,
    value: applyAgg(g.rows, fn, valueCol),
    n: g.rows.length,
  }));
}

export interface PivotResult {
  rowKeys: string[];
  colKeys: string[];
  /** cells[i][j] = agg over rows where rowCol = rowKeys[i] AND colCol = colKeys[j]; null if no rows. */
  cells: (number | null)[][];
  /** rowTotals[i] = agg over ALL rows of rowKeys[i] (not an average of averages). */
  rowTotals: number[];
  colTotals: number[];
  grand: number;
}

/** Two-level grouping rendered as a pivot: rows = rowCol values, columns = colCol values. */
export function pivot(
  rows: readonly Txn[],
  rowCol: GroupCol,
  colCol: GroupCol,
  fn: AggFn,
  valueCol: ValueCol
): PivotResult {
  const rowKeys = [...groupOrder(rowCol)];
  const colKeys = [...groupOrder(colCol)];
  const cells = rowKeys.map((rk) =>
    colKeys.map((ck) => {
      const cell = rows.filter((r) => r[rowCol] === rk && r[colCol] === ck);
      return cell.length === 0 ? null : applyAgg(cell, fn, valueCol);
    })
  );
  const rowTotals = rowKeys.map((rk) =>
    applyAgg(rows.filter((r) => r[rowCol] === rk), fn, valueCol)
  );
  const colTotals = colKeys.map((ck) =>
    applyAgg(rows.filter((r) => r[colCol] === ck), fn, valueCol)
  );
  return { rowKeys, colKeys, cells, rowTotals, colTotals, grand: applyAgg(rows, fn, valueCol) };
}

/** Display formatting: counts are integers, revenue is dollars, units keep 2 dp only when fractional. */
export function formatAgg(fn: AggFn, valueCol: ValueCol, v: number): string {
  if (fn === "count") return String(Math.round(v));
  if (valueCol === "revenue") return `$${v.toFixed(2)}`;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

/** Human-readable name of what a (fn, valueCol) recipe computes. */
export function measureLabel(fn: AggFn, valueCol: ValueCol): string {
  if (fn === "count") return "count of transactions";
  const noun = valueCol === "revenue" ? "revenue" : "units";
  const verb: Record<Exclude<AggFn, "count">, string> = {
    sum: "total",
    mean: "average",
    min: "minimum",
    max: "maximum",
  };
  return `${verb[fn]} ${noun}`;
}

// ── Question translator ──────────────────────────────────────────────────────

export interface MeasureOption {
  id: string;
  fn: AggFn;
  valueCol: ValueCol;
  label: string;
}

export const MEASURE_OPTIONS: readonly MeasureOption[] = [
  { id: "count", fn: "count", valueCol: "revenue", label: "Count of transactions" },
  { id: "sum-revenue", fn: "sum", valueCol: "revenue", label: "Sum of revenue" },
  { id: "mean-revenue", fn: "mean", valueCol: "revenue", label: "Mean of revenue" },
  { id: "sum-units", fn: "sum", valueCol: "units", label: "Sum of units" },
  { id: "mean-units", fn: "mean", valueCol: "units", label: "Mean of units" },
];

export interface TranslatorQuestion {
  id: string;
  text: string;
  groupCol: GroupCol;
  measureId: string;
}

export const QUESTIONS: readonly TranslatorQuestion[] = [
  {
    id: "q1",
    text: "What is the total revenue per region?",
    groupCol: "region",
    measureId: "sum-revenue",
  },
  {
    id: "q2",
    text: "How many transactions did each product generate?",
    groupCol: "product",
    measureId: "count",
  },
  {
    id: "q3",
    text: "What is the average number of units sold per region?",
    groupCol: "region",
    measureId: "mean-units",
  },
];

export function measureById(id: string): MeasureOption {
  const m = MEASURE_OPTIONS.find((o) => o.id === id);
  if (!m) throw new Error(`Unknown measure: ${id}`);
  return m;
}

/** Numeric comparison of two aggregation results (same keys, same values). */
export function sameResult(a: AggRow[], b: AggRow[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (row, i) => row.key === b[i].key && Math.abs(row.value - b[i].value) < 1e-9
  );
}
