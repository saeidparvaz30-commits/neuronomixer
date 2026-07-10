"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  GuardrailConfig,
  LayerId,
  LAYER_IDS,
  LAYER_META,
  CATEGORY_ACCENT,
} from "./corpus";

type Props = {
  config: GuardrailConfig;
  onToggle: (id: LayerId) => void;
  onThreshold: (which: "inputThreshold" | "policyThreshold", value: number) => void;
};

export default function LayerControls({ config, onToggle, onThreshold }: Props) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      role="group"
      aria-label="Guardrail layers"
    >
      {LAYER_IDS.map((id) => {
        const meta = LAYER_META[id];
        const on = config[id];
        const thresholdKey =
          id === "inputFilter" ? "inputThreshold" : id === "systemPolicy" ? "policyThreshold" : null;
        const thresholdValue =
          id === "inputFilter" ? config.inputThreshold : config.policyThreshold;
        return (
          <div
            key={id}
            className="rounded-xl border p-4 transition-colors"
            style={{
              borderColor: on ? CATEGORY_ACCENT : "#1e293b",
              background: on ? "rgba(236,72,153,0.05)" : "#0f172a",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-white">{meta.label}</p>
                <p className="text-[10px] uppercase tracking-wide text-[#475569] mt-0.5">
                  {meta.kind}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`${meta.label}: ${on ? "on" : "off"}`}
                onClick={() => onToggle(id)}
                className="relative shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a]"
                style={{
                  background: on ? CATEGORY_ACCENT : "#334155",
                  "--tw-ring-color": CATEGORY_ACCENT,
                } as React.CSSProperties}
              >
                <motion.span
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 32 }}
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white"
                  style={{ left: on ? "22px" : "2px" }}
                />
              </button>
            </div>

            <p className="text-[11px] text-[#94a3b8] leading-relaxed mt-2">{meta.blurb}</p>

            {thresholdKey && (
              <div className="mt-3" aria-hidden={!on}>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor={`thr-${id}`}
                    className="text-[10px] uppercase tracking-wide text-[#475569]"
                  >
                    Block threshold
                  </label>
                  <span className="text-[11px] font-mono text-white">{thresholdValue}</span>
                </div>
                <input
                  id={`thr-${id}`}
                  type="range"
                  min={1}
                  max={3}
                  step={1}
                  value={thresholdValue}
                  disabled={!on}
                  onChange={(e) => onThreshold(thresholdKey, Number(e.target.value))}
                  aria-label={`${meta.label} block threshold`}
                  className="w-full accent-[#ec4899] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                />
                <p className="text-[10px] text-[#475569] mt-1">
                  Lower catches more but over-blocks. Higher is stricter about evidence.
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
