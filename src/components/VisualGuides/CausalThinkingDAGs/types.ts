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
  spurious?: boolean;
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
export const NODE_COLORS: Record<DAGNode["role"], string> = {
  treatment:  "#1e5d8a",
  outcome:    "#3bb4a4",
  confounder: "#d4af37",
  mediator:   "#a855f7",
  collider:   "#ef4444",
  cause:      "#64748b",
};
