export type ScenarioId = "weather" | "calculator" | "database";

export type TraceRole = "user" | "tool_call" | "tool_result" | "final";

export type TraceActor = "user" | "model" | "runtime";

export interface TraceStep {
  role: TraceRole;
  /** Who produces this message in the loop. */
  actor: TraceActor;
  /** Natural-language content (user message or assistant text). */
  text?: string;
  /** Tool name, present on tool_call steps. */
  toolName?: string;
  /** Pretty-printed JSON arguments, present on tool_call steps. */
  argsJson?: string;
  /** Pretty-printed JSON payload, present on tool_result steps. */
  resultJson?: string;
  /** What the model vs the runtime is doing at this step. */
  annotation: string;
}

export interface Scenario {
  id: ScenarioId;
  label: string;
  toolSummary: string;
  color: string;
  steps: TraceStep[];
}

export const ROLE_META: Record<
  TraceRole,
  { label: string; color: string; actorLabel: string }
> = {
  user: {
    label: "User",
    color: "#1e5d8a",
    actorLabel: "USER",
  },
  tool_call: {
    label: "Assistant · Tool call",
    color: "var(--color-accent)",
    actorLabel: "MODEL",
  },
  tool_result: {
    label: "Tool result",
    color: "#3bb4a4",
    actorLabel: "RUNTIME",
  },
  final: {
    label: "Assistant · Final answer",
    color: "var(--color-success)",
    actorLabel: "MODEL",
  },
};
