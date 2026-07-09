"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Constraints,
  ConstraintKey,
  LatencyCeiling,
  BUDGET_STEPS,
  CONTEXT_STEPS,
  budgetLabel,
  contextLabel,
} from "./types";

type Props = {
  constraints: Constraints;
  touched: ReadonlySet<ConstraintKey>;
  onChange: (key: ConstraintKey, patch: Partial<Constraints>) => void;
};

const LATENCY_OPTIONS: { value: LatencyCeiling; label: string }[] = [
  { value: "any", label: "Any latency" },
  { value: "medium", label: "Medium or faster" },
  { value: "fast", label: "Fast only" },
];

const HOSTING_OPTIONS: { value: boolean; label: string }[] = [
  { value: false, label: "Any hosting" },
  { value: true, label: "Open weights only" },
];

function TouchedDot({ on }: { on: boolean }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full ml-1.5 align-middle"
      style={{ background: on ? "var(--color-accent)" : "#1e293b" }}
      aria-hidden="true"
    />
  );
}

export default function ConstraintPanel({ constraints, touched, onChange }: Props) {
  return (
    <div className="flex flex-col gap-5">
      {/* Quality floor */}
      <div>
        <label
          htmlFor="md-quality"
          className="block text-[12px] font-semibold text-white mb-1.5"
        >
          Quality floor: capability index at least{" "}
          <span className="font-mono text-[var(--color-accent)]">
            {constraints.qualityFloor}
          </span>
          <TouchedDot on={touched.has("quality")} />
        </label>
        <input
          id="md-quality"
          type="range"
          min={0}
          max={100}
          step={5}
          value={constraints.qualityFloor}
          onChange={(e) =>
            onChange("quality", { qualityFloor: Number(e.target.value) })
          }
          className="w-full accent-[#d4af37]"
        />
        <p className="text-[11px] text-[#475569] mt-1">
          The minimum capability your task can tolerate. Raising it kills the cheap end.
        </p>
      </div>

      {/* Budget ceiling */}
      <div>
        <label
          htmlFor="md-budget"
          className="block text-[12px] font-semibold text-white mb-1.5"
        >
          Budget ceiling:{" "}
          <span className="font-mono text-[var(--color-accent)]">
            {budgetLabel(constraints.budgetIdx)}
          </span>{" "}
          blended
          <TouchedDot on={touched.has("budget")} />
        </label>
        <input
          id="md-budget"
          type="range"
          min={0}
          max={BUDGET_STEPS.length - 1}
          step={1}
          value={constraints.budgetIdx}
          onChange={(e) => onChange("budget", { budgetIdx: Number(e.target.value) })}
          className="w-full accent-[#d4af37]"
        />
        <p className="text-[11px] text-[#475569] mt-1">
          Max blended price per million tokens (3:1 input:output mix). Lowering it kills
          the frontier end.
        </p>
      </div>

      {/* Latency ceiling */}
      <div>
        <p className="text-[12px] font-semibold text-white mb-1.5">
          Latency ceiling
          <TouchedDot on={touched.has("latency")} />
        </p>
        <div
          className="inline-flex flex-wrap rounded-xl border border-[#1e293b] bg-[#0f172a] p-1 gap-1"
          role="radiogroup"
          aria-label="Latency ceiling"
        >
          {LATENCY_OPTIONS.map((opt) => {
            const isActive = constraints.latencyCeiling === opt.value;
            return (
              <button
                key={opt.value}
                role="radio"
                aria-checked={isActive}
                onClick={() => onChange("latency", { latencyCeiling: opt.value })}
                className={`relative px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                  isActive ? "text-[#0a0e1a]" : "text-[#94a3b8] hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="md-latency-pill"
                    className="absolute inset-0 rounded-lg"
                    style={{ background: "var(--color-accent)" }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">{opt.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-[#475569] mt-1.5">
          Interactive UIs usually need medium or faster; batch jobs tolerate slow.
        </p>
      </div>

      {/* Context floor */}
      <div>
        <label
          htmlFor="md-context"
          className="block text-[12px] font-semibold text-white mb-1.5"
        >
          Context window at least{" "}
          <span className="font-mono text-[var(--color-accent)]">
            {contextLabel(CONTEXT_STEPS[constraints.contextIdx])}
          </span>{" "}
          tokens
          <TouchedDot on={touched.has("context")} />
        </label>
        <input
          id="md-context"
          type="range"
          min={0}
          max={CONTEXT_STEPS.length - 1}
          step={1}
          value={constraints.contextIdx}
          onChange={(e) => onChange("context", { contextIdx: Number(e.target.value) })}
          className="w-full accent-[#d4af37]"
        />
        <p className="text-[11px] text-[#475569] mt-1">
          How much you must fit in one request: long documents and big codebases push
          this up.
        </p>
      </div>

      {/* Hosting */}
      <div>
        <p className="text-[12px] font-semibold text-white mb-1.5">
          Privacy / hosting
          <TouchedDot on={touched.has("hosting")} />
        </p>
        <div
          className="inline-flex flex-wrap rounded-xl border border-[#1e293b] bg-[#0f172a] p-1 gap-1"
          role="radiogroup"
          aria-label="Privacy and hosting requirement"
        >
          {HOSTING_OPTIONS.map((opt) => {
            const isActive = constraints.openOnly === opt.value;
            return (
              <button
                key={opt.label}
                role="radio"
                aria-checked={isActive}
                onClick={() => onChange("hosting", { openOnly: opt.value })}
                className={`relative px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                  isActive ? "text-[#0a0e1a]" : "text-[#94a3b8] hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="md-hosting-pill"
                    className="absolute inset-0 rounded-lg"
                    style={{ background: "var(--color-accent)" }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">{opt.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-[#475569] mt-1.5">
          Open weights means you can run it on your own hardware, so data never leaves
          your infrastructure.
        </p>
      </div>
    </div>
  );
}
