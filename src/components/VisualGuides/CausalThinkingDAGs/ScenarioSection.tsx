"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import DAGCanvas from "./DAGCanvas";
import ControlPanel from "./ControlPanel";
import BiasAnalyzer from "./BiasAnalyzer";
import { ScenarioId, DAG, DAGNode, BiasResult, NODE_COLORS } from "./types";

// ── Scenario data ─────────────────────────────────────────────────────────────

const CONFOUNDER_DAG: DAG = {
  nodes: [
    { id: "summer",   label: "Summer",          role: "confounder", x: 240, y: 70,  color: NODE_COLORS.confounder },
    { id: "icecream", label: "Ice Cream Sales",  role: "treatment",  x: 90,  y: 220, color: NODE_COLORS.treatment  },
    { id: "drowning", label: "Drowning Deaths",  role: "outcome",    x: 390, y: 220, color: NODE_COLORS.outcome    },
  ],
  edges: [
    { id: "s-ic",  source: "summer",   target: "icecream" },
    { id: "s-dr",  source: "summer",   target: "drowning" },
    // NOT a causal arrow: the true effect of ice cream on drowning is 0.
    // This dashed association is what the raw data shows, and it disappears
    // once Summer is controlled (or once treatment/outcome are conditioned).
    {
      id: "ic-dr",
      source: "icecream",
      target: "drowning",
      association: true,
      hideWhenControlled: ["summer", "icecream", "drowning"],
      associationColor: "#d4af37",
      label: "spurious association (not causal)",
    },
  ],
};

const MEDIATOR_DAG: DAG = {
  nodes: [
    { id: "edu",     label: "Education",   role: "treatment", x: 80,  y: 150, color: NODE_COLORS.treatment },
    { id: "jobqual", label: "Job Quality", role: "mediator",  x: 240, y: 150, color: NODE_COLORS.mediator  },
    { id: "income",  label: "Income",      role: "outcome",   x: 400, y: 150, color: NODE_COLORS.outcome   },
  ],
  edges: [
    { id: "e-jq",  source: "edu",     target: "jobqual" },
    { id: "jq-i",  source: "jobqual", target: "income"  },
    { id: "e-i",   source: "edu",     target: "income"  },
  ],
};

const COLLIDER_DAG: DAG = {
  nodes: [
    { id: "talent",  label: "Talent",   role: "cause",    x: 100, y: 90,  color: NODE_COLORS.cause    },
    { id: "effort",  label: "Effort",   role: "cause",    x: 380, y: 90,  color: NODE_COLORS.cause    },
    { id: "success", label: "Success",  role: "collider", x: 240, y: 230, color: NODE_COLORS.collider },
  ],
  edges: [
    { id: "t-s", source: "talent", target: "success" },
    { id: "e-s", source: "effort", target: "success" },
    // Appears ONLY while Success (the collider) is conditioned on: the
    // induced, non-causal association between its parents.
    {
      id: "t-e-induced",
      source: "talent",
      target: "effort",
      association: true,
      showWhenControlled: ["success"],
      hideWhenControlled: ["talent", "effort"],
      associationColor: "#ef4444",
      label: "induced association (collider opened)",
    },
  ],
};

// ── Bias logic ─────────────────────────────────────────────────────────────────

function getConfounderBias(controlled: Set<string>): BiasResult {
  const hasSummer   = controlled.has("summer");
  const hasIcecream = controlled.has("icecream");
  const hasDrowning = controlled.has("drowning");

  if (hasDrowning) {
    return {
      status: "blocked",
      label: "Blocked: controlled for outcome",
      explanation:
        "Conditioning on the outcome (Drowning Deaths) selects on the result you are trying to explain; the analysis no longer answers the causal question at all.",
      detail: "Never condition on your outcome variable unless you have a specific causal reason.",
      color: "#94a3b8",
    };
  }
  if (hasIcecream && !hasSummer) {
    return {
      status: "blocked",
      label: "Blocked: treatment controlled",
      explanation:
        "Controlling for Ice Cream Sales removes all variation in your treatment — you can't estimate its effect.",
      detail: "Conditioning on the treatment itself prevents estimation of that treatment's effect.",
      color: "#94a3b8",
    };
  }
  if (hasSummer) {
    return {
      status: "unbiased",
      label: "Unbiased: confounder blocked",
      explanation:
        "Blocking the path Summer → Ice Cream Sales → Drowning Deaths removes the spurious correlation. The true causal effect of Ice Cream on Drowning is exactly 0.",
      detail: "By conditioning on Summer, you compare ice cream sales only within the same season. The dashed association edge is now gone from the graph: the spurious path is closed.",
      color: "#10b981",
    };
  }
  return {
    status: "biased",
    label: "Biased: spurious positive correlation",
    explanation:
      "Ice cream sales and drowning deaths look positively correlated — but only because Summer drives both. This is the classic confounder pattern.",
    detail:
      "The back-door path Ice Cream ← Summer → Drowning is open. You must control for Summer (or any sufficient adjustment set blocking this path) to get the true causal effect.",
    color: "#ef4444",
  };
}

