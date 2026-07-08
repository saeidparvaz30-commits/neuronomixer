"use client";

import React from "react";
import { motion } from "framer-motion";
import type { ScenarioType } from "./types";
import { SCENARIO_CONFIGS } from "./types";

interface InteractiveBlocksProps {
  posterior: number;
  baseRate: number;
  sensitivity: number;
  specificity: number;
  scenario: ScenarioType;
}

export default function InteractiveBlocks({
  posterior,
  baseRate,
  sensitivity,
  specificity,
  scenario,
}: InteractiveBlocksProps) {
  const w = SCENARIO_CONFIGS[scenario].wording;
  const BLOCKS = 100;
  const truePositiveBlocks = Math.max(0, Math.min(BLOCKS, Math.round(posterior * BLOCKS)));
  const falsePositiveBlocks = BLOCKS - truePositiveBlocks;

  // Counts in 1,000,000
  const N = 1_000_000;
  const withDisease = Math.round(N * baseRate);
  const withoutDisease = N - withDisease;
  const tp = Math.round(withDisease * sensitivity);
  const fp = Math.round(withoutDisease * (1 - specificity));
  const total = tp + fp;

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6 space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-1">
          Visual Breakdown
        </p>
        <h2 className="text-[15px] font-bold text-white">
          Of 100 {w.entityPlural} that {w.testPositive}…
        </h2>
      </div>

      {/* Block grid */}
      <div className="space-y-2">
        <div className="grid gap-[3px]" style={{ gridTemplateColumns: "repeat(10, minmax(0, 1fr))" }}>
          {Array.from({ length: BLOCKS }, (_, i) => {
            const isTP = i < truePositiveBlocks;
            return (
              <motion.div
                key={i}
                className="aspect-square rounded-sm"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: i * 0.008,
                  duration: 0.25,
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                }}
                style={{
                  background: isTP ? "#3bb4a4" : "#ef4444",
                }}
                title={isTP ? "True Positive: Has the condition" : "False Positive: Does not have condition"}
              />
            );
          })}
        </div>

        {/* Labels */}
        <div className="flex flex-wrap gap-3 pt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#3bb4a4] flex-shrink-0" />
            <span className="text-[11px] text-[#3bb4a4] font-semibold">
              True Positives (actually have it): {truePositiveBlocks} ({(posterior * 100).toFixed(1)}%)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#ef4444] flex-shrink-0" />
            <span className="text-[11px] text-[#ef4444] font-semibold">
              False Positives (false alarm): {falsePositiveBlocks} ({((1 - posterior) * 100).toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Your Risk highlight */}
      <div className="rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 px-4 py-3 text-center">
        <p className="text-[10px] uppercase tracking-[1.5px] text-[#94a3b8] mb-1">Posterior Probability</p>
        <p className="text-[36px] font-black text-[var(--color-accent)] leading-none">
          {(posterior * 100).toFixed(1)}%
        </p>
      </div>

      {/* 1,000,000 breakdown */}
      {total > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-[#475569]">
            In a group of{" "}
            <span className="text-white font-semibold">1,000,000</span> {w.entityPlural} tested,{" "}
            <span className="text-white font-semibold">{total.toLocaleString()}</span> {w.testPositive}, split into:
          </p>
          <div className="flex gap-2 text-[11px] flex-wrap">
            <span className="px-2 py-1 rounded-md bg-[#3bb4a4]/15 text-[#3bb4a4] font-semibold">
              ~{tp.toLocaleString()} true positives (truly {w.hasCondition})
            </span>
            <span className="px-2 py-1 rounded-md bg-[#ef4444]/15 text-[#ef4444] font-semibold">
              ~{fp.toLocaleString()} false positives ({w.lacksCondition})
            </span>
          </div>

          {/* Horizontal bar */}
          <div className="flex rounded-full overflow-hidden h-4 w-full border border-[#1e293b]">
            <motion.div
              className="h-full bg-[#3bb4a4]"
              animate={{ width: `${(tp / total) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
            <motion.div
              className="h-full bg-[#ef4444]"
              animate={{ width: `${(fp / total) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
