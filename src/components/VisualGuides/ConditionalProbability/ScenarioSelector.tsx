"use client";

import React from "react";
import { motion } from "framer-motion";
import type { ScenarioType } from "./types";

interface ScenarioOption {
  id: ScenarioType;
  label: string;
  icon: string;
  description: string;
}

const OPTIONS: ScenarioOption[] = [
  {
    id: "medical_testing",
    label: "Medical Testing",
    icon: "⚕",
    description: "Disease prevalence and test accuracy",
  },
  {
    id: "marbles",
    label: "Marble Draw",
    icon: "○",
    description: "Drawing without replacement",
  },
  {
    id: "manufacturing",
    label: "Manufacturing Defects",
    icon: "◈",
    description: "Two factories, different defect rates",
  },
];

interface ScenarioSelectorProps {
  current: ScenarioType;
  visited: Set<ScenarioType>;
  onChange: (id: ScenarioType) => void;
}

export default function ScenarioSelector({
  current,
  visited,
  onChange,
}: ScenarioSelectorProps) {
  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-3">
        Choose a Scenario
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Choose a scenario">
        {OPTIONS.map((opt) => {
          const isActive = current === opt.id;
          const wasVisited = visited.has(opt.id);
          return (
            <button
              key={opt.id}
              role="radio"
              aria-checked={isActive}
              onClick={() => onChange(opt.id)}
              className={`relative text-left p-3 rounded-xl border transition-all ${
                isActive
                  ? "border-[var(--color-accent)]/60 bg-[var(--color-accent)]/8"
                  : "border-[#1e293b] hover:border-[#334155] hover:bg-[#1e293b]/40"
              }`}
            >
              {wasVisited && !isActive && (
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#3bb4a4]" />
              )}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base leading-none" aria-hidden="true">
                  {opt.icon}
                </span>
                <span
                  className={`text-[13px] font-semibold transition-colors ${
                    isActive ? "text-[var(--color-accent)]" : "text-white"
                  }`}
                >
                  {opt.label}
                </span>
              </div>
              <p className="text-[11px] text-[#94a3b8] leading-tight">
                {opt.description}
              </p>
              {isActive && (
                <motion.div
                  layoutId="scenario-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-accent)] rounded-b-xl"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