function getMediatorBias(controlled: Set<string>): BiasResult {
  const hasJobQual = controlled.has("jobqual");
  const hasIncome  = controlled.has("income");
  const hasEdu     = controlled.has("edu");

  if (hasIncome) {
    return {
      status: "blocked",
      label: "Blocked: controlling for outcome",
      explanation:
        "Conditioning on the outcome (Income) selects on the very result you are trying to explain; it biases the estimate rather than 'closing paths'. You cannot estimate the causal effect of Education on Income this way.",
      detail: "Conditioning on the outcome (or its descendants) distorts the estimand and can induce collider-style selection bias.",
      color: "#94a3b8",
    };
  }
  if (hasEdu) {
    return {
      status: "blocked",
      label: "Blocked: treatment controlled",
      explanation:
        "Conditioning on the treatment (Education) removes its variation — no effect can be estimated.",
      detail: "Always keep your treatment free to vary when estimating its effect.",
      color: "#94a3b8",
    };
  }
  if (hasJobQual) {
    return {
      status: "partial",
      label: "Direct effect only: mediator controlled",
      explanation:
        "By controlling for Job Quality (the mediator), you block the indirect path Education → Job Quality → Income. What remains is only the direct effect of Education on Income.",
      detail:
        "This is valid if you explicitly want to estimate the direct effect. But if you want the total effect, do NOT control for the mediator.",
      color: "#d4af37",
    };
  }
  return {
    status: "unbiased",
    label: "Total effect: direct + indirect",
    explanation:
      "Without controlling for Job Quality, you capture the total causal effect of Education on Income — both the direct path and the indirect path through Job Quality.",
    detail:
      "To estimate the total effect, leave mediators uncontrolled. To decompose effects into direct and indirect, use mediation analysis.",
    color: "#10b981",
  };
}

function getColliderBias(controlled: Set<string>): BiasResult {
  const hasSuccess = controlled.has("success");
  const hasTalent  = controlled.has("talent");
  const hasEffort  = controlled.has("effort");

  if (hasTalent || hasEffort) {
    return {
      status: "blocked",
      label: "Blocked: cause controlled",
      explanation:
        "Conditioning on Talent or Effort removes their variation. There is nothing left to estimate.",
      detail: "Ensure you keep both causes free to vary when studying their independence.",
      color: "#94a3b8",
    };
  }
  if (hasSuccess) {
    return {
      status: "biased",
      label: "BIASED: collider conditioning!",
      explanation:
        "Conditioning on Success (the collider) OPENS a spurious, non-causal path between Talent and Effort: the red dashed link now drawn in the graph. They become negatively correlated even though they are causally independent.",
      detail:
        "This is the 'explain-away' effect: among successful people, if someone is very talented, they may have needed less effort (and vice versa). This is purely a statistical artifact of conditioning on their shared effect.",
      color: "#ef4444",
    };
  }
  return {
    status: "unbiased",
    label: "Unbiased: Talent ⊥ Effort",
    explanation:
      "In the general population, Talent and Effort are independent — knowing someone's talent tells you nothing about their effort level.",
    detail:
      "The path Talent → Success ← Effort is blocked because Success is a collider. Colliders block paths by default and only OPEN paths when conditioned upon.",
    color: "#10b981",
  };
}

// ── Scenario configs ──────────────────────────────────────────────────────────

interface ScenarioConfig {
  id: ScenarioId;
  title: string;
  subtitle: string;
  concept: string;
  conceptColor: string;
  dag: DAG;
  getBias: (controlled: Set<string>) => BiasResult;
  legend: Array<{ label: string; description: string; color: string }>;
  tip: string;
}

