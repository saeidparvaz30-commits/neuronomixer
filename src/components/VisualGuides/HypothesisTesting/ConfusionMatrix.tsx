"use client";

import React from "react";
import { motion } from "framer-motion";
import type { ConfusionMatrixCounts } from "./types";

interface ConfusionMatrixProps {
  matrix: ConfusionMatrixCounts;
  total: number;
}

function pct(n: number, total: number): string {
  if (total === 0) return "0%";
  return ((n / total) * 100).toFixed(1) + "%";
}

function rate(num: number, den: number): string {
  if (den === 0) return "—";
  return ((num / den) * 100).toFixed(1) + "%";
}

interface CellProps {
  label: string;
  sublabel: string;
  count: number;
  total: number;
  bg: string;
  textColor: string;
  badge?: string;
  badgeColor?: string;
}

function MatrixCell({ label, sublabel, count, total, bg, textColor, badge, badgeColor }: CellProps) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div
      className="rounded-xl p-3 border"
      style={{ background: bg + "26", borderColor: bg + "40" }}
    >
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-[10px] font-semibold" style={{ color: textColor }}>{label}</p>
          <p className="text-[9px] text-[#475569]">{sublabel}</p>
        </div>
        {badge && (
          <span
            className="text-[8px] font-bold px-1.5 py-0.5 rounded-md"
            style={{ background: (badgeColor || bg) + "33", color: badgeColor || bg }}
          >
            {badge}
          </span>
        )}
      </div>
      <motion.p
        className="text-[26px] font-black font-mono leading-none"
        style={{ color: textColor }}
        animate={{ opacity: 1 }}
        key={count}
      >
        {count.toLocaleString()}
      </motion.p>
      <div className="mt-2 h-1.5 rounded-full bg-[#1e293b] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: bg }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <p className="text-[9px] mt-1" style={{ color: textColor + "aa" }}>
        {pct(count, total)} of all experiments
      </p>
    </div>
  );
}

export default function ConfusionMatrix({ matrix, total }: ConfusionMatrixProps) {
  const { truePositives: tp, falsePositives: fp, falseNegatives: fn, trueNegatives: tn } = matrix;

  const typeIRate = rate(fp, fp + tn);
  const typeIIRate = rate(fn, fn + tp);
  const power = rate(tp, tp + fn);

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">
          Confusion Matrix
        </p>
        <span className="text-[10px] text-[#475569] font-mono">
          {total.toLocaleString()} total
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[100px_1fr_1fr] gap-2 mb-2">
        <div />
        <div className="text-center">
          <p className="text-[9px] font-semibold text-[#3bb4a4] uppercase tracking-[1px]">Effect Exists</p>
          <p className="text-[8px] text-[#475569]">(H₁ true)</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] font-semibold text-[#94a3b8] uppercase tracking-[1px]">No Effect</p>
          <p className="text-[8px] text-[#475569]">(H₀ true)</p>
        </div>
      </div>

      {/* Row 1: Test Rejects */}
      <div className="grid grid-cols-[100px_1fr_1fr] gap-2 mb-2">
        <div className="flex items-center">
          <p className="text-[9px] font-semibold text-[#f1f5f9] leading-tight">
            Test<br />Rejects H₀
          </p>
        </div>
        <MatrixCell
          label="True Positive"
          sublabel="Correct rejection"
          count={tp}
          total={total}
          bg="#22c55e"
          textColor="#4ade80"
        />
        <MatrixCell
          label="False Positive"
          sublabel="Type I Error"
          count={fp}
          total={total}
          bg="#ef4444"
          textColor="#f87171"
          badge="α"
          badgeColor="#ef4444"
        />
      </div>

      {/* Row 2: Fails to Reject */}
      <div className="grid grid-cols-[100px_1fr_1fr] gap-2 mb-4">
        <div className="flex items-center">
          <p className="text-[9px] font-semibold text-[#f1f5f9] leading-tight">
            Fails to<br />Reject H₀
          </p>
        </div>
        <MatrixCell
          label="False Negative"
          sublabel="Type II Error"
          count={fn}
          total={total}
          bg="#f97316"
          textColor="#fb923c"
          badge="β"
          badgeColor="#f97316"
        />
        <MatrixCell
          label="True Negative"
          sublabel="Correct retention"
          count={tn}
          total={total}
          bg="#3b82f6"
          textColor="#60a5fa"
        />
      </div>

      {/* Summary rates */}
      <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/[0.06]">
        {[
          { label: "Type I Rate", value: typeIRate, color: "#f87171", desc: "FP / (FP+TN)" },
          { label: "Type II Rate", value: typeIIRate, color: "#fb923c", desc: "FN / (FN+TP)" },
          { label: "Power (1−β)", value: power, color: "#4ade80", desc: "TP / (TP+FN)" },
        ].map(({ label, value, color, desc }) => (
          <div key={label} className="text-center">
            <p className="text-[8px] text-[#475569] mb-0.5">{label}</p>
            <p className="text-[18px] font-bold font-mono" style={{ color }}>
              {value}
            </p>
            <p className="text-[8px] text-[#334155]">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
