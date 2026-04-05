"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { StepContent } from "./types";

const PHASE_COLORS: Record<StepContent["phase"], string> = {
  forward: "#3bb4a4",
  loss: "#d4af37",
  backward: "#f87171",
  update: "#4ade80",
};

const PHASE_LABELS: Record<StepContent["phase"], string> = {
  forward: "Forward Pass",
  loss: "Loss Computation",
  backward: "Backward Pass",
  update: "Weight Update",
};

interface Props {
  content: StepContent;
}

export default function ExplanationPanel({ content }: Props) {
  const phaseColor = PHASE_COLORS[content.phase];
  const phaseLabel = PHASE_LABELS[content.phase];

  return (
    <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-2xl p-5 flex flex-col gap-4 h-full">
      {/* Phase badge */}
      <div
        className="inline-flex items-center gap-2 self-start rounded-full px-3 py-1"
        style={{
          background: `${phaseColor}18`,
          border: `1px solid ${phaseColor}40`,
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: phaseColor }}
        />
        <span
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: phaseColor }}
        >
          {phaseLabel}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={content.step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="flex flex-col gap-4"
        >
          {/* Title */}
          <h2 className="text-xl font-bold text-white leading-tight">
            {content.title}
          </h2>

          {/* Description */}
          <p className="text-sm text-[#94a3b8] leading-relaxed">
            {content.description}
          </p>

          {/* Formula */}
          {content.formula && (
            <div className="bg-[#0f172a] rounded-lg p-3 font-mono text-[12px] text-[#d4af37] border border-[#334155] overflow-x-auto whitespace-nowrap">
              {content.formula}
            </div>
          )}

          {/* Key points */}
          <div className="flex flex-col gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8]">
              Key Points
            </h3>
            <ul className="flex flex-col gap-2">
              {content.keyPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span
                    className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: "#3bb4a4" }}
                  />
                  <span className="text-sm text-[#94a3b8] leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
