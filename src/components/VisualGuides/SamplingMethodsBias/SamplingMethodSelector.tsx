"use client";

import React from "react";
import { SamplingMethod } from "./types";

interface MethodOption {
  method: SamplingMethod;
  label: string;
  description: string;
  badge?: string;
}

const METHODS: MethodOption[] = [
  {
    method: "random",
    label: "Random Sampling",
    description: "Draw n units uniformly at random from the entire population.",
  },
  {
    method: "stratified",
    label: "Stratified Sampling",
    description: "Sample proportionally from each group (A and B) to preserve group structure.",
  },
  {
    method: "cluster",
    label: "Cluster Sampling",
    description: "Select whole clusters of units (rows of the scatter plot).",
  },
  {
    method: "systematic",
    label: "Systematic Sampling",
    description: "Pick every k-th unit after a random start.",
  },
  {
    method: "convenience",
    label: "Convenience Sampling",
    description: "Only easily-accessible units — only Group B is sampled.",
    badge: "Biased!",
  },
];

interface Props {
  selected: SamplingMethod;
  onChange: (m: SamplingMethod) => void;
}

export default function SamplingMethodSelector({ selected, onChange }: Props) {
  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">
        Sampling Method
      </p>
      <div className="space-y-2">
        {METHODS.map(({ method, label, description, badge }) => {
          const isActive = selected === method;
          return (
            <label
              key={method}
              className="flex items-start gap-3 cursor-pointer rounded-xl p-3 border transition-all"
              style={{
                borderColor: isActive ? "#d4af37" : "#1e293b",
                borderLeftWidth: isActive ? "3px" : "1px",
                background: isActive ? "rgba(212,175,55,0.06)" : "transparent",
              }}
              onClick={() => onChange(method)}
            >
              {/* Radio circle */}
              <span className="mt-0.5 flex-shrink-0 relative w-4 h-4">
                <span
                  className="absolute inset-0 rounded-full border-2 transition-colors"
                  style={{
                    borderColor: isActive ? "#d4af37" : "#334155",
                  }}
                />
                {isActive && (
                  <span
                    className="absolute inset-[3px] rounded-full"
                    style={{ background: "#d4af37" }}
                  />
                )}
                <input
                  type="radio"
                  name="samplingMethod"
                  value={method}
                  checked={isActive}
                  onChange={() => onChange(method)}
                  className="sr-only"
                />
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className="text-[13px] font-semibold transition-colors"
                    style={{ color: isActive ? "#f1f5f9" : "#94a3b8" }}
                  >
                    {label}
                  </span>
                  {badge && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30">
                      {badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#475569] leading-snug">{description}</p>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
