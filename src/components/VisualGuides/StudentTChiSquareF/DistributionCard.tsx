"use client";

import React from "react";
import { motion } from "framer-motion";

interface DistributionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  bullets: string[];
  example: string;
  insightBadge: string;
  accentColor: string;
  index?: number;
}

export default function DistributionCard({
  icon,
  title,
  description,
  bullets,
  example,
  insightBadge,
  accentColor,
  index = 0,
}: DistributionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: accentColor + "22" }}
        >
          <span style={{ color: accentColor }}>{icon}</span>
        </div>
        <div>
          <h3 className="text-[13px] font-bold text-white leading-snug">{title}</h3>
          <p className="text-[11px] text-[#94a3b8] mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>

      {/* Bullets */}
      <ul className="space-y-1.5 pl-1">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-[11px] text-[#94a3b8]">
            <span
              className="mt-[3px] w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: accentColor }}
            />
            {b}
          </li>
        ))}
      </ul>

      {/* Example */}
      <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] px-3.5 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-1">
          Example
        </p>
        <p className="text-[11px] text-[#94a3b8] leading-relaxed">{example}</p>
      </div>

      {/* Key insight badge */}
      <div className="flex">
        <span
          className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
          style={{
            background: accentColor + "22",
            color: accentColor,
            border: `1px solid ${accentColor}44`,
          }}
        >
          {insightBadge}
        </span>
      </div>
    </motion.div>
  );
}
