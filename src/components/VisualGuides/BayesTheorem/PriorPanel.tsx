"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";

interface PriorPanelProps {
  baseRate: number;
  onBaseRateChange: (v: number) => void;
}

export default function PriorPanel({ baseRate, onBaseRateChange }: PriorPanelProps) {
  // We display "per 1000" to make the 0.1% base rate visible
  const POPULATION = 1000;
  const diseaseCount = Math.max(1, Math.round(POPULATION * baseRate));
  const healthyCount = POPULATION - diseaseCount;

  // Grid: 25×40 = 1000 squares. Show first `diseaseCount` as blue.
  const GRID_COLS = 40;
  const GRID_ROWS = 25;
  const TOTAL = GRID_COLS * GRID_ROWS; // 1000

  const cells = useMemo(() => {
    return Array.from({ length: TOTAL }, (_, i) => i < diseaseCount);
  }, [diseaseCount, TOTAL]);

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6 space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-1">
          Prior
        </p>
        <h2 className="text-[15px] font-bold text-white">
          How likely before testing?
        </h2>
      </div>

      {/* Slider */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[12px] text-white font-medium">
            Disease Prevalence (Base Rate)
          </span>
          <span className="text-[13px] font-mono font-bold text-[#d4af37]">
            P(Disease) = {(baseRate * 100).toFixed(1)}%
          </span>
        </div>
        <input
          type="range"
          min={0.001}
          max={0.1}
          step={0.001}
          value={baseRate}
          onChange={(e) => onBaseRateChange(Number(e.target.value))}
          className="w-full"
          style={{ accentColor: "#d4af37" }}
        />
        <div className="flex justify-between text-[9px] text-[#334155]">
          <span>0.1%</span>
          <span>10%</span>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[12px] text-[#94a3b8]">
          In 1,000 people:
        </span>
        <span className="px-2 py-0.5 rounded-md bg-[#3bb4a4]/20 text-[#3bb4a4] text-[12px] font-semibold">
          {diseaseCount} have this disease
        </span>
        <span className="px-2 py-0.5 rounded-md bg-[#1e293b] text-[#94a3b8] text-[12px]">
          {healthyCount} do not
        </span>
      </div>

      {/* Population grid */}
      <div>
        <p className="text-[10px] text-[#475569] mb-2">
          Each square = 1 person out of {POPULATION}. Blue = has disease.
        </p>
        <div
          className="grid gap-[2px]"
          style={{
            gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
          }}
        >
          {cells.map((hasDisease, i) => (
            <motion.div
              key={i}
              className="aspect-square rounded-[1px]"
              animate={{
                backgroundColor: hasDisease ? "#3bb4a4" : "#1e293b",
              }}
              transition={{ duration: 0.3, delay: hasDisease ? (i / diseaseCount) * 0.15 : 0 }}
            />
          ))}
        </div>
        <p className="text-[10px] text-[#3bb4a4] mt-2 font-semibold">
          {diseaseCount} in {POPULATION} ({(baseRate * 100).toFixed(1)}%) have this disease
        </p>
      </div>
    </div>
  );
}
