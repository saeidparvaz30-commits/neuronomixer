"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Measure {
  name: string;
  small: string;
  medium: string;
  large: string;
  formula: string;
  context: string;
}

const MEASURES: Measure[] = [
  {
    name: "Cohen's d",
    small: "0.2",
    medium: "0.5",
    large: "0.8",
    formula: "(μ₁ − μ₂) / σ_pooled",
    context: "Mean difference between two groups (continuous outcomes)",
  },
  {
    name: "Pearson r",
    small: "0.10",
    medium: "0.30",
    large: "0.50",
    formula: "Σ(x−x̄)(y−ȳ) / (nσ_xσ_y)",
    context: "Correlation between two continuous variables",
  },
  {
    name: "Eta-squared (η²)",
    small: "0.01",
    medium: "0.06",
    large: "0.14",
    formula: "SS_between / SS_total",
    context: "ANOVA — proportion of variance explained",
  },
  {
    name: "Cramér's V",
    small: "0.10",
    medium: "0.30",
    large: "0.50",
    formula: "√(χ² / (n · (k−1)))",
    context: "Association between two categorical variables",
  },
];

export default function EffectSizeMeasures() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-[#1e293b]/30 transition-colors"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">
          Effect Size Measures Reference
        </p>
        <motion.svg
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-4 h-4 text-[#475569]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="table"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <div className="overflow-x-auto rounded-xl border border-[#1e293b]">
                <table className="w-full text-[10px] min-w-[480px]">
                  <thead>
                    <tr className="bg-[#d4af37]/10">
                      <th className="px-3 py-2.5 text-left text-[#d4af37] font-semibold">
                        Measure
                      </th>
                      <th className="px-3 py-2.5 text-center text-[#d4af37] font-semibold">
                        Small
                      </th>
                      <th className="px-3 py-2.5 text-center text-[#d4af37] font-semibold">
                        Medium
                      </th>
                      <th className="px-3 py-2.5 text-center text-[#d4af37] font-semibold">
                        Large
                      </th>
                      <th className="px-3 py-2.5 text-left text-[#d4af37] font-semibold">
                        Formula
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {MEASURES.map((m, i) => (
                      <tr
                        key={m.name}
                        className={`border-t border-[#1e293b] ${
                          i % 2 === 0 ? "bg-transparent" : "bg-[#1e293b]/20"
                        }`}
                      >
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-white">{m.name}</p>
                          <p className="text-[9px] text-[#475569] mt-0.5">{m.context}</p>
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono text-[#3bb4a4]">
                          {m.small}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono text-[#d4af37]">
                          {m.medium}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono text-[#ef4444]">
                          {m.large}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[#94a3b8] text-[9px]">
                          {m.formula}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-3 text-[10px] text-[#475569] leading-relaxed">
                Cohen&apos;s conventions are rules of thumb. Context matters — a &quot;small&quot; effect
                in epidemiology can be highly practically significant when applied to large
                populations.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
