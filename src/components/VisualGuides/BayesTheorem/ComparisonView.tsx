"use client";

import React from "react";
import { motion } from "framer-motion";

interface ComparisonViewProps {
  intuition: number; // 0-100
  posterior: number; // 0-1
  sensitivity: number; // 0-1
}

export default function ComparisonView({ intuition, posterior, sensitivity }: ComparisonViewProps) {
  const posteriorPct = parseFloat((posterior * 100).toFixed(2));
  const diff = Math.abs(intuition - posteriorPct);
  const isClose = diff <= 5;

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6 space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-1">
          Intuition vs. Reality
        </p>
        <h2 className="text-[15px] font-bold text-white">How close was your guess?</h2>
      </div>

      {/* Two-column card */}
      <div className="grid grid-cols-2 gap-3">
        {/* Intuition */}
        <div className="rounded-xl border border-[#1e293b] bg-[#1e293b]/30 p-4 text-center space-y-1">
          <p className="text-[9px] uppercase tracking-[1.5px] text-[#475569]">Your Intuition</p>
          <p className="text-[38px] font-black text-[#8b5cf6] leading-none">{intuition}%</p>
          <p className="text-[9px] text-[#475569]">your initial guess</p>
        </div>

        {/* Calculation */}
        <div
          className="rounded-xl border p-4 text-center space-y-1"
          style={{ borderColor: "#d4af3750", background: "#d4af3710" }}
        >
          <p className="text-[9px] uppercase tracking-[1.5px] text-[#475569]">The Calculation</p>
          <motion.p
            key={posteriorPct}
            className="text-[38px] font-black text-[#d4af37] leading-none"
            initial={{ scale: 0.9, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {posteriorPct}%
          </motion.p>
          <p className="text-[9px] text-[#475569]">Bayes theorem</p>
        </div>
      </div>

      {/* Arrow + difference */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-3 text-[13px]">
          <span className="font-bold text-[#8b5cf6]">{intuition}%</span>
          <svg
            viewBox="0 0 40 16"
            width={40}
            height={16}
            className="flex-shrink-0 text-[#334155]"
            fill="none"
          >
            <line x1="2" y1="8" x2="34" y2="8" stroke="currentColor" strokeWidth="1.5" />
            <polyline points="28,3 38,8 28,13" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
          <span className="font-bold text-[#d4af37]">{posteriorPct}%</span>
        </div>

        {isClose ? (
          <div className="rounded-xl border border-[#3bb4a4]/40 bg-[#3bb4a4]/10 px-4 py-2 text-center">
            <p className="text-[12px] font-semibold text-[#3bb4a4]">
              Great intuition! You were within {diff.toFixed(1)} percentage points.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 px-4 py-2 text-center space-y-1">
            <p className="text-[12px] font-semibold text-white">
              You were off by{" "}
              <span className="text-[#d4af37]">{diff.toFixed(1)} percentage points</span>
            </p>
            <p className="text-[10px] text-[#94a3b8] leading-relaxed">
              {intuition > posteriorPct
                ? "Most people overestimate — this is the base rate neglect effect."
                : "The math reveals a higher risk than intuition suggests."}
            </p>
          </div>
        )}
      </div>

      {/* Insight */}
      <div className="rounded-xl border border-[#1e293b] p-3">
        <p className="text-[10px] text-[#94a3b8] leading-relaxed">
          <span className="text-[#d4af37] font-semibold">Why the gap?</span> When a condition is
          rare, even an accurate test produces far more false positives than true positives. The
          sensitivity ({(sensitivity * 100).toFixed(0)}%) describes how often the test catches
          people who truly have the condition. It is NOT the probability that a positive result
          means you have it. That probability is the posterior: {posteriorPct}%.
        </p>
      </div>
    </div>
  );
}
