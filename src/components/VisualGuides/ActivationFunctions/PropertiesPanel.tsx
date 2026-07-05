"use client";

import React from "react";
import { motion } from "framer-motion";
import { useGuideMotion } from "@/lib/guideMotion";
import type { FunctionProperties } from "./types";

interface PropertiesPanelProps {
  properties: FunctionProperties;
}

function RiskBadge({
  active,
  label,
  activeColor,
}: {
  active: boolean;
  label: string;
  activeColor: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
      style={
        active
          ? {
              backgroundColor: `${activeColor}20`,
              borderColor: `${activeColor}50`,
              color: activeColor,
            }
          : {
              backgroundColor: "#1e293b",
              borderColor: "#334155",
              color: "#475569",
            }
      }
    >
      <span>{active ? "!" : "✓"}</span>
      {label}
    </span>
  );
}

export default function PropertiesPanel({ properties }: PropertiesPanelProps) {
  const { fadeUp } = useGuideMotion();
  return (
    <motion.div
      key={properties.id}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4 space-y-4"
    >
      {/* Row 1: formula + range */}
      <div className="flex flex-wrap gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[#475569] mb-1">
            Formula
          </p>
          <p
            className="text-sm font-mono font-semibold"
            style={{ color: properties.color }}
          >
            {properties.formula}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[#475569] mb-1">
            Output Range
          </p>
          <p className="text-sm font-mono font-semibold text-white">
            {properties.range}
          </p>
        </div>
        <div className="flex-1 min-w-[160px]">
          <p className="text-[10px] uppercase tracking-wide text-[#475569] mb-1">
            Gradient Behavior
          </p>
          <p className="text-xs text-[#94a3b8]">{properties.gradient}</p>
        </div>
      </div>

      {/* Row 2: risk badges */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[10px] uppercase tracking-wide text-[#475569] mr-1">
          Risks:
        </span>
        <RiskBadge
          active={properties.vanishingRisk}
          label="Vanishing Gradient"
          activeColor="#f97316"
        />
        <RiskBadge
          active={properties.deadNeuronRisk}
          label="Dead Neurons"
          activeColor="#ef4444"
        />
      </div>

      {/* Row 3: best for */}
      <div>
        <p className="text-[10px] uppercase tracking-wide text-[#475569] mb-1.5">
          Best For
        </p>
        <div className="flex flex-wrap gap-1.5">
          {properties.bestFor.map((use) => (
            <span
              key={use}
              className="px-2 py-0.5 rounded-lg text-[10px] text-[#94a3b8] bg-[#1e293b] border border-[#334155]"
            >
              {use}
            </span>
          ))}
        </div>
      </div>

      {/* Key insight */}
      <div className="rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/30 px-4 py-3">
        <p className="text-[10px] uppercase tracking-wide text-[var(--color-accent)] mb-1 font-semibold">
          Key Insight
        </p>
        <p className="text-xs text-[#f1f5f9] leading-relaxed">
          {properties.keyInsight}
        </p>
      </div>
    </motion.div>
  );
}
