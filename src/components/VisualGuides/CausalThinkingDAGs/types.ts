export interface DAGNode {
  id: string;
  label: string;
  role: "treatment" | "outcome" | "confounder" | "mediator" | "collider" | "cause";
  x: number;
  y: number;
  color: string;
}

export interface DAGEdge {
  id: string;
  source: string;
  target: string;
  /** Legacy flag; association edges supersede it */
  spurious?: boolean;
  /**
   * Undirected, non-causal ASSOCIATION edge (dashed, no arrowhead).
   * Not part of the DAG's causal structure; visualizes a spurious or
   * induced correlation between two variables.
   */
  association?: boolean;
  /** Association edge is hidden while ANY of these nodes are controlled */
  hideWhenControlled?: string[];
  /** Association edge is shown only while ALL of these nodes are controlled */
  showWhenControlled?: string[];
  /** Stroke color for association edges */
  associationColor?: string;
  /** Small caption drawn along association edges */
  label?: string;
}

export interface DAG {
  nodes: DAGNode[];
  edges: DAGEdge[];
}

export type ScenarioId = "confounder" | "mediator" | "collider";

export interface BiasResult {
  status: "unbiased" | "partial" | "biased" | "blocked";
  label: string;
  explanation: string;
  detail: string;
  color: string;
}

export interface Scenario {
  id: ScenarioId;
  title: string;
  subtitle: string;
  dag: DAG;
  getBiasResult: (controlled: Set<string>) => BiasResult;
  controlInfo: Record<string, string>;
}

// ── Node colour constants ─────────────────────────────────────────────────────
// Raw hexes required: values are concatenated with alpha suffixes (e.g. `${color}22`).
export const NODE_COLORS: Record<DAGNode["role"], string> = {
  treatment:  "#1e5d8a",
  outcome:    "#3bb4a4",
  confounder: "#d4af37",
  mediator:   "#a855f7",
  collider:   "#ef4444",
  cause:      "#64748b",
};
