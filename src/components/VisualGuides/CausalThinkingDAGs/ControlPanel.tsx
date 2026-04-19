"use client";

import React from "react";
import { DAGNode } from "./types";

interface ControlPanelProps {
  nodes: DAGNode[];
  controlled: Set<string>;
  onChange: (controlled: Set<string>) => void;
}

const ROLE_LABELS: Record<DAGNode["role"], string> = {
  treatment:  "Treatment",
  outcome:    "Outcome",
  confounder: "Confounder",
  mediator:   "Mediator",
  collider:   "Collider",
  cause:      "Cause",
};

const ROLE_TIPS: Record<DAGNode["role"], string> = {
  treatment:  "The variable whose causal effect we want to estimate.",
  outcome:    "The result we are trying to explain.",
  confounder: "Causes both treatment and outcome — must be controlled.",
  mediator:   "Lies on the causal path — controlling it blocks the indirect effect.",
  collider:   "Is caused by two other variables — controlling it OPENS a spurious path!",
  cause:      "An upstream cause of another variable.",
};

export default function ControlPanel({ nodes, controlled, onChange }: ControlPanelProps) {
  function toggle(id: string) {
    const next = new Set(controlled);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-[#94a3b8] uppercase tracking-wider font-semibold mb-2">
        Control for variable
      </p>
      {nodes.map((node) => {
        const isChecked = controlled.has(node.id);
        return (
          <label
            key={node.id}
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none ${
              isChecked
                ? "border-[#3bb4a4]/50 bg-[#3bb4a4]/5"
                : "border-[#1e293b] bg-[#0f172a] hover:border-[#334155]"
            }`}
          >
            {/* Checkbox */}
            <div className="mt-0.5 shrink-0">
              <div
                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                  isChecked
                    ? "bg-[#3bb4a4] border-[#3bb4a4]"
                    : "bg-transparent border-[#334155]"
                }`}
              >
                {isChecked && (
                  <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M1.5 5L4 7.5L8.5 2.5"
                      stroke="#0f172a"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            </div>
            <input
              type="checkbox"
              className="sr-only"
              checked={isChecked}
              onChange={() => toggle(node.id)}
            />

            {/* Label info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                {/* Color dot */}
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: node.color }}
                />
                <span className="text-sm font-semibold text-white truncate">{node.label}</span>
                <span
                  className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: node.color + "22",
                    color: node.color,
                    border: `1px solid ${node.color}44`,
                  }}
                >
                  {ROLE_LABELS[node.role]}
                </span>
              </div>
              <p className="text-[10px] text-[#64748b] leading-relaxed">
                {ROLE_TIPS[node.role]}
              </p>
            </div>
          </label>
        );
      })}

      {controlled.size > 0 && (
        <button
          onClick={() => onChange(new Set())}
          className="w-full mt-1 text-[11px] text-[#94a3b8] hover:text-white border border-[#1e293b] hover:border-[#334155] rounded-lg py-1.5 transition-colors"
        >
          Clear all controls
        </button>
      )}
    </div>
  );
}
