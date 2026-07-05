"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ScenarioType } from "./types";
import { SCENARIO_CONFIGS } from "./types";

interface BayesianAnimationProps {
  baseRate: number;
  sensitivity: number;
  specificity: number;
  scenario: ScenarioType;
  animationStep: 1 | 2 | 3;
  onStepComplete: (step: 1 | 2 | 3) => void;
}

function fmt(n: number): string {
  if (n >= 1000) return n.toLocaleString();
  return n.toString();
}

export default function BayesianAnimation({
  baseRate,
  sensitivity,
  specificity,
  scenario,
  animationStep,
  onStepComplete,
}: BayesianAnimationProps) {
  const sc = SCENARIO_CONFIGS[scenario];
  const w = sc.wording;
  const N = 100_000;
  const withDisease = Math.round(N * baseRate);
  const withoutDisease = N - withDisease;
  const tp = Math.round(withDisease * sensitivity);
  const fn = withDisease - tp;
  const fp = Math.round(withoutDisease * (1 - specificity));
  const tn = withoutDisease - fp;
  const posterior = tp + fp > 0 ? tp / (tp + fp) : 0;

  // Proportional widths (percent)
  const diseaseW = Math.max(0.5, (withDisease / N) * 100);
  const healthyW = 100 - diseaseW;

  // Heights within each column (percent)
  const tpH = withDisease > 0 ? (tp / withDisease) * 100 : 0;
  const fpH = withoutDisease > 0 ? (fp / withoutDisease) * 100 : 0;

  const [visibleStep, setVisibleStep] = useState<1 | 2 | 3>(1);

  // Sync visibleStep with animationStep (driven by parent)
  useEffect(() => {
    setVisibleStep(animationStep);
  }, [animationStep]);

  const stepLabels = ["Step 1: Prior", "Step 2: Apply Likelihood", "Step 3: Among Positives"];

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6 space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-1">
          Bayesian Visualization
        </p>
        <h2 className="text-[15px] font-bold text-white">
          Walk through the math step by step
        </h2>
      </div>

      {/* Step selector tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {([1, 2, 3] as const).map((s) => (
          <button
            key={s}
            onClick={() => {
              setVisibleStep(s);
              onStepComplete(s);
            }}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all"
            style={{
              borderColor: visibleStep === s ? "#d4af37" : "#1e293b",
              color: visibleStep === s ? "#d4af37" : "#475569",
              background: visibleStep === s ? "#d4af3715" : "transparent",
            }}
          >
            {stepLabels[s - 1]}
          </button>
        ))}
      </div>

      {/* Population rectangle */}
      <div className="space-y-3">
        <p className="text-[10px] text-[#475569]">
          Imagine <span className="text-white font-semibold">100,000 {w.entityPlural}</span> going through {w.testPhrase}
        </p>

        {/* Main area diagram */}
        <div className="w-full overflow-hidden rounded-xl border border-[#1e293b]" style={{ height: 160 }}>
          <div className="flex h-full relative">
            {/* Left column: Disease group */}
            <motion.div
              className="relative flex flex-col overflow-hidden"
              animate={{ width: `${diseaseW}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{ minWidth: "2%" }}
            >
              {/* TP region */}
              <AnimatePresence>
                {visibleStep >= 2 && (
                  <motion.div
                    key="tp"
                    className="flex items-center justify-center overflow-hidden absolute left-0 right-0 top-0"
                    initial={{ height: 0 }}
                    animate={{ height: `${tpH}%` }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                    style={{ background: "#d4af37" }}
                  >
                    {tpH > 15 && (
                      <span className="text-[8px] font-bold text-[#0a0e1a] px-1 text-center leading-tight">
                        TP: {fmt(tp)}
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* FN region */}
              <AnimatePresence>
                {visibleStep >= 2 && (
                  <motion.div
                    key="fn"
                    className="absolute left-0 right-0 bottom-0 flex items-center justify-center overflow-hidden"
                    initial={{ height: 0 }}
                    animate={{ height: `${100 - tpH}%` }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                    style={{ background: "#1e5d8a" }}
                  >
                    {(100 - tpH) > 15 && (
                      <span className="text-[8px] font-bold text-white px-1 text-center leading-tight">
                        FN: {fmt(fn)}
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Step 1: whole disease block */}
              {visibleStep < 2 && (
                <motion.div
                  className="w-full h-full flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  style={{ background: "#3bb4a4" }}
                >
                  <span className="text-[8px] font-bold text-white px-1 text-center leading-tight">
                    {fmt(withDisease)}
                    <br />
                    {w.hasCondition}
                  </span>
                </motion.div>
              )}
            </motion.div>

            {/* Right column: Healthy group */}
            <motion.div
              className="relative flex flex-col overflow-hidden flex-1"
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              {/* FP region */}
              <AnimatePresence>
                {visibleStep >= 2 && (
                  <motion.div
                    key="fp"
                    className="absolute left-0 right-0 top-0 flex items-center justify-center overflow-hidden"
                    initial={{ height: 0 }}
                    animate={{ height: `${fpH}%` }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
                    style={{ background: "#ef4444" }}
                  >
                    {fpH > 5 && (
                      <span className="text-[8px] font-bold text-white px-1 text-center leading-tight">
                        FP: {fmt(fp)}
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* TN region */}
              <AnimatePresence>
                {visibleStep >= 2 && (
                  <motion.div
                    key="tn"
                    className="absolute left-0 right-0 bottom-0 flex items-center justify-center overflow-hidden"
                    initial={{ height: 0 }}
                    animate={{ height: `${100 - fpH}%` }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
                    style={{ background: "#0f172a", border: "1px solid #1e293b" }}
                  >
                    {(100 - fpH) > 15 && (
                      <span className="text-[8px] text-[#475569] px-1 text-center leading-tight">
                        TN: {fmt(tn)}
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Step 1: whole healthy block */}
              {visibleStep < 2 && (
                <motion.div
                  className="w-full h-full flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  style={{ background: "#1e293b" }}
                >
                  <span className="text-[8px] text-[#94a3b8] px-1 text-center leading-tight">
                    {fmt(withoutDisease)}
                    <br />
                    {w.lacksCondition}
                  </span>
                </motion.div>
              )}
            </motion.div>

            {/* Divider between disease/healthy */}
            <div
              className="absolute top-0 bottom-0 w-px bg-[#334155] z-10"
              style={{ left: `${diseaseW}%` }}
            />
          </div>
        </div>

        {/* Step 1 info */}
        <AnimatePresence mode="wait">
          {visibleStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35 }}
              className="rounded-xl border border-[#1e293b] p-3 space-y-1"
            >
              <p className="text-[11px] font-semibold text-white">
                Step 1 — Prior (Before Testing)
              </p>
              <div className="flex gap-4 flex-wrap">
                <span className="text-[11px] text-[#3bb4a4]">
                  ~{fmt(withDisease)} {w.hasCondition}
                </span>
                <span className="text-[11px] text-[#94a3b8]">
                  ~{fmt(withoutDisease)} {w.lacksCondition}
                </span>
              </div>
              <p className="text-[10px] text-[#475569]">
                Base rate: {(baseRate * 100).toFixed(1)}% (the teal slice on the left)
              </p>
            </motion.div>
          )}

          {visibleStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35 }}
              className="rounded-xl border border-[#1e293b] p-3 space-y-2"
            >
              <p className="text-[11px] font-semibold text-white">
                Step 2 — Apply the Test
              </p>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <span className="text-[#d4af37] font-semibold">TP (gold):</span>
                  <span className="text-[#94a3b8] ml-1">{fmt(tp)} {w.testPositive} AND truly {w.hasCondition}</span>
                </div>
                <div>
                  <span className="text-[#1e5d8a] font-semibold" style={{ color: "#6ba3c8" }}>FN (blue):</span>
                  <span className="text-[#94a3b8] ml-1">{fmt(fn)} truly {w.hasCondition} but are missed</span>
                </div>
                <div>
                  <span className="text-[#ef4444] font-semibold">FP (red):</span>
                  <span className="text-[#94a3b8] ml-1">{fmt(fp)} {w.testPositive} but {w.lacksCondition}</span>
                </div>
                <div>
                  <span className="text-[#475569] font-semibold">TN (dark):</span>
                  <span className="text-[#94a3b8] ml-1">{fmt(tn)} correctly cleared</span>
                </div>
              </div>
            </motion.div>
          )}

          {visibleStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35 }}
              className="rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-3 space-y-2"
            >
              <p className="text-[11px] font-semibold text-[#d4af37]">
                Step 3 — Among Test Positives Only
              </p>
              <p className="text-[10px] text-[#94a3b8]">
                Of the{" "}
                <span className="text-white font-semibold">{fmt(tp + fp)}</span> {w.entityPlural} that {w.testPositive}:
              </p>
              <div className="flex gap-3 flex-wrap">
                <span className="text-[11px] font-semibold text-[#d4af37]">
                  TP: {fmt(tp)}
                </span>
                <span className="text-[11px] text-[#94a3b8]">|</span>
                <span className="text-[11px] font-semibold text-[#ef4444]">
                  FP: {fmt(fp)}
                </span>
              </div>
              <div className="rounded-lg bg-[#0f172a] border border-[#d4af37]/40 px-3 py-2">
                <p className="text-[10px] text-[#94a3b8] font-mono">
                  P({sc.conditionName} | {sc.testName}) = {fmt(tp)} / ({fmt(tp)} + {fmt(fp)})
                </p>
                <p className="text-[16px] font-black text-[#d4af37] mt-0.5">
                  ≈ {(posterior * 100).toFixed(2)}%
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Color legend */}
        <div className="flex gap-3 flex-wrap">
          {[
            { color: "#d4af37", label: "True Positive (TP)" },
            { color: "#1e5d8a", label: "False Negative (FN)" },
            { color: "#ef4444", label: "False Positive (FP)" },
            { color: "#1e293b", border: "#334155", label: "True Negative (TN)" },
          ].map(({ color, label, border }) => (
            <div key={label} className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{
                  background: color,
                  border: border ? `1px solid ${border}` : undefined,
                }}
              />
              <span className="text-[9px] text-[#475569]">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
