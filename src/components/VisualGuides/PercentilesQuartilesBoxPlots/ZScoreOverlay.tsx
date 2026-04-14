"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ZScoreOverlayProps {
  showZScores: boolean;
  onToggle: (v: boolean) => void;
  mean: number;
  sd: number;
  unit: string;
}

export default function ZScoreOverlay({
  showZScores,
  onToggle,
  mean,
  sd,
  unit,
}: ZScoreOverlayProps) {
  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] uppercase tracking-wider text-[#3bb4a4] font-semibold">
            Z-Score Overlay
          </span>
          <span className="text-[11px] text-[#94a3b8]">
            Standard normal scale for comparison
          </span>
        </div>

        {/* Toggle switch */}
        <button
          role="switch"
          aria-checked={showZScores}
          aria-label="Toggle Z-Score view"
          onClick={() => onToggle(!showZScores)}
          className={`relative w-11 h-6 rounded-full border p-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3bb4a4] ${
            showZScores
              ? "bg-[#3bb4a4] border-[#3bb4a4]"
              : "bg-[#1e293b] border-[#475569]"
          }`}
        >
          <motion.span
            animate={{ x: showZScores ? 22 : 2 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="absolute top-[3px] left-0 w-4 h-4 rounded-full bg-white shadow"
            aria-hidden="true"
          />
          <span className="sr-only">{showZScores ? "Z-Scores on" : "Z-Scores off"}</span>
        </button>
      </div>

      <AnimatePresence>
      {showZScores && (
        <motion.div
          key="zscore-content"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="mt-3 pt-3 border-t border-[#1e293b] overflow-hidden"
        >
          <p className="text-[11px] text-[#94a3b8] leading-relaxed">
            <span className="text-[#3bb4a4] font-semibold">Formula:</span>{" "}
            z = (x − μ) / σ = (x − {mean.toFixed(2)}{unit && ` ${unit}`}) / {sd.toFixed(2)}
          </p>
          <p className="text-[11px] text-[#94a3b8] mt-1.5 leading-relaxed">
            Standardizing shifts data to mean = 0, SD = 1. The shaded ±1σ band covers ~68% of normally
            distributed data, allowing comparison across datasets with different units.
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "−1σ", value: (mean - sd).toFixed(2), unit },
              { label: "Mean (0)", value: mean.toFixed(2), unit },
              { label: "+1σ", value: (mean + sd).toFixed(2), unit },
            ].map(({ label, value, unit: u }) => (
              <div key={label} className="rounded-lg bg-[#1e293b] px-2 py-1.5">
                <span className="block text-[9px] text-[#3bb4a4] uppercase tracking-wider">{label}</span>
                <span className="block text-[11px] font-bold text-white">
                  {value} {u}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
