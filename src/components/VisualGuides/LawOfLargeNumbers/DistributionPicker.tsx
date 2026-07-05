"use client";

import React from "react";
import { motion } from "framer-motion";
import { GUIDE_EASE } from "@/lib/guideMotion";
import { DIST_IDS, DIST_META, type DistId } from "./types";

interface Props {
  active: DistId;
  explored: Set<DistId>;
  onChange: (d: DistId) => void;
}

function DistributionPickerInner({ active, explored, onChange }: Props) {
  return (
    <div
      className="inline-flex flex-wrap rounded-xl border border-[#1e293b] bg-[#0f172a] p-1 gap-1"
      role="radiogroup"
      aria-label="Distribution to sample from"
    >
      {DIST_IDS.map((id) => {
        const meta = DIST_META[id];
        const isActive = active === id;
        return (
          <button
            key={id}
            role="radio"
            aria-checked={isActive}
            aria-label={`${meta.label} distribution`}
            onClick={() => onChange(id)}
            className={`relative px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] ${
              isActive ? "text-[#0a0e1a]" : "text-[#94a3b8] hover:text-white"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="lln-dist-pill"
                className="absolute inset-0 rounded-lg"
                style={{ background: meta.color }}
                transition={{ duration: 0.3, ease: GUIDE_EASE }}
              />
            )}
            <span className="relative z-10">
              {meta.label}
              {explored.has(id) && !isActive && (
                <span className="ml-1.5 text-[9px] align-middle" style={{ color: "var(--color-success)" }}>
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

const DistributionPicker = React.memo(DistributionPickerInner);
export default DistributionPicker;
