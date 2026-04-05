"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DetectionMethod, Point, mean, stdDev, quartiles } from "./types";

type Props = {
  method: DetectionMethod;
  onMethodChange: (m: DetectionMethod) => void;
  threshold: number;
  onThresholdChange: (t: number) => void;
  outlierIds: Set<number>;
  points: Point[];
};

export default function DetectionMethodPanel({
  method, onMethodChange, threshold, onThresholdChange, outlierIds, points,
}: Props) {
  const xs  = points.map(p => p.x);
  const mx  = xs.length > 0 ? mean(xs) : 0;
  const sd  = xs.length > 1 ? stdDev(xs, mx) : 0;
  const { q1, q3, iqr } = xs.length > 3 ? quartiles(xs) : { q1: 0, q3: 0, iqr: 0 };
  const lo  = method === "zscore" ? mx - threshold * sd : q1 - 1.5 * iqr;
  const hi  = method === "zscore" ? mx + threshold * sd : q3 + 1.5 * iqr;

  const outlierList  = points.filter(p => outlierIds.has(p.id));
  const outlierColor = method === "zscore" ? "#ef4444" : "#f97316";

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-3">Detection Method</p>

      {/* Toggle */}
      <div className="flex gap-2 mb-4">
        {(["zscore", "iqr"] as const).map(m => (
          <button
            key={m}
            onClick={() => onMethodChange(m)}
            className={`flex-1 py-2 rounded-xl text-[11px] font-semibold transition-all border ${
              method === m
                ? m === "zscore"
                  ? "bg-[#ef4444]/10 border-[#ef4444]/40 text-[#ef4444]"
                  : "bg-[#f97316]/10 border-[#f97316]/40 text-[#f97316]"
                : "bg-transparent border-[#1e293b] text-[#475569] hover:text-white hover:border-[#334155]"
            }`}
          >
            {m === "zscore" ? "Z-Score" : "IQR"}
          </button>
        ))}
      </div>

      {/* Method-specific controls */}
      <AnimatePresence mode="wait">
        <motion.div
          key={method}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
        >
          {method === "zscore" ? (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[11px] text-[#94a3b8]">Threshold (σ)</span>
                <span className="text-[11px] font-semibold text-[#ef4444]">{threshold.toFixed(1)}σ</span>
              </div>
              <input
                type="range" min="1" max="4" step="0.5" value={threshold}
                onChange={e => onThresholdChange(Number(e.target.value))}
                className="w-full h-1.5 rounded-full bg-[#1e293b] appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-[#ef4444] [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { label: "Mean X",      value: mx.toFixed(1),  color: "#3bb4a4" },
                  { label: "Std Dev X",   value: sd.toFixed(1),  color: "#3b82f6" },
                  { label: "Lower fence", value: lo.toFixed(1),  color: "#ef4444" },
                  { label: "Upper fence", value: hi.toFixed(1),  color: "#ef4444" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-lg bg-[#1e293b]/60 p-2">
                    <p className="text-[9px] text-[#475569] mb-0.5">{label}</p>
                    <p className="text-[12px] font-semibold" style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[#475569] mt-2 leading-relaxed">
                Flags points where |x − μ| &gt; {threshold.toFixed(1)}σ. Assumes a normal distribution.
              </p>
            </div>
          ) : (
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { label: "Q1",          value: q1.toFixed(1),         color: "#f97316" },
                  { label: "Q3",          value: q3.toFixed(1),         color: "#f97316" },
                  { label: "IQR (Q3−Q1)", value: iqr.toFixed(1),        color: "#f97316" },
                  { label: "1.5 × IQR",   value: (1.5*iqr).toFixed(1), color: "#94a3b8" },
                  { label: "Lower fence", value: lo.toFixed(1),         color: "#f97316" },
                  { label: "Upper fence", value: hi.toFixed(1),         color: "#f97316" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-lg bg-[#1e293b]/60 p-2">
                    <p className="text-[9px] text-[#475569] mb-0.5">{label}</p>
                    <p className="text-[12px] font-semibold" style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[#475569] leading-relaxed">
                Flags points outside Q1 − 1.5×IQR or Q3 + 1.5×IQR. No normality assumption needed.
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Detected outliers list */}
      <div className="border-t border-white/[0.06] pt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8]">Flagged Outliers</p>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: outlierList.length > 0 ? outlierColor + "20" : "#1e293b",
              color: outlierList.length > 0 ? outlierColor : "#475569",
            }}
          >
            {outlierList.length} / {points.length}
          </span>
        </div>
        {outlierList.length === 0 ? (
          <p className="text-[11px] text-[#475569] text-center py-2">No outliers detected with current settings</p>
        ) : (
          <div className="flex flex-col gap-1">
            {outlierList.map(p => {
              const zScore = sd > 0 ? Math.abs((p.x - mx) / sd) : 0;
              return (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-[#1e293b]/40 px-2.5 py-1.5">
                  <span className="text-[11px] font-medium text-white">
                    #{p.id} ({p.x}, {p.y})
                  </span>
                  <span className="text-[10px] font-semibold" style={{ color: outlierColor }}>
                    {method === "zscore" ? `z = ${zScore.toFixed(2)}` : `x = ${p.x}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
