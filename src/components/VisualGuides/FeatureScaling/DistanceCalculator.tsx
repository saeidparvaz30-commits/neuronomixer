"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RAW_DATA, scale, euclidean, METHOD_META } from "./types";

type Props = { selectedPair: [number, number] | null };

const METHODS = ["raw", "normalized", "meannorm", "standardized"] as const;

function fmt(v: number, method: typeof METHODS[number]): string {
  if (method === "raw")          return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (method === "standardized") return v.toFixed(4) + " σ";
  return v.toFixed(4);
}

function DistanceCalculatorInner({ selectedPair }: Props) {
  if (!selectedPair) {
    return (
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-3">Distance Between Two Points</p>
        <div className="rounded-xl bg-[#1e293b]/30 border border-[#1e293b] p-4 text-center">
          <p className="text-[12px] text-[#475569]">Click two points on the scatter plot to compare Euclidean distances across scaling methods.</p>
          <p className="text-[10px] text-[#334155] mt-2 font-mono">d = √((x₁−x₂)² + (y₁−y₂)²)</p>
        </div>
      </div>
    );
  }

  const [iA, iB] = selectedPair;
  const ptA = RAW_DATA[iA];
  const ptB = RAW_DATA[iB];

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-1">Distance Between Two Points</p>

      {/* Selected points */}
      <div className="flex gap-3 mb-4 flex-wrap">
        {[{ label: "A", pt: ptA }, { label: "B", pt: ptB }].map(({ label, pt }) => (
          <div key={label} className="flex items-center gap-2 rounded-lg bg-[#1e293b]/40 border border-[#d4af37]/30 px-3 py-1.5">
            <div className="w-5 h-5 rounded-full bg-[#d4af37] text-[#0a0e1a] text-[10px] font-bold flex items-center justify-center flex-shrink-0">{label}</div>
            <div className="text-[11px]">
              <span className="text-[#94a3b8]">Age </span><span className="text-white font-semibold">{pt.age}</span>
              <span className="text-[#475569] mx-1">·</span>
              <span className="text-[#94a3b8]">Salary </span><span className="text-white font-semibold">${(pt.salary / 1000).toFixed(0)}k</span>
            </div>
          </div>
        ))}
      </div>

      {/* Formula */}
      <p className="font-mono text-[10px] text-[#334155] mb-3">d = √((x₁−x₂)² + (y₁−y₂)²)</p>

      {/* Distance cards */}
      <div className="flex flex-col gap-2" aria-live="polite">
        {METHODS.map((m) => {
          const meta = METHOD_META[m];
          const sA   = scale(ptA, m);
          const sB   = scale(ptB, m);
          const d    = euclidean(sA, sB);
          const isRaw = m === "raw";

          return (
            <AnimatePresence key={m} mode="wait">
              <motion.div
                key={`${iA}-${iB}-${m}`}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="rounded-lg border-l-4 bg-[#1e293b]/20 px-3 py-2.5 flex items-center justify-between"
                style={{ borderColor: meta.color }}
              >
                <div>
                  <p className="text-[11px] font-semibold text-white">{meta.label}</p>
                  <p className="text-[10px] text-[#475569] mt-0.5 font-mono">
                    ({sA.x.toFixed(2)}, {sA.y.toFixed(2)}) → ({sB.x.toFixed(2)}, {sB.y.toFixed(2)})
                  </p>
                </div>
                <span className={`text-[13px] font-bold font-mono tabular-nums ${isRaw ? "text-[#ef4444]" : "text-[#3bb4a4]"}`}>
                  {fmt(d, m)}
                </span>
              </motion.div>
            </AnimatePresence>
          );
        })}
      </div>

      {/* Insight */}
      <div className="mt-4 rounded-xl border border-[#1e293b] bg-[#1e293b]/20 p-3 text-[11px] text-[#94a3b8] leading-relaxed">
        <strong className="text-white block mb-1">Why this matters</strong>
        KNN uses distance to find nearest neighbors. With raw data, salary differences (in $1,000s) dwarf age differences — the algorithm treats salary as orders of magnitude more important.
        After scaling, both features contribute <em className="text-white">equally</em> to the distance calculation.
      </div>
    </div>
  );
}

const DistanceCalculator = React.memo(DistanceCalculatorInner);
export default DistanceCalculator;
