"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LogScaleToggleProps {
  onAdjust: () => void;
}

// Simulated income distribution dataset (annual incomes in thousands)
const RAW_INCOMES = [
  18, 22, 25, 27, 28, 30, 30, 31, 32, 33, 34, 35, 35, 36, 37, 38, 39, 40,
  40, 41, 42, 43, 44, 45, 45, 46, 47, 48, 50, 50, 52, 54, 55, 57, 60, 62,
  65, 68, 70, 75, 80, 85, 90, 100, 110, 130, 160, 200, 350, 800, 2000, 5000,
];

function buildBins(
  values: number[],
  isLog: boolean,
  numBins: number
): { label: string; count: number }[] {
  if (isLog) {
    const logVals = values.map((v) => Math.log10(v));
    const minL = Math.min(...logVals);
    const maxL = Math.max(...logVals);
    const step = (maxL - minL) / numBins;
    return Array.from({ length: numBins }, (_, i) => {
      const lo = minL + i * step;
      const hi = lo + step;
      const count = logVals.filter((v) => (i === numBins - 1 ? v <= hi : v < hi) && v >= lo).length;
      const labelLo = Math.pow(10, lo).toFixed(0);
      const labelHi = Math.pow(10, hi).toFixed(0);
      return { label: `${labelLo}–${labelHi}k`, count };
    });
  } else {
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const step = (maxV - minV) / numBins;
    return Array.from({ length: numBins }, (_, i) => {
      const lo = minV + i * step;
      const hi = lo + step;
      const count = values.filter((v) => (i === numBins - 1 ? v <= hi : v < hi) && v >= lo).length;
      return { label: `${lo.toFixed(0)}–${hi.toFixed(0)}k`, count };
    });
  }
}

const NUM_BINS = 10;
const BAR_HEIGHT = 150;

export default function LogScaleToggle({ onAdjust }: LogScaleToggleProps) {
  const [isLog, setIsLog] = useState(false);

  function toggle() {
    setIsLog((prev) => !prev);
    onAdjust();
  }

  const bins = buildBins(RAW_INCOMES, isLog, NUM_BINS);
  const maxCount = Math.max(...bins.map((b) => b.count));

  return (
    <div className="space-y-5">
      {/* Toggle */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggle}
          className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all border ${
            isLog
              ? "bg-[#d4af37] text-[#0a0e1a] border-[#d4af37]"
              : "border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37]"
          }`}
        >
          {isLog ? "Log Scale (active)" : "Switch to Log Scale"}
        </button>
        <span className="text-[11px] text-[#94a3b8]">
          Currently: <span className="font-semibold text-white">{isLog ? "Logarithmic" : "Linear"}</span>
        </span>
      </div>

      {/* Formula */}
      <div className="inline-flex items-center gap-2 rounded-lg border border-[#1e293b] bg-[#0a0e1a] px-4 py-2">
        <span className="text-[12px] text-[#94a3b8] font-mono">
          {isLog ? "Y_display = log₁₀(Y_income)" : "Y_display = Y_income"}
        </span>
      </div>

      {/* Histogram */}
      <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-4 overflow-x-auto">
        <p className="text-[10px] uppercase tracking-widest text-[#475569] mb-3">
          Income Distribution — {isLog ? "Log Scale" : "Linear Scale"}
        </p>
        <AnimatePresence mode="wait">
          <motion.div
            key={isLog ? "log" : "linear"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="flex items-end gap-1 min-w-[360px]"
            style={{ height: BAR_HEIGHT + 40 }}
          >
            {bins.map((bin, i) => {
              const h = maxCount > 0 ? Math.round((bin.count / maxCount) * BAR_HEIGHT) : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full flex items-end" style={{ height: BAR_HEIGHT }}>
                    <div
                      className="w-full rounded-t transition-all duration-500"
                      style={{
                        height: h,
                        background: isLog
                          ? "linear-gradient(180deg, #d4af37cc, #d4af3760)"
                          : "linear-gradient(180deg, #3b82f6cc, #3b82f660)",
                      }}
                      title={`${bin.label}: ${bin.count} people`}
                    />
                  </div>
                  <span className="text-[7px] text-[#334155] truncate w-full text-center">
                    {bin.label}
                  </span>
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
        <p className="text-[10px] text-[#475569] mt-2 text-center">Income in $1000s</p>
      </div>

      {/* Side-by-side insight */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className={`rounded-xl border p-4 transition-all ${!isLog ? "border-[#3b82f6]/40 bg-[#3b82f6]/5" : "border-[#1e293b] bg-[#0f172a]"}`}>
          <p className="text-[11px] font-semibold text-[#3b82f6] mb-1.5">Linear Scale</p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed">
            Heavily skewed — most data is crammed near zero. The ultra-wealthy create extreme outliers that compress the rest of the distribution into a narrow strip.
          </p>
        </div>
        <div className={`rounded-xl border p-4 transition-all ${isLog ? "border-[#d4af37]/40 bg-[#d4af37]/5" : "border-[#1e293b] bg-[#0f172a]"}`}>
          <p className="text-[11px] font-semibold text-[#d4af37] mb-1.5">Log Scale</p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed">
            More symmetric — the distribution becomes bell-shaped, tail patterns are visible, and the shape of inequality is clearer to interpret.
          </p>
        </div>
      </div>

      {/* Explanation */}
      <div className="rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-4">
        <p className="text-[13px] text-[#94a3b8] leading-relaxed">
          <span className="font-semibold text-white">Log scales</span> compress large ranges and reveal multiplicative patterns. Essential for analyzing income, population, or disease spread where values span several orders of magnitude.
        </p>
      </div>
    </div>
  );
}
