"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuideMotion } from "@/lib/guideMotion";
import { BiasResult } from "./types";

interface BiasAnalyzerProps {
  result: BiasResult;
  controlled: Set<string>;
  nodeLabels: Record<string, string>;
}

const STATUS_ICONS: Record<BiasResult["status"], string> = {
  unbiased: "✓",
  partial: "~",
  biased: "✗",
  blocked: "⊘",
};

export default function BiasAnalyzer({ result, controlled, nodeLabels }: BiasAnalyzerProps) {
  const { fadeUp } = useGuideMotion();
  const borderColor =
    result.status === "unbiased"
      ? "border-emerald-500/40"
      : result.status === "partial"
      ? "border-amber-400/40"
      : result.status === "blocked"
      ? "border-[#94a3b8]/30"
      : "border-red-500/40";

  const bgColor =
    result.status === "unbiased"
      ? "bg-emerald-950/30"
      : result.status === "partial"
      ? "bg-amber-950/30"
      : result.status === "blocked"
      ? "bg-slate-800/20"
      : "bg-red-950/30";

  const iconColor =
    result.status === "unbiased"
      ? "text-emerald-400"
      : result.status === "partial"
      ? "text-amber-400"
      : result.status === "blocked"
      ? "text-[#94a3b8]"
      : "text-red-400";

  const badgeBg =
    result.status === "unbiased"
      ? "bg-emerald-500/20 text-emerald-300"
      : result.status === "partial"
      ? "bg-amber-500/20 text-amber-300"
      : result.status === "blocked"
      ? "bg-slate-600/20 text-slate-300"
      : "bg-red-500/20 text-red-300";

  const controlledList = Array.from(controlled)
    .map((id) => nodeLabels[id] ?? id)
    .join(", ");

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={result.label}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        exit="hidden"
        className={`rounded-xl border p-4 space-y-3 ${borderColor} ${bgColor}`}
      >
        {/* Header row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={`text-xl font-bold ${iconColor}`}>
              {STATUS_ICONS[result.status]}
            </span>
            <span className="text-sm font-bold text-white">{result.label}</span>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeBg}`}>
            {result.status}
          </span>
        </div>

        {/* Explanation */}
        <p className="text-sm text-[#94a3b8] leading-relaxed">{result.explanation}</p>

        {/* Detail */}
        <p className="text-xs text-[#475569] italic">{result.detail}</p>

        {/* Currently controlled */}
        <div className="pt-1 border-t border-white/5">
          <span className="text-[10px] text-[#475569] uppercase tracking-wider font-semibold">
            Controlled for:
          </span>
          {controlledList ? (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {Array.from(controlled).map((id) => (
                <span
                  key={id}
                  className="text-[10px] bg-[#3bb4a4]/10 border border-[#3bb4a4]/30 text-[#3bb4a4] px-2 py-0.5 rounded-full font-medium"
                >
                  {nodeLabels[id] ?? id}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[11px] text-[#475569] ml-2 italic">nothing</span>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
