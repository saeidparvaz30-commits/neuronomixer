"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Activation,
  ACTIVATION_META,
  MIN_DEPTH,
  MAX_DEPTH,
  MIN_SCALE,
  MAX_SCALE,
} from "./types";

const ACTIVATIONS: Activation[] = ["sigmoid", "tanh", "relu"];

interface Props {
  depth: number;
  activation: Activation;
  weightScale: number;
  onDepthChange: (d: number) => void;
  onActivationChange: (a: Activation) => void;
  onScaleChange: (s: number) => void;
}

function ControlsPanelInner({
  depth,
  activation,
  weightScale,
  onDepthChange,
  onActivationChange,
  onScaleChange,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* Depth slider */}
      <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4">
        <label
          htmlFor="veg-depth"
          className="block text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8] mb-2"
        >
          Network depth:{" "}
          <span className="text-white font-mono">{depth} layers</span>
        </label>
        <input
          id="veg-depth"
          type="range"
          min={MIN_DEPTH}
          max={MAX_DEPTH}
          step={1}
          value={depth}
          onChange={(e) => onDepthChange(Number(e.target.value))}
          className="w-full"
          style={{ accentColor: "var(--color-accent)" }}
        />
        <div className="flex justify-between text-[10px] text-[#475569] mt-1">
          <span>{MIN_DEPTH}</span>
          <span>{MAX_DEPTH}</span>
        </div>
        <p className="text-[11px] text-[#475569] leading-relaxed mt-2">
          Each extra layer multiplies one more factor into the gradient product.
        </p>
      </div>

      {/* Activation radiogroup */}
      <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4">
        <p
          id="veg-activation-label"
          className="text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8] mb-2"
        >
          Activation function
        </p>
        <div
          role="radiogroup"
          aria-labelledby="veg-activation-label"
          className="inline-flex rounded-xl border border-[#1e293b] bg-[#162032] p-1 gap-1"
        >
          {ACTIVATIONS.map((a) => {
            const meta = ACTIVATION_META[a];
            const isActive = activation === a;
            return (
              <button
                key={a}
                role="radio"
                aria-checked={isActive}
                onClick={() => onActivationChange(a)}
                className={`relative px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                  isActive ? "text-[#0a0e1a]" : "text-[#94a3b8] hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="veg-activation-pill"
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
        <p className="text-[11px] text-[#475569] leading-relaxed mt-3">
          {ACTIVATION_META[activation].derivativeNote}
        </p>
      </div>

      {/* Weight scale slider */}
      <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4">
        <label
          htmlFor="veg-scale"
          className="block text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8] mb-2"
        >
          Weight scale:{" "}
          <span className="text-white font-mono">{weightScale.toFixed(2)}x</span>
        </label>
        <input
          id="veg-scale"
          type="range"
          min={MIN_SCALE}
          max={MAX_SCALE}
          step={0.05}
          value={weightScale}
          onChange={(e) => onScaleChange(Number(e.target.value))}
          className="w-full"
          style={{ accentColor: "var(--color-accent)" }}
        />
        <div className="flex justify-between text-[10px] text-[#475569] mt-1">
          <span>{MIN_SCALE.toFixed(1)}x</span>
          <span>{MAX_SCALE.toFixed(1)}x</span>
        </div>
        <p className="text-[11px] text-[#475569] leading-relaxed mt-2">
          Multiplies every seeded weight. Near 1.0 keeps each backward factor
          close to 1, which is exactly what He and Xavier initialization aim for.
        </p>
      </div>
    </div>
  );
}

const ControlsPanel = React.memo(ControlsPanelInner);
export default ControlsPanel;
