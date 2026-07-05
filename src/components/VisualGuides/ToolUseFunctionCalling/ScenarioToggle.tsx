"use client";

import React from "react";
import { motion } from "framer-motion";
import type { ScenarioId, Scenario } from "./types";

interface Props {
  scenarios: Scenario[];
  active: ScenarioId;
  onChange: (id: ScenarioId) => void;
}

function ScenarioToggleInner({ scenarios, active, onChange }: Props) {
  return (
    <div
      className="inline-flex flex-wrap rounded-xl border border-[#1e293b] bg-[#0f172a] p-1 gap-1"
      role="radiogroup"
      aria-label="Trace scenario"
    >
      {scenarios.map((s) => {
        const isActive = active === s.id;
        return (
          <button
            key={s.id}
            role="radio"
            aria-checked={isActive}
            aria-label={`${s.label} scenario`}
            onClick={() => onChange(s.id)}
            className={`relative px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] ${
              isActive ? "text-[#0a0e1a]" : "text-[#94a3b8] hover:text-white"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="tool-use-scenario-pill"
                className="absolute inset-0 rounded-lg"
                style={{ background: s.color }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10">{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const ScenarioToggle = React.memo(ScenarioToggleInner);
export default ScenarioToggle;
