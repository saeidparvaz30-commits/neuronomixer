"use client";

import React from "react";
import { motion } from "framer-motion";
import { computeZ } from "./types";

interface Props {
  rawValue: number;
  mean: number;
  stdDev: number;
  onRawChange: (v: number) => void;
  onMeanChange: (v: number) => void;
  onStdDevChange: (v: number) => void;
  onUsed: () => void;
}

function getInterpretation(z: number): string {
  if (!isFinite(z)) return "Standard deviation cannot be zero.";
  if (z > 3) return "Exceptionally above average (top ~0.1%)";
  if (z > 2) return "Well above average (top ~2.5%)";
  if (z > 1) return "Above average (top ~16%)";
  if (z > 0.5) return "Slightly above average";
  if (z > -0.5) return "Close to the mean (average range)";
  if (z > -1) return "Slightly below average";
  if (z > -2) return "Below average (bottom ~16%)";
  if (z > -3) return "Well below average (bottom ~2.5%)";
  return "Exceptionally below average (bottom ~0.1%)";
}

function getInterpretationColor(z: number): string {
  if (!isFinite(z)) return "#94a3b8";
  if (Math.abs(z) > 2) return "var(--color-warning)";
  if (Math.abs(z) > 1) return "var(--color-accent)";
  return "#3bb4a4";
}

export default function ZScoreCalculator({
  rawValue,
  mean,
  stdDev,
  onRawChange,
  onMeanChange,
  onStdDevChange,
  onUsed,
}: Props) {
  const z = computeZ(rawValue, mean, stdDev);
  const interpretation = getInterpretation(z);
  const interpretationColor = getInterpretationColor(z);

  function handleChange(setter: (v: number) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        setter(val);
        onUsed();
      }
    };
  }

  const inputClass =
    "w-full bg-[#0f172a] border border-[#1e293b] rounded-xl px-3 py-2 text-[13px] text-white focus:outline-none focus:border-[#1e5d8a] transition-colors";
  const labelClass = "text-[10px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-1 block";

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <h3 className="text-[13px] font-bold text-white mb-1">Z-Score Calculator</h3>
      <p className="text-[11px] text-[#475569] mb-4">Convert a raw score to a z-score</p>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <label className={labelClass}>Raw Value</label>
          <input
            type="number"
            value={rawValue}
            onChange={handleChange(onRawChange)}
            className={inputClass}
            step="1"
          />
        </div>
        <div>
          <label className={labelClass}>Mean (μ)</label>
          <input
            type="number"
            value={mean}
            onChange={handleChange(onMeanChange)}
            className={inputClass}
            step="1"
          />
        </div>
        <div>
          <label className={labelClass}>Std Dev (σ)</label>
          <input
            type="number"
            value={stdDev}
            onChange={handleChange(onStdDevChange)}
            className={inputClass}
            step="0.1"
            min="0.1"
          />
        </div>
      </div>

      {/* Formula visualization */}
      <div className="bg-[#1e293b] rounded-xl px-4 py-3 mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[#475569] mb-2">
          Formula
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-mono text-[#94a3b8]">z =</span>
          <span className="text-[13px] font-mono text-white">
            ({rawValue % 1 === 0 ? rawValue : rawValue.toFixed(2)} &minus;{" "}
            {mean % 1 === 0 ? mean : mean.toFixed(2)}) &divide;{" "}
            {stdDev % 1 === 0 ? stdDev : stdDev.toFixed(2)}
          </span>
          <span className="text-[13px] font-mono text-[#94a3b8]">=</span>
          <span className="text-[13px] font-mono font-bold text-[var(--color-accent)]">
            {stdDev === 0 ? "∞" : z.toFixed(4)}
          </span>
        </div>
        <div className="mt-1.5 text-[10px] text-[#475569] font-mono">
          = ({rawValue - mean}) &divide; {stdDev} = {stdDev === 0 ? "∞" : z.toFixed(4)}
        </div>
      </div>

      {/* Result */}
      <motion.div
        key={z.toFixed(2)}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-xl border border-[#1e293b] p-4"
        style={{ borderColor: interpretationColor + "40" }}
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[11px] text-[#475569] mb-1">Your z-score is</p>
            <p className="text-[28px] font-black" style={{ color: interpretationColor }}>
              {stdDev === 0 ? "∞" : z.toFixed(2)}
            </p>
          </div>
          <div className="flex-1 min-w-[140px]">
            <p className="text-[11px] text-[#94a3b8] leading-relaxed" style={{ color: interpretationColor }}>
              {interpretation}
            </p>
            {isFinite(z) && (
              <p className="text-[10px] text-[#475569] mt-2 leading-relaxed">
                {z > 0
                  ? `${rawValue} is ${Math.abs(z).toFixed(2)} standard deviation${Math.abs(z) !== 1 ? "s" : ""} above the mean.`
                  : z < 0
                  ? `${rawValue} is ${Math.abs(z).toFixed(2)} standard deviation${Math.abs(z) !== 1 ? "s" : ""} below the mean.`
                  : `${rawValue} is exactly at the mean.`}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
