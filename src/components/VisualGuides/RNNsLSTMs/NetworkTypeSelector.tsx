"use client";

import { motion } from "framer-motion";
import type { NetworkType } from "./types";

interface Props {
  selected: NetworkType;
  onSelect: (t: NetworkType) => void;
}

const OPTIONS: Array<{
  id: NetworkType;
  label: string;
  tagline: string;
  color: string;
  border: string;
  bg: string;
  formula: string;
}> = [
  {
    id: "rnn",
    label: "RNN",
    tagline: "Simple, fast, but forgets",
    color: "#1e5d8a",
    border: "#1e5d8a",
    bg: "#1e5d8a20",
    formula: "hₜ = tanh(Wₓxₜ + Wₕhₜ₋₁ + b)",
  },
  {
    id: "lstm",
    label: "LSTM",
    tagline: "Gates control memory",
    color: "#a855f7",
    border: "#a855f7",
    bg: "#a855f720",
    formula: "C = f⊙C + i⊙C̃,  h = o⊙tanh(C)",
  },
];

export default function NetworkTypeSelector({ selected, onSelect }: Props) {
  const active = OPTIONS.find((o) => o.id === selected)!;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3 flex-wrap" role="radiogroup" aria-label="Network architecture">
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              role="radio"
              aria-checked={isSelected}
              className="relative flex-1 min-w-[140px] px-5 py-4 rounded-xl border-2 text-left transition-all"
              style={{
                borderColor: isSelected ? opt.border : "#334155",
                background: isSelected ? opt.bg : "transparent",
              }}
            >
              {isSelected && (
                <motion.div
                  layoutId="network-type-bg"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: opt.bg }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <div className="relative z-10">
                <span
                  className="text-lg font-black tracking-tight"
                  style={{ color: isSelected ? opt.color : "#94a3b8" }}
                >
                  {opt.label}
                </span>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: isSelected ? opt.color : "#475569" }}
                >
                  {opt.tagline}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Formula */}
      <div
        className="rounded-lg px-4 py-3 border"
        style={{ borderColor: `${active.color}40`, background: `${active.color}10` }}
      >
        <p className="text-[11px] uppercase tracking-wider font-semibold mb-1" style={{ color: active.color }}>
          Core Formula
        </p>
        <code
          className="text-sm font-mono font-bold"
          style={{ color: "var(--color-accent)" }}
        >
          {active.formula}
        </code>
      </div>
    </div>
  );
}
