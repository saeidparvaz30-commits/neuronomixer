"use client";

import { motion } from "framer-motion";

interface ModeToggleProps {
  value: "training" | "inference";
  onChange: (v: "training" | "inference") => void;
}

const MODES = [
  {
    id: "training" as const,
    label: "Training Mode",
    color: "#a855f7",
    desc: "Neurons randomly dropped each forward pass — forces robust representations",
  },
  {
    id: "inference" as const,
    label: "Inference Mode",
    color: "#3bb4a4",
    desc: "All neurons active — weights implicitly scaled by (1 − p) to match expected output",
  },
];

export default function ModeToggle({ value, onChange }: ModeToggleProps) {
  const active = MODES.find((m) => m.id === value)!;

  return (
    <div className="flex flex-col gap-3">
      {/* Toggle buttons */}
      <div className="relative flex bg-[#0f172a] border border-white/[0.07] rounded-xl p-1 w-fit">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onChange(mode.id)}
            className="relative z-10 px-4 py-2 text-sm font-semibold rounded-lg transition-colors"
            style={{ color: value === mode.id ? "white" : "#94a3b8" }}
          >
            {value === mode.id && (
              <motion.div
                layoutId="mode-bg"
                className="absolute inset-0 rounded-lg"
                style={{ background: mode.color }}
                transition={{ type: "spring", bounce: 0.25, duration: 0.4 }}
              />
            )}
            <span className="relative z-10">{mode.label}</span>
          </button>
        ))}
      </div>

      {/* Description */}
      <p className="text-sm text-[#94a3b8] leading-relaxed">
        <span className="font-semibold" style={{ color: active.color }}>
          {active.label}:{" "}
        </span>
        {active.desc}
      </p>
    </div>
  );
}
