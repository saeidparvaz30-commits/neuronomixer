"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FormulaType } from "./types";

interface SummationVisualizerProps {
  onAdjust: () => void;
}

function evalFormula(formula: FormulaType, i: number): number {
  switch (formula) {
    case "i":
      return i;
    case "i2":
      return i * i;
    case "2i+1":
      return 2 * i + 1;
  }
}

function formulaLabel(formula: FormulaType): string {
  switch (formula) {
    case "i":
      return "i";
    case "i2":
      return "i²";
    case "2i+1":
      return "2i+1";
  }
}

function closedFormNote(formula: FormulaType, n: number): string {
  switch (formula) {
    case "i":
      return `= n(n+1)/2 = ${n}×${n + 1}/2 = ${(n * (n + 1)) / 2}`;
    case "i2":
      return `= n(n+1)(2n+1)/6 = ${(n * (n + 1) * (2 * n + 1)) / 6}`;
    case "2i+1":
      return `= n(n+2) = ${n}×${n + 2} = ${n * (n + 2)}`;
  }
}

export default function SummationVisualizer({ onAdjust }: SummationVisualizerProps) {
  const [n, setN] = useState(5);
  const [formula, setFormula] = useState<FormulaType>("2i+1");
  const [expanded, setExpanded] = useState(false);
  const [visibleTerms, setVisibleTerms] = useState(0);

  function handleN(val: number) {
    setN(val);
    setExpanded(false);
    setVisibleTerms(0);
    onAdjust();
  }

  function handleFormula(val: FormulaType) {
    setFormula(val);
    setExpanded(false);
    setVisibleTerms(0);
    onAdjust();
  }

  function handleExpand() {
    if (expanded) {
      setExpanded(false);
      setVisibleTerms(0);
    } else {
      setExpanded(true);
      setVisibleTerms(0);
      // Animate terms in one by one
      let count = 0;
      const interval = setInterval(() => {
        count++;
        setVisibleTerms(count);
        if (count >= n) clearInterval(interval);
      }, 200);
    }
    onAdjust();
  }

  const terms = Array.from({ length: n }, (_, k) => evalFormula(formula, k + 1));
  const total = terms.reduce((a, b) => a + b, 0);
  const runningSum = terms.slice(0, visibleTerms).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-2">
            Upper Limit N = {n}
          </label>
          <input
            type="range"
            min={3}
            max={20}
            step={1}
            value={n}
            onChange={(e) => handleN(Number(e.target.value))}
            className="w-full accent-[#d4af37] h-1"
          />
          <div className="flex justify-between text-[10px] text-[#334155] mt-0.5">
            <span>3</span><span>20</span>
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-2">
            Formula
          </label>
          <div className="flex gap-2">
            {(["i", "i2", "2i+1"] as FormulaType[]).map((f) => (
              <button
                key={f}
                onClick={() => handleFormula(f)}
                className={`px-4 py-1.5 rounded-lg text-sm font-mono font-semibold transition-all border ${
                  formula === f
                    ? "bg-[#d4af37] text-[#0a0e1a] border-[#d4af37]"
                    : "border-[#1e293b] text-[#94a3b8] hover:border-[#d4af37] hover:text-[#d4af37]"
                }`}
              >
                {formulaLabel(f)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sigma notation */}
      <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-5">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-1 text-white">
            <div className="flex flex-col items-center leading-none mr-1">
              <span className="text-[18px] text-[#d4af37] font-bold">N={n}</span>
              <span className="text-[28px] font-black text-[#d4af37]">Σ</span>
              <span className="text-[12px] text-[#d4af37]">i=1</span>
            </div>
            <span className="text-xl font-mono text-white">({formulaLabel(formula)})</span>
          </div>
          <span className="text-[#94a3b8] text-xl">=</span>
          {expanded ? (
            <AnimatePresence>
              <div className="flex flex-wrap items-center gap-1">
                {terms.slice(0, visibleTerms).map((t, idx) => (
                  <motion.span
                    key={idx}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.18 }}
                    className="text-base font-mono text-white"
                  >
                    {idx > 0 && <span className="text-[#3bb4a4] mx-1">+</span>}
                    <span className="text-[#d4af37]">{t}</span>
                  </motion.span>
                ))}
                {visibleTerms >= n && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-base font-mono text-white ml-1"
                  >
                    <span className="text-[#94a3b8] mx-1">=</span>
                    <span className="font-bold text-[#3bb4a4] text-lg">{total}</span>
                  </motion.span>
                )}
                {visibleTerms < n && visibleTerms > 0 && (
                  <span className="text-sm text-[#94a3b8] ml-1">
                    (running: {runningSum})
                  </span>
                )}
              </div>
            </AnimatePresence>
          ) : (
            <span className="text-[#475569] text-sm italic">click Expand to see terms</span>
          )}
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={handleExpand}
            className="px-4 py-1.5 rounded-xl text-sm font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            {expanded ? "Reset" : "Expand"}
          </button>
          {expanded && visibleTerms >= n && (
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl border border-[#3bb4a4]/30 bg-[#3bb4a4]/5">
              <span className="text-[12px] text-[#94a3b8] font-mono">{closedFormNote(formula, n)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Visual term bars */}
      <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-4">
        <p className="text-[10px] uppercase tracking-widest text-[#475569] mb-3">Term values</p>
        <div className="flex items-end gap-1.5 overflow-x-auto" style={{ height: 100 }}>
          {terms.map((t, i) => {
            const maxT = Math.max(...terms);
            const h = maxT > 0 ? Math.round((t / maxT) * 80) : 4;
            const isVisible = i < visibleTerms;
            return (
              <div key={i} className="flex flex-col items-center gap-0.5 flex-1 min-w-[24px]">
                <div
                  className="w-full rounded-t transition-all duration-300"
                  style={{
                    height: h,
                    background: isVisible ? "#d4af37cc" : "#1e293b",
                    marginTop: "auto",
                  }}
                />
                <span className="text-[9px] text-[#475569]">{i + 1}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Explanation */}
      <div className="rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-4">
        <p className="text-[13px] text-[#94a3b8] leading-relaxed">
          <span className="font-semibold text-white">Sigma (Σ) is just shorthand for &ldquo;add these up.&rdquo;</span>{" "}
          Start with i=1, plug into the formula, add. Repeat until i=N. For example:{" "}
          <span className="font-mono text-[#d4af37]">Σ(i=1 to 5)(2i+1) = 3+5+7+9+11 = 35</span>.
        </p>
      </div>
    </div>
  );
}
