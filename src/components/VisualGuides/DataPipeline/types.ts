export type StageId =
  | "ingest"
  | "validate"
  | "clean"
  | "transform"
  | "aggregate"
  | "load";

export type IssueType = "missing" | "outlier" | "duplicate" | "type-error" | "inconsistent";

export interface PipelineStage {
  id: StageId;
  label: string;
  icon: string;
  color: string;
  description: string;
  detail: string;
  tools: string[];
  outputLabel: string;
}

export interface DataRow {
  id: number;
  name: string;
  /** number when valid; a raw string (e.g. "thirty") for type errors; null when missing */
  age: number | string | null;
  salary: number | null;
  dept: string | null;
  issues: IssueType[];
}

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: "ingest",
    label: "Ingest",
    icon: "⬇",
    color: "#3b82f6",
    description: "Raw data arrives from multiple sources: CSV uploads, API responses, database dumps.",
    detail: "The pipeline ingests 12 employee records from a CSV export. Data is unvalidated: it arrives exactly as sent.",
    tools: ["Apache Kafka", "AWS S3", "Airbyte", "Fivetran"],
    outputLabel: "12 raw records",
  },
  {
    id: "validate",
    label: "Validate",
    icon: "✓",
    color: "#a855f7",
    description: "Schema checks: correct column types, required fields present, value ranges in bounds.",
    detail: "Schema validation catches type mismatches (age as string), missing required fields, and impossible values.",
    tools: ["Great Expectations", "Pydantic", "dbt tests", "Cerberus"],
    outputLabel: "12 records + 6 flags",
  },
  {
    id: "clean",
    label: "Clean",
    icon: "🧹",
    color: "#ec4899",
    description: "Fix or remove: null imputation, duplicate removal, outlier treatment, typo correction.",
    detail: "Exact duplicate dropped first; then missing or unparseable values imputed with the median of the remaining rows (age 33, salary $83,000), salary outlier capped at $120,000, department typo corrected.",
    tools: ["Pandas", "dbt", "OpenRefine", "Spark"],
    outputLabel: "11 clean records",
  },
  {
    id: "transform",
    label: "Transform",
    icon: "⇄",
    color: "#f97316",
    description: "Feature engineering: normalize numerics, encode categoricals, derive new columns.",
    detail: "Salary normalized to z-scores (shown below). A real pipeline would also one-hot encode department and derive features like a seniority tier.",
    tools: ["scikit-learn", "Pandas", "dbt", "Spark"],
    outputLabel: "11 transformed records",
  },
  {
    id: "aggregate",
    label: "Aggregate",
    icon: "∑",
    color: "#22c55e",
    description: "Group and summarize: compute department averages, counts, pivots, and rollups.",
    detail: "Per-department summaries: headcount, mean salary, salary std dev. Ready for dashboards.",
    tools: ["SQL GROUP BY", "Pandas groupby", "dbt", "Spark aggregation"],
    outputLabel: "3 department summaries",
  },
  {
    id: "load",
    label: "Load",
    icon: "⬆",
    color: "#3bb4a4",
    description: "Write to destination: data warehouse, feature store, dashboard cache, or downstream API.",
    detail: "Summaries written to Postgres data warehouse. Clean records written to feature store for ML training.",
    tools: ["PostgreSQL", "Snowflake", "BigQuery", "Redis"],
    outputLabel: "Stored in warehouse",
  },
];

export const RAW_DATA: DataRow[] = [
  { id: 1,  name: "Alice",  age: 32, salary: 85000,  dept: "Engineering", issues: [] },
  { id: 2,  name: "Bob",    age: 28, salary: 72000,  dept: "Engineering", issues: [] },
  { id: 3,  name: "Carol",  age: null, salary: 91000, dept: "Marketing",  issues: ["missing"] },
  { id: 4,  name: "Dave",   age: 45, salary: null,   dept: "Sales",       issues: ["missing"] },
  { id: 5,  name: "Eve",    age: 31, salary: 999999, dept: "Engineering", issues: ["outlier"] },
  { id: 6,  name: "Frank",  age: 38, salary: 67000,  dept: "Marketting",  issues: ["inconsistent"] },
  { id: 7,  name: "Grace",  age: 29, salary: 78000,  dept: "Sales",       issues: [] },
  // Bob appears twice in the CSV export (same person, re-ingested) — an exact duplicate of row 2
  { id: 8,  name: "Bob",    age: 28, salary: 72000,  dept: "Engineering", issues: ["duplicate"] },
  { id: 9,  name: "Iris",   age: 36, salary: 88000,  dept: "Marketing",   issues: [] },
  { id: 10, name: "Jack",   age: 41, salary: 95000,  dept: "Sales",       issues: [] },
  { id: 11, name: "Karen",  age: 33, salary: 81000,  dept: "Engineering", issues: [] },
  { id: 12, name: "Leo",    age: "thirty", salary: 74000, dept: "Marketing", issues: ["type-error"] },
];

export const ISSUE_META: Record<IssueType, { label: string; color: string; desc: string }> = {
  missing:    { label: "Missing",    color: "#f97316", desc: "Null / empty value" },
  outlier:    { label: "Outlier",    color: "#ef4444", desc: "Value far outside normal range" },
  duplicate:  { label: "Duplicate",  color: "#a855f7", desc: "Exact copy of another row" },
  "type-error": { label: "Type Error", color: "var(--color-warning)", desc: "Wrong data type" },
  inconsistent: { label: "Inconsistent", color: "#3bb4a4", desc: "Misspelled / inconsistent category value" },
};
