import type { MetricKey } from "./math";

/**
 * UI metadata for the four monitored signals. Series colors are literal
 * hexes from the guide token table (allowed for data-series colors).
 * The applied-ai category color is pink (#ec4899); it marks the primary
 * quality signal and the regression onset across the guide's charts.
 */

export const APPLIED_AI_PINK = "#ec4899";

export interface MetricMeta {
  key: MetricKey;
  label: string;
  unit: string;
  color: string;
  format: (v: number) => string;
  description: string;
}

export const METRIC_META: Record<MetricKey, MetricMeta> = {
  judge: {
    key: "judge",
    label: "Judge score",
    unit: "0 to 1",
    color: APPLIED_AI_PINK,
    format: (v) => v.toFixed(3),
    description:
      "Mean quality score from an automated LLM judge grading a sample of each hour's responses. The closest thing to ground truth you get in production.",
  },
  refusal: {
    key: "refusal",
    label: "Refusal rate",
    unit: "share of requests",
    color: "#a855f7",
    format: (v) => `${(v * 100).toFixed(1)}%`,
    description:
      "Share of requests the model declines or deflects. Rises when incoming traffic drifts away from what your prompts were tuned for.",
  },
  latency: {
    key: "latency",
    label: "p95 latency",
    unit: "ms",
    color: "#93c5fd",
    format: (v) => `${Math.round(v)} ms`,
    description:
      "95th percentile response time per hour. Longer inputs and longer outputs both push it up, so it moves when traffic drifts.",
  },
  tokens: {
    key: "tokens",
    label: "Tokens per request",
    unit: "tokens",
    color: "#3bb4a4",
    format: (v) => `${Math.round(v)}`,
    description:
      "Mean total tokens per request. Your spend signal: drifting inputs tend to be longer and provoke longer answers.",
  },
};

/** Snapshot stored when the detector first catches the injected regression. */
export interface DetectSnapshot {
  metricLabel: string;
  h: number;
  delay: number;
}

/** Snapshot stored when the first false alarm fires. */
export interface FalseAlarmSnapshot {
  h: number;
  count: number;
}
