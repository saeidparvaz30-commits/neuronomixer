// Pure data + rule engine for the Data Validation guide. No React in this file.
// Every count, sum, and verdict displayed in the guide is computed by running
// the functions below against the fixture batches. Nothing is pre-baked.

export type CellValue = string | number | null;

export type ColumnId = "order_id" | "customer_id" | "amount" | "quantity";

export type DeclaredType = "string" | "number" | "integer";

export interface ColumnMeta {
  id: ColumnId;
  declaredType: DeclaredType;
  /** Human-readable data dictionary line, the contract the rules enforce. */
  contract: string;
}

export const COLUMNS: readonly ColumnMeta[] = [
  {
    id: "order_id",
    declaredType: "string",
    contract: "Order key, format ORD-1xxx. Must be unique: one row per order.",
  },
  {
    id: "customer_id",
    declaredType: "string",
    contract: "Required. Must exist in the customers reference table.",
  },
  {
    id: "amount",
    declaredType: "number",
    contract: "Order value in dollars. Valid orders are 5 to 500.",
  },
  {
    id: "quantity",
    declaredType: "integer",
    contract: "Items in the order, 1 to 10.",
  },
] as const;

export const COLUMN_META: Record<ColumnId, ColumnMeta> = Object.fromEntries(
  COLUMNS.map((c) => [c.id, c])
) as Record<ColumnId, ColumnMeta>;

// ── Reference table for the relationship rule ───────────────────────────────

export const CUSTOMERS: readonly { id: string; name: string }[] = [
  { id: "C-101", name: "Aylin" },
  { id: "C-102", name: "Bram" },
  { id: "C-103", name: "Chidi" },
  { id: "C-104", name: "Dara" },
  { id: "C-105", name: "Emre" },
  { id: "C-106", name: "Farah" },
] as const;

export const CUSTOMER_IDS: ReadonlySet<string> = new Set(
  CUSTOMERS.map((c) => c.id)
);

// ── Fixture batches (deterministic, hand-authored, inspectable) ─────────────
// Each defective row carries its ground-truth defect kind so the guide can
// count escapes honestly. The rules never read this field; they only see the
// four cell values, exactly like a real validation gate would.

export type DefectKind = "type" | "range" | "not-null" | "unique" | "relationship";

export interface OrderRow {
  /** Stable render key; not a data column. */
  rowId: string;
  order_id: CellValue;
  customer_id: CellValue;
  amount: CellValue;
  quantity: CellValue;
  defect: DefectKind | null;
}

export interface Batch {
  day: number;
  label: string;
  rows: readonly OrderRow[];
}

function row(
  rowId: string,
  order_id: CellValue,
  customer_id: CellValue,
  amount: CellValue,
  quantity: CellValue,
  defect: DefectKind | null = null
): OrderRow {
  return { rowId, order_id, customer_id, amount, quantity, defect };
}

export const BATCHES: readonly Batch[] = [
  {
    day: 1,
    label: "Day 1",
    rows: [
      row("d1-1", "ORD-1001", "C-103", 42.5, 1),
      row("d1-2", "ORD-1002", "C-101", 129.99, 2),
      row("d1-3", "ORD-1003", "C-105", 88.0, 1),
      row("d1-4", "ORD-1004", "C-102", "N/A", 1, "type"),
      row("d1-5", "ORD-1005", "C-104", 260.75, 3),
      row("d1-6", "ORD-1006", "C-106", 19.99, 1),
      row("d1-7", "ORD-1007", "C-101", 250000, 2, "range"),
      row("d1-8", "ORD-1008", "C-103", 310.4, 4),
    ],
  },
  {
    day: 2,
    label: "Day 2",
    rows: [
      row("d2-1", "ORD-1009", "C-102", 75.25, 1),
      row("d2-2", "ORD-1010", "C-105", 214.9, 2),
      row("d2-3", "ORD-1011", null, 96.0, 1, "not-null"),
      row("d2-4", "ORD-1012", "C-106", 33.1, 1),
      row("d2-5", "ORD-1013", "C-101", 149.5, 2),
      row("d2-6", "ORD-1014", "C-104", 58.8, 0, "range"),
      row("d2-7", "ORD-1015", "C-103", 402.0, 5),
      row("d2-8", "ORD-1016", "C-102", 27.6, 1),
    ],
  },
  {
    day: 3,
    label: "Day 3",
    rows: [
      row("d3-1", "ORD-1017", "C-105", 181.2, 2),
      row("d3-2", "ORD-1018", "C-101", 64.35, 1),
      row("d3-3", "ORD-1003", "C-105", 88.0, 1, "unique"),
      row("d3-4", "ORD-1019", "C-104", 240.0, 3),
      row("d3-5", "ORD-1020", "C-419", 117.45, 1, "relationship"),
      row("d3-6", "ORD-1021", "C-106", 92.8, 2),
      row("d3-7", "ORD-1022", "C-102", 305.15, 4),
      row("d3-8", "ORD-1023", "C-103", 48.9, 1),
    ],
  },
] as const;

