"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import StatCard from "./StatCard";

interface ToggleRobustAlternativesProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  trimmedMean: number;
  mad: number;
}

export default function ToggleRobustAlternatives({
  checked,
  onChange,
  trimmedMean,
  mad,
}: ToggleRobustAlternativesProps) {
  return (
    <div className="mt-4">
      <label className="flex items-center gap-2.5 cursor-pointer select-none group w-fit">
        <div
          className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
            checked ? "bg-[#3bb4a4]" : "bg-[#1e293b]"
          }`}
          onClick={() => onChange(!checked)}
          role="checkbox"
          aria-checked={checked}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") onChange(!checked);
          }}
        >
          <div
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
              checked ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </div>
        <span className="text-[12px] text-[#94a3b8] group-hover:text-white transition-colors">
          Show robust statistics (Trimmed Mean &amp; MAD)
        </span>
      </label>

      <AnimatePresence>
        {checked && (
          <motion.div
            key="robust-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-4 p-4 rounded-2xl border border-[#3bb4a4]/30 bg-[#1e293b]/50">
              <p className="text-[11px] text-[#94a3b8] mb-4 leading-relaxed">
                Try dragging the $150k person to $500k. Watch mean/SD skyrocket,
                but trimmed mean/MAD barely budge — they{" "}
                <span className="text-[#3bb4a4]">ignore</span> extreme values.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <StatCard
                  name="Trimmed Mean (10%)"
                  formula="mean(x[2..n-2])"
                  value={`$${trimmedMean.toFixed(1)}k`}
                  description="Remove bottom+top 10% of values, then average the rest. Robust to outliers."
                />
                <StatCard
                  name="MAD"
                  formula="median(|x - M|)"
                  value={`$${mad.toFixed(1)}k`}
                  description="Median Absolute Deviation — robust measure of spread, insensitive to extreme values."
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
