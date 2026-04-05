"use client";

import React, { useState } from "react";
import type { OptimizerConfig, OptimizerType } from "./types";

const FORMULAS: Record<OptimizerType, { formula: string; desc: string }> = {
  sgd: {
    formula: "w = w − α·∇L",
    desc: "Pure gradient step. Simple but sensitive to learning rate and can oscillate on elongated loss surfaces.",
  },
  momentum: {
    formula: "v = β·v + ∇L; w = w − α·v",
    desc: "Accumulates velocity to smooth oscillations and accelerate along consistent directions. β=0.9.",
  },
  rmsprop: {
    formula: "w = w − α·∇L / √(E[g²] + ε)",
    desc: "Adapts per-parameter lr by dividing by a running RMS of recent gradients. Great for non-stationary problems.",
  },
  adam: {
    formula: "w = w − α·m̂ / (√v̂ + ε)",
    desc: "Combines momentum (m̂) and RMSProp (v̂) with bias correction. Usually converges fastest.",
  },
};

interface Props {
  configs: OptimizerConfig[];
  onToggle: (id: OptimizerType) => void;
}

export default function OptimizerToggle({ configs, onToggle }: Props) {
  const [selected, setSelected] = useState<OptimizerType | null>(null);

  function handleSelect(id: OptimizerType) {
    setSelected(selected === id ? null : id);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {configs.map((cfg) => (
          <div key={cfg.id} className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              {/* Toggle on/off */}
              <button
                onClick={() => onToggle(cfg.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                  cfg.enabled
                    ? "border-white/20 bg-[#1e293b]/80 text-white"
                    : "border-white/[0.06] bg-transparent text-[#475569] opacity-60"
                }`}
                title={cfg.enabled ? "Click to hide" : "Click to show"}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0 transition-opacity"
                  style={{ backgroundColor: cfg.color, opacity: cfg.enabled ? 1 : 0.3 }}
                />
                <span>{cfg.label}</span>
              </button>
              {/* Info button */}
              <button
                onClick={() => handleSelect(cfg.id)}
                className={`w-6 h-6 rounded-full border text-[10px] font-bold transition-all flex items-center justify-center ${
                  selected === cfg.id
                    ? "border-white/30 bg-white/10 text-white"
                    : "border-white/10 text-[#475569] hover:border-white/20 hover:text-[#94a3b8]"
                }`}
                title="Show formula"
              >
                i
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Formula panel */}
      {selected && (() => {
        const cfg = configs.find((c) => c.id === selected);
        const info = FORMULAS[selected];
        if (!cfg || !info) return null;
        return (
          <div
            className="rounded-xl border p-3 text-sm"
            style={{ borderColor: `${cfg.color}40`, background: `${cfg.color}0d` }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: cfg.color }}
              />
              <span className="font-semibold text-white text-[13px]">{cfg.label}</span>
            </div>
            <code
              className="block font-mono text-[13px] mb-2 px-2 py-1 rounded"
              style={{ color: cfg.color, background: "rgba(0,0,0,0.3)" }}
            >
              {info.formula}
            </code>
            <p className="text-[11px] text-[#94a3b8] leading-relaxed">{info.desc}</p>
          </div>
        );
      })()}
    </div>
  );
}
