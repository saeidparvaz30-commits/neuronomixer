"use client";

import React from "react";
import { motion } from "framer-motion";

export interface ToggleOption<T extends string> {
  id: T;
  label: string;
  color: string; // CSS color, e.g. "var(--color-warning)"
}

interface Props<T extends string> {
  options: ToggleOption<T>[];
  active: T;
  onChange: (id: T) => void;
  /** Unique per toggle instance so the framer-motion pill never jumps between toggles. */
  layoutId: string;
  ariaLabel: string;
}

export default function PipelineToggle<T extends string>({
  options,
  active,
  onChange,
  layoutId,
  ariaLabel,
}: Props<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex flex-wrap rounded-xl border border-[#1e293b] bg-[#0f172a] p-1 gap-1"
    >
      {options.map((o) => {
        const isActive = o.id === active;
        return (
          <button
            key={o.id}
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(o.id)}
            className={`relative px-4 py-2 rounded-lg text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
              isActive ? "text-[#0a0e1a]" : "text-[#94a3b8] hover:text-white"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 rounded-lg"
                style={{ background: o.color }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
