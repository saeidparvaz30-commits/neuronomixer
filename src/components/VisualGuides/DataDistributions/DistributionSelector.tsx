"use client";

import React from "react";
import { DistributionType, DIST_LABELS } from "./types";

const DIST_ORDER: DistributionType[] = ["normal", "uniform", "exponential", "poisson"];

const DIST_COLORS: Record<DistributionType, string> = {
  normal:      "#3bb4a4",
  uniform:     "var(--color-accent)",
  exponential: "#f97316",
  poisson:     "#a855f7",
};

interface Props {
  current: DistributionType;
  onChange: (d: DistributionType) => void;
  label?: string;
}

export default function DistributionSelector({ current, onChange, label }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#475569]">{label}</span>
      )}
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label ?? "Distribution"}>
        {DIST_ORDER.map(d => {
          const active = d === current;
          const color = DIST_COLORS[d];
          return (
            <button
              key={d}
              role="radio"
              aria-checked={active}
              onClick={() => onChange(d)}
              className="px-3.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-all"
              style={{
                borderColor: active ? color : "#1e293b",
                color:       active ? color : "#475569",
                background:  active ? `color-mix(in srgb, ${color} 9%, transparent)` : "transparent",
              }}
            >
              {DIST_LABELS[d]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { DIST_COLORS };
