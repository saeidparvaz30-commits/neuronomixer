"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { DistributionType, DISTRIBUTIONS } from "./types";
import DistributionCurve from "./DistributionCurve";
import ParameterControls from "./ParameterControls";
import StatisticsDisplay from "./StatisticsDisplay";
import UseCasesSection from "./UseCasesSection";

interface Props {
  type: DistributionType;
  params: Record<string, number>;
  onParamChange: (key: string, value: number) => void;
  onClose: () => void;
}

export default function DistributionPanel({ type, params, onParamChange, onClose }: Props) {
  const meta = DISTRIBUTIONS[type];
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = `panel-title-${type}`;

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Focus trap: focus panel on open
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      key={type}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border bg-[#0f172a] overflow-hidden outline-none"
      style={{ borderColor: meta.color + "40" }}
    >
      {/* Header */}
      <div
        className="flex items-start justify-between px-5 py-4 border-b"
        style={{ borderColor: meta.color + "20", background: meta.color + "08" }}
      >
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: meta.color }}
            />
            <span
              className="text-[10px] font-semibold uppercase tracking-[2px]"
              style={{ color: meta.color }}
            >
              {meta.isContinuous ? "Continuous" : "Discrete"} &bull; {meta.isContinuous ? "PDF" : "PMF"}
            </span>
          </div>
          <h2
            id={titleId}
            className="text-[18px] font-black text-white leading-tight"
          >
            {meta.label} Distribution
          </h2>
          <p className="text-[12px] text-[#94a3b8] mt-0.5 leading-snug max-w-[500px]">
            {meta.shortDesc}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close distribution panel"
          className="flex-shrink-0 ml-4 p-1.5 rounded-lg text-[#475569] hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="p-5 space-y-6">
        {/* Curve */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">
            {meta.isContinuous ? "Probability Density Function (PDF)" : "Probability Mass Function (PMF)"}
          </p>
          <DistributionCurve type={type} params={params} height={260} />
        </div>

        {/* Two-column: params + stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <ParameterControls type={type} params={params} onChange={onParamChange} />
          <StatisticsDisplay type={type} params={params} />
        </div>

        {/* Use cases */}
        <UseCasesSection type={type} />
      </div>
    </motion.div>
  );
}
