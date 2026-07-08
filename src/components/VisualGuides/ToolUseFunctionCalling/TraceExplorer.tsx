"use client";

import React from "react";
import { motion } from "framer-motion";
import { useGuideMotion } from "@/lib/guideMotion";
import type { Scenario } from "./types";
import { ROLE_META } from "./types";

interface Props {
  scenario: Scenario;
  /** Index of the last visible step (0-based). */
  currentStep: number;
  onAdvance: () => void;
  onRestart: () => void;
}

const STEP_NAMES = ["User request", "Tool call", "Tool result", "Final answer"];

export default function TraceExplorer({ scenario, currentStep, onAdvance, onRestart }: Props) {
  const { fadeUp } = useGuideMotion();
  const total = scenario.steps.length;
  const atEnd = currentStep >= total - 1;

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <p className="text-[13px] font-semibold text-white">
            One round trip through the loop
          </p>
          <p className="text-[11px] text-[#475569] mt-0.5 font-mono">
            {scenario.toolSummary}
          </p>
        </div>
        <span
          className="text-[10px] font-semibold uppercase tracking-[1.5px] px-2.5 py-1 rounded-full border border-[#334155] text-[#94a3b8]"
          title="Hand-authored example messages, not live model output"
        >
          Simulated trace
        </span>
      </div>

      {/* Messages */}
      <ol className="space-y-3 mb-5" aria-label="Trace messages">
        {scenario.steps.slice(0, currentStep + 1).map((step, i) => {
          const meta = ROLE_META[step.role];
          return (
            <motion.li
              key={`${scenario.id}-${i}`}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="rounded-xl border border-[#1e293b] bg-[#162032] overflow-hidden"
              style={{ borderLeft: `3px solid ${meta.color}` }}
            >
              <div className="px-4 pt-3 pb-2 flex flex-wrap items-center gap-2">
                <span
                  className="text-[10px] font-semibold uppercase tracking-[1.5px]"
                  style={{ color: meta.color }}
                >
                  {meta.label}
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                    step.actor === "runtime"
                      ? "border-[#3bb4a4]/40 text-[#3bb4a4]"
                      : step.actor === "model"
                        ? "border-[#334155] text-[#94a3b8]"
                        : "border-[#1e5d8a]/60 text-[#93c5fd]"
                  }`}
                >
                  {meta.actorLabel}
                </span>
              </div>

              <div className="px-4 pb-3">
                {step.text && (
                  <p className="text-[13px] text-[#f1f5f9] leading-relaxed">{step.text}</p>
                )}
                {step.toolName && (
                  <p className="text-[11px] text-[#94a3b8] mb-1.5">
                    Requested tool:{" "}
                    <span className="font-mono font-semibold" style={{ color: meta.color }}>
                      {step.toolName}
                    </span>
                  </p>
                )}
                {step.argsJson && (
                  <pre className="rounded-lg bg-[#1e293b]/60 font-mono text-[11.5px] text-[#93c5fd] p-3 overflow-x-auto">
                    {step.argsJson}
                  </pre>
                )}
                {step.resultJson && (
                  <pre className="rounded-lg bg-[#1e293b]/60 font-mono text-[11.5px] text-[#93c5fd] p-3 overflow-x-auto">
                    {step.resultJson}
                  </pre>
                )}
              </div>

              <div className="px-4 py-2.5 border-t border-white/[0.05] bg-[#0f172a]">
                <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                  <span className="font-semibold text-[#475569] uppercase text-[9px] tracking-wide mr-1.5">
                    What happens here
                  </span>
                  {step.annotation}
                </p>
              </div>
            </motion.li>
          );
        })}
      </ol>

      {/* Step control */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onAdvance}
          disabled={atEnd}
          aria-label={
            atEnd ? "Trace complete" : `Show next step: ${STEP_NAMES[currentStep + 1]}`
          }
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] ${
            atEnd
              ? "bg-[#1e293b] text-[#475569] cursor-not-allowed"
              : "bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90"
          }`}
        >
          {atEnd ? "Trace complete" : `Next step: ${STEP_NAMES[currentStep + 1]}`}
        </button>
        <button
          onClick={onRestart}
          disabled={currentStep === 0}
          aria-label="Restart this trace from the first message"
          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] ${
            currentStep === 0
              ? "border-[#1e293b] text-[#475569] cursor-not-allowed"
              : "border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37]"
          }`}
        >
          Restart trace
        </button>
        <span className="text-[11px] text-[#475569] ml-auto" aria-live="polite">
          Step {currentStep + 1} of {total}
        </span>
      </div>
    </div>
  );
}