export const TOTAL_ROWS = BATCHES.reduce((n, b) => n + b.rows.length, 0);

export const TOTAL_DEFECTS = BATCHES.reduce(
  (n, b) => n + b.rows.filter((r) => r.defect !== null).length,
  0
);

// ── Rules ────────────────────────────────────────────────────────────────────

export type RuleKind = DefectKind;

export interface RuleConfig {
  /** `${kind}:${column}`; one rule per kind and column. */
  id: string;
  kind: RuleKind;
  column: ColumnId;
  min?: number;
  max?: number;
  enabled: boolean;
}

export function makeRuleId(kind: RuleKind, column: ColumnId): string {
  return `${kind}:${column}`;
}

export const RULE_KINDS: readonly {
  kind: RuleKind;
  label: string;
  hint: string;
  columns: readonly ColumnId[];
}[] = [
  {
    kind: "type",
    label: "type",
    hint: "The value must match the column's declared type. Nulls pass; missingness is not_null's job.",
    columns: ["order_id", "customer_id", "amount", "quantity"],
  },
  {
    kind: "range",
    label: "range",
    hint: "Numeric values must fall between min and max, inclusive. Non-numbers pass; wrong types are type's job.",
    columns: ["amount", "quantity"],
  },
  {
    kind: "not-null",
    label: "not_null",
    hint: "The value must be present. Catches nulls and empty strings.",
    columns: ["order_id", "customer_id", "amount", "quantity"],
  },
  {
    kind: "unique",
    label: "unique",
    hint: "No value may appear twice among rows already accepted this run. The second copy is the one that fails.",
    columns: ["order_id", "customer_id", "amount", "quantity"],
  },
  {
    kind: "relationship",
    label: "relationship",
    hint: "The value must exist as a key in the customers reference table.",
    columns: ["customer_id"],
  },
] as const;

export function ruleLabel(rule: RuleConfig): string {
  switch (rule.kind) {
    case "type":
      return `type(${rule.column}): ${COLUMN_META[rule.column].declaredType}`;
    case "range":
      return `range(${rule.column}): ${rule.min} to ${rule.max}`;
    case "not-null":
      return `not_null(${rule.column})`;
    case "unique":
      return `unique(${rule.column})`;
    case "relationship":
      return `relationship(${rule.column}) in customers`;
  }
}

/** Sensible builder defaults for the range rule, taken from the data dictionary. */
export function defaultRangeFor(column: ColumnId): { min: number; max: number } {
  return column === "quantity" ? { min: 1, max: 10 } : { min: 5, max: 500 };
}

// ── Rule evaluation ──────────────────────────────────────────────────────────

function isBlank(v: CellValue): boolean {
  return v === null || v === "";
}

function rulePasses(
  rule: RuleConfig,
  rowData: OrderRow,
  seen: ReadonlyMap<ColumnId, ReadonlySet<string>>
): boolean {
  const value = rowData[rule.column];
  switch (rule.kind) {
    case "not-null":
      return !isBlank(value);
    case "type": {
      if (isBlank(value)) return true;
      const t = COLUMN_META[rule.column].declaredType;
      if (t === "string") return typeof value === "string";
      if (t === "integer") return typeof value === "number" && Number.isInteger(value);
      return typeof value === "number" && Number.isFinite(value);
    }
    case "range": {
      if (typeof value !== "number") return true;
      const min = rule.min ?? Number.NEGATIVE_INFINITY;
      const max = rule.max ?? Number.POSITIVE_INFINITY;
      return value >= min && value <= max;
    }
    case "unique": {
      if (isBlank(value)) return true;
      return !(seen.get(rule.column)?.has(String(value)) ?? false);
    }
    case "relationship": {
      if (isBlank(value)) return true;
      return CUSTOMER_IDS.has(String(value));
    }
  }
}

