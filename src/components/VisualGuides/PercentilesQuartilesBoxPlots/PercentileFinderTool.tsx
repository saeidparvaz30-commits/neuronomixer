"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { StatsResult } from "./types";

interface PercentileEntry {
  pointId: number;
  value: number;
  percentile: number;
  higherThan: number;
}

interface PercentileFinderToolProps {
  stats: StatsResult;
  clickedPointIds: Set<number>;
  unit: string;
}

function computePercentile(value: number, sorted: number[]): { percentile: number; higherThan: number } {
  const below = sorted.filter((v) => v < value).length;
  const percentile = Math.round((below / sorted.length) * 100);
  return { percentile, higherThan: percentile };
}

export default function PercentileFinderTool({
  stats,
  clickedPointIds,
  unit,
}: PercentileFinderToolProps) {
  const entries: PercentileEntry[] = Array.from(clickedPointIds)
    .map((id) => {
      const value = stats.sorted[id];
      const { percentile, higherThan } = computePercentile(value, stats.sorted);
      return { pointId: id, value, percentile, higherThan };
    })
    .sort((a, b) => a.value - b.value);

  return (
    <div
      className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4"
      aria-label="Percentile finder tool"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-[#06b6d4]" aria-hidden="true" />
        <h3 className="text-[11px] uppercase tracking-widest text-[#06b6d4] font-semibold">
          Percentile Finder
        </h3>
      </div>

      {clickedPointIds.size === 0 ? (
        <p className="text-[12px] text-[#475569] italic">
          Click any data point on the chart above to find its percentile rank.
        </p>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {entries.map((entry) => (
              <motion.div
                key={entry.pointId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="rounded-xl bg-[#1e293b] px-4 py-3 flex items-center gap-4 flex-wrap"
                role="article"
                aria-label={`Value ${entry.value} is at the ${entry.percentile}th percentile`}
              >
                {/* Cyan dot */}
                <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4] flex-shrink-0" aria-hidden="true" />

                {/* Value */}
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#94a3b8] uppercase tracking-wider">Value</span>
                  <span className="text-sm font-bold text-white">
                    {entry.value} {unit}
                  </span>
                </div>

                {/* Percentile */}
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#94a3b8] uppercase tracking-wider">Percentile</span>
                  <span className="text-sm font-bold text-[#06b6d4]">{entry.percentile}th</span>
                </div>

                {/* Higher than */}
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#94a3b8] uppercase tracking-wider">Higher than</span>
                  <span className="text-sm font-bold text-[#3bb4a4]">{entry.higherThan}% of dataset</span>
                </div>

                {/* Progress bar */}
                <div className="flex-1 min-w-[80px]">
                  <div className="h-1.5 rounded-full bg-[#0f172a] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-[#06b6d4]"
                      initial={{ width: 0 }}
                      animate={{ width: `${entry.percentile}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      aria-hidden="true"
                    />
                  </div>
                  <p className="text-[9px] text-[#475569] mt-1">
                    percentile rank = (values below / n) × 100 = ({Math.round((entry.percentile / 100) * stats.n)}/{stats.n}) × 100
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {entries.length > 0 && (
            <p className="text-[10px] text-[#475569] mt-1 italic">
              {entries.length} point{entries.length > 1 ? "s" : ""} selected — click more to compare.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
