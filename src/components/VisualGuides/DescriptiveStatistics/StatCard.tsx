"use client";

import React from "react";
import { motion } from "framer-motion";

interface StatCardProps {
  name: string;
  formula: string;
  value: string;
  description: string;
  highlight?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function StatCard({
  name,
  formula,
  value,
  description,
  highlight = false,
  onMouseEnter,
  onMouseLeave,
}: StatCardProps) {
  return (
    <motion.div
      layout
      className={`rounded-2xl border p-4 transition-colors duration-200 cursor-default ${
        highlight
          ? "border-[var(--color-accent)]/60 bg-[#1e293b]"
          : "border-[#1e293b] bg-[#0f172a] hover:border-[var(--color-accent)]/40"
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-[13px] font-semibold text-white">{name}</span>
        <span className="text-[18px] font-black text-[var(--color-accent)] tabular-nums whitespace-nowrap">
          {value}
        </span>
      </div>
      <code className="block text-[10px] text-[#3bb4a4] font-mono mb-2">{formula}</code>
      <p className="text-[11px] text-[#94a3b8] leading-relaxed">{description}</p>
    </motion.div>
  );
}
