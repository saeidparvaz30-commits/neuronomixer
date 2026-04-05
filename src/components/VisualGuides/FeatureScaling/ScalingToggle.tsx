"use client";

import React from "react";
import { motion } from "framer-motion";
import { ScalingMethod, METHOD_META } from "./types";

const METHODS: ScalingMethod[] = ["raw", "normalized", "meannorm", "standardized"];

type Props = { active: ScalingMethod; onChange: (m: ScalingMethod) => void };

function ScalingToggleInner({ active, onChange }: Props) {
  return (
    <div className="inline-flex rounded-xl border border-[#1e293b] bg-[#0f172a] p-1 gap-1" role="radiogroup" aria-label="Feature scaling method">
      {METHODS.map((m) => {
        const meta      = METHOD_META[m];
        const isActive  = active === m;
        return (
          <button
            key={m}
            role="radio"
            aria-checked={isActive}
            aria-label={`${meta.label} scaling`}
            onClick={() => onChange(m)}
            className={`relative px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] ${
              isActive ? "text-[#0a0e1a]" : "text-[#94a3b8] hover:text-white"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="scaling-pill"
                className="absolute inset-0 rounded-lg"
                style={{ background: meta.color }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10">{meta.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const ScalingToggle = React.memo(ScalingToggleInner);
export default ScalingToggle;
