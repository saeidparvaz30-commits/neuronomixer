"use client";

import React from "react";
import { motion } from "framer-motion";
import { DEFENSES, DefenseId } from "./types";

type Props = {
  active: DefenseId;
  completedRuns: ReadonlySet<DefenseId>;
  onChange: (d: DefenseId) => void;
};

function DefenseToggleInner({ active, completedRuns, onChange }: Props) {
  return (
    <div
      className="inline-flex flex-wrap rounded-xl border border-[#1e293b] bg-[#0f172a] p-1 gap-1"
      role="radiogroup"
      aria-label="Defense configuration for the simulated scenario"
    >
      {DEFENSES.map((d) => {
        const isActive = active === d.id;
        const done = completedRuns.has(d.id);
        return (
          <button
            key={d.id}
            role="radio"
            aria-checked={isActive}
            aria-label={`${d.label} defense configuration${done ? ", scenario already replayed" : ""}`}
            onClick={() => onChange(d.id)}
            className={`relative px-4 py-2 rounded-lg text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] ${
              isActive ? "text-[#0a0e1a]" : "text-[#94a3b8] hover:text-white"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="prompt-injection-defense-pill"
                className="absolute inset-0 rounded-lg bg-[var(--color-accent)]"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10">
              {d.label}
              {done && (
                <span className={`ml-1.5 text-[10px] ${isActive ? "text-[#0a0e1a]" : "text-[var(--color-success)]"}`} aria-hidden="true">
                  ✓
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const DefenseToggle = React.memo(DefenseToggleInner);
export default DefenseToggle;