const SCENARIOS: Record<ScenarioId, ScenarioConfig> = {
  confounder: {
    id: "confounder",
    title: "The Ice Cream & Drowning Mystery",
    subtitle: "Confounding variable",
    concept: "Confounder",
    conceptColor: "#d4af37",
    dag: CONFOUNDER_DAG,
    getBias: getConfounderBias,
    legend: [
      { label: "Summer",         description: "Confounder — causes both treatment and outcome",  color: NODE_COLORS.confounder },
      { label: "Ice Cream Sales", description: "Treatment — the variable we (naively) study",    color: NODE_COLORS.treatment  },
      { label: "Drowning Deaths", description: "Outcome — what we are trying to explain",        color: NODE_COLORS.outcome    },
    ],
    tip: 'Try checking "Summer": the dashed spurious association between Ice Cream and Drowning disappears from the graph.',
  },
  mediator: {
    id: "mediator",
    title: "Education, Jobs & Income",
    subtitle: "Mediation pathway",
    concept: "Mediator",
    conceptColor: "#a855f7",
    dag: MEDIATOR_DAG,
    getBias: getMediatorBias,
    legend: [
      { label: "Education",   description: "Treatment — the cause we are studying",              color: NODE_COLORS.treatment },
      { label: "Job Quality", description: "Mediator — lies on the causal path",                 color: NODE_COLORS.mediator  },
      { label: "Income",      description: "Outcome — what education ultimately affects",        color: NODE_COLORS.outcome   },
    ],
    tip: 'Control for "Job Quality" to isolate the direct effect of education on income.',
  },
  collider: {
    id: "collider",
    title: "Talent, Effort & Success",
    subtitle: "Collider bias",
    concept: "Collider",
    conceptColor: "#ef4444",
    dag: COLLIDER_DAG,
    getBias: getColliderBias,
    legend: [
      { label: "Talent",  description: "Cause — independent upstream variable", color: NODE_COLORS.cause    },
      { label: "Effort",  description: "Cause — independent upstream variable", color: NODE_COLORS.cause    },
      { label: "Success", description: "Collider — caused by both talent and effort", color: NODE_COLORS.collider },
    ],
    tip: 'Try controlling for "Success" — watch how talent and effort become spuriously correlated!',
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

interface ScenarioSectionProps {
  scenarioId: ScenarioId;
}

export default function ScenarioSection({ scenarioId }: ScenarioSectionProps) {
  const [controlled, setControlled] = useState<Set<string>>(new Set());
  const scenario = SCENARIOS[scenarioId];

  // Reset controlled when scenario changes
  React.useEffect(() => {
    setControlled(new Set());
  }, [scenarioId]);

  const biasResult = useMemo(() => scenario.getBias(controlled), [scenario, controlled]);

  const nodeLabels = useMemo(
    () =>
      Object.fromEntries(scenario.dag.nodes.map((n) => [n.id, n.label])) as Record<string, string>,
    [scenario.dag.nodes]
  );

  return (
    <motion.div
      key={scenarioId}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: scenario.conceptColor + "22",
                color: scenario.conceptColor,
                border: `1px solid ${scenario.conceptColor}44`,
              }}
            >
              {scenario.concept}
            </span>
            <span className="text-[11px] text-[#64748b]">{scenario.subtitle}</span>
          </div>
          <h3 className="text-lg font-bold text-white">{scenario.title}</h3>
        </div>
      </div>

      {/* Main layout: DAG + controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DAG Canvas */}
        <div className="space-y-3">
          <div className="bg-[#0a0e1a] rounded-xl border border-[#1e293b] p-4">
            <DAGCanvas
              dag={scenario.dag}
              controlled={controlled}
              width={480}
              height={300}
            />
          </div>

          {/* Legend */}
          <div className="space-y-1.5">
            {scenario.legend.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs font-semibold text-white">{item.label}</span>
                <span className="text-[10px] text-[#64748b]">— {item.description}</span>
              </div>
            ))}
          </div>

          {/* Tip */}
          <div className="flex items-start gap-2 bg-[#1e293b]/50 rounded-lg px-3 py-2 border border-[#334155]/50">
            <span className="text-[#d4af37] text-sm shrink-0 mt-0.5">💡</span>
            <p className="text-[11px] text-[#94a3b8] italic">{scenario.tip}</p>
          </div>
        </div>

        {/* Right column: Control Panel + Bias Analyzer */}
        <div className="space-y-4">
          <ControlPanel
            nodes={scenario.dag.nodes}
            controlled={controlled}
            onChange={setControlled}
          />
          <BiasAnalyzer
            result={biasResult}
            controlled={controlled}
            nodeLabels={nodeLabels}
          />
        </div>
      </div>
    </motion.div>
  );
}