export interface RowVerdict {
  row: OrderRow;
  batchDay: number;
  /** Ids of the active rules that caught this row. */
  failedRules: string[];
  caught: boolean;
}

export interface BatchResult {
  day: number;
  verdicts: RowVerdict[];
}

export interface RunResult {
  batches: BatchResult[];
  /** Defective rows quarantined by the active rules. */
  caughtDefective: number;
  /** Defective rows that passed every active rule and reached the warehouse. */
  escapedDefective: number;
  /** Contract-valid rows quarantined anyway (overzealous rules). */
  falseAlarms: number;
  loadedCount: number;
  quarantinedCount: number;
}

/**
 * Runs the batches through the gate in order, exactly once each, the way a
 * scheduled pipeline job would. Uniqueness is tracked across rows accepted
 * earlier in the same run.
 */
export function evaluateRun(
  batches: readonly Batch[],
  rules: readonly RuleConfig[]
): RunResult {
  const active = rules.filter((r) => r.enabled);
  const uniqueColumns = active
    .filter((r) => r.kind === "unique")
    .map((r) => r.column);
  const seen = new Map<ColumnId, Set<string>>(
    uniqueColumns.map((c) => [c, new Set<string>()])
  );

  const batchResults: BatchResult[] = [];
  let caughtDefective = 0;
  let escapedDefective = 0;
  let falseAlarms = 0;
  let loadedCount = 0;
  let quarantinedCount = 0;

  for (const batch of batches) {
    const verdicts: RowVerdict[] = [];
    for (const r of batch.rows) {
      const failedRules = active
        .filter((rule) => !rulePasses(rule, r, seen))
        .map((rule) => rule.id);
      const caught = failedRules.length > 0;
      verdicts.push({ row: r, batchDay: batch.day, failedRules, caught });

      if (caught) {
        quarantinedCount++;
        if (r.defect !== null) caughtDefective++;
        else falseAlarms++;
      } else {
        loadedCount++;
        if (r.defect !== null) escapedDefective++;
        for (const c of uniqueColumns) {
          const v = r[c];
          if (!isBlank(v)) seen.get(c)!.add(String(v));
        }
      }
    }
    batchResults.push({ day: batch.day, verdicts });
  }

  return {
    batches: batchResults,
    caughtDefective,
    escapedDefective,
    falseAlarms,
    loadedCount,
    quarantinedCount,
  };
}

// ── Revenue math for the dashboard chart ─────────────────────────────────────

/**
 * Coerces a loaded cell the way a naive downstream SUM would: numbers pass
 * through, text is cast (so "N/A" becomes NaN and poisons the total).
 */
export function amountAsNumber(v: CellValue): number {
  if (typeof v === "number") return v;
  return Number(v);
}

/** Sum of loaded amounts for one day. NaN if a non-numeric amount got through. */
export function revenueForDay(loaded: readonly RowVerdict[], day: number): number {
  let sum = 0;
  for (const v of loaded) {
    if (v.batchDay === day) sum += amountAsNumber(v.row.amount);
  }
  return sum;
}

/** What the chart looks like when every defective row is quarantined. */
export const CLEAN_REVENUE: Readonly<Record<number, number>> = Object.fromEntries(
  BATCHES.map((b) => [
    b.day,
    b.rows
      .filter((r) => r.defect === null)
      .reduce((s, r) => s + (typeof r.amount === "number" ? r.amount : 0), 0),
  ])
);

export function formatMoney(v: number): string {
  if (Number.isNaN(v)) return "NaN";
  if (Math.abs(v) >= 10000) return `$${Math.round(v).toLocaleString("en-US")}`;
  return `$${v.toFixed(2)}`;
}

export function formatCell(v: CellValue): string {
  if (v === null) return "NULL";
  if (typeof v === "number") return String(v);
  return v;
}
