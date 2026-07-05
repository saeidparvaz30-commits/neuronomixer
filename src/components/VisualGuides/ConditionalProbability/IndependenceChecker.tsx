"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ScenarioConfig } from "./types";

interface IndependenceCheckerProps {
  scenario: ScenarioConfig;
  onChecked: () => void;
}

type Result = "independent" | "dependent" | null;

function clampProb(val: string): number | null {
  const n = parseFloat(val);
  if (isNaN(n)) return null;
  return Math.min(1, Math.max(0, n));
}

export default function IndependenceChecker({ scenario, onChecked }: IndependenceCheckerProps) {
  const { independencePrefill } = scenario;

  const [pA, setPa] = useState<string>("");
  const [pB, setPb] = useState<string>("");
  const [pAGivenB, setPaGivenB] = useState<string>("");
  const [result, setResult] = useState<Result>(null);

  const prefill = useCallback(() => {
    setPa(String(independencePrefill.pA));
    setPb(String(independencePrefill.pB));
    setPaGivenB(String(independencePrefill.pAGivenB));
    setResult(null);
  }, [independencePrefill]);

  const check = useCallback(() => {
    const a = clampProb(pA);
    const b = clampProb(pB);
    const agb = clampProb(pAGivenB);
    if (a === null || b === null || agb === null) return;

    const diff = Math.abs(agb - a);
    setResult(diff < 0.01 ? "independent" : "dependent");
    onChecked();
  }, [pA, pB, pAGivenB, onChecked]);

  const pANum = clampProb(pA);
  const pBNum = clampProb(pB);
  const pAGivenBNum = clampProb(pAGivenB);
  const canCheck = pANum !== null && pBNum !== null && pAGivenBNum !== null;

  const diff =
    pANum !== null && pAGivenBNum !== null
      ? Math.abs(pAGivenBNum - pANum)
      : null;

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8]">
          Independence Checker
        </p>
        <button
          onClick={prefill}
          className="text-[11px] text-[#3bb4a4] hover:text-white transition-colors border border-[#3bb4a4]/30 hover:border-[#3bb4a4] rounded-lg px-2.5 py-1"
        >
          Use scenario values
        </button>
      </div>

      {/* Definition reminder */}
      <div className="mb-4 p-3 rounded-xl bg-[#1e293b]/60 border border-[#1e293b] text-[11px] text-[#94a3b8] leading-relaxed">
        Two events A and B are <span className="text-white font-semibold">independent</span> if{" "}
        <span className="font-mono text-[#d4af37]">P(A|B) = P(A)</span>. Knowing B happened does not
        change the probability of A.
      </div>

      {/* Inputs */}
      <div className="space-y-3 mb-4">
        <InputRow
          label={independencePrefill.pALabel}
          hint="P(A)"
          value={pA}
          onChange={(v) => { setPa(v); setResult(null); }}
          placeholder="e.g. 0.01"
        />
        <InputRow
          label={independencePrefill.pBLabel}
          hint="P(B)"
          value={pB}
          onChange={(v) => { setPb(v); setResult(null); }}
          placeholder="e.g. 0.108"
        />
        <InputRow
          label={independencePrefill.pAGivenBLabel}
          hint="P(A|B)"
          value={pAGivenB}
          onChange={(v) => { setPaGivenB(v); setResult(null); }}
          placeholder="e.g. 0.088"
        />
      </div>

      {/* Live diff preview */}
      {diff !== null && (
        <div className="mb-3 text-[11px] font-mono text-[#94a3b8]">
          |P(A|B) − P(A)| ={" "}
          <span className={diff < 0.01 ? "text-[#3bb4a4] font-semibold" : "text-[#d4af37] font-semibold"}>
            {diff.toFixed(4)}
          </span>
          {diff < 0.01 ? (
            <span className="text-[#3bb4a4]"> &lt; 0.01 (threshold)</span>
          ) : (
            <span className="text-[#d4af37]"> ≥ 0.01 (threshold)</span>
          )}
        </div>
      )}

      {/* Button */}
      <button
        onClick={check}
        disabled={!canCheck}
        className={`w-full py-2 rounded-xl text-[13px] font-semibold transition-all ${
          canCheck
            ? "bg-[#d4af37] text-[#0a0e1a] hover:opacity-90"
            : "bg-[#1e293b] text-[#475569] cursor-not-allowed"
        }`}
      >
        Check Independence
      </button>

      {/* Result */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className={`mt-4 p-4 rounded-xl border ${
              result === "independent"
                ? "bg-[#3bb4a4]/8 border-[#3bb4a4]/30"
                : "bg-[#d4af37]/8 border-[#d4af37]/30"
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              {result === "independent" ? (
                <svg className="w-4 h-4 text-[#3bb4a4] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-[#d4af37] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span
                className={`text-[13px] font-bold ${
                  result === "independent" ? "text-[#3bb4a4]" : "text-[#d4af37]"
                }`}
              >
                Events are {result === "independent" ? "Independent" : "Dependent"}
              </span>
            </div>
            <p className="text-[11px] text-[#94a3b8] leading-snug">
              {result === "independent"
                ? "P(A|B) ≈ P(A). Knowing event B occurred does not change the probability of A. The events have no influence on each other."
                : "P(A|B) ≠ P(A). Knowing event B occurred changes the probability of A. The events are linked — this is the core of conditional probability."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Input row ─────────────────────────────────────────────────────────────────

interface InputRowProps {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}

function InputRow({ label, hint, value, onChange, placeholder }: InputRowProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <label className="block text-[10px] font-semibold text-[#94a3b8] mb-0.5 truncate">
          {hint}: {label}
        </label>
        <input
          type="number"
          min={0}
          max={1}
          step={0.001}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-1.5 text-[13px] text-white font-mono
            placeholder-[#475569] focus:outline-none focus:border-[#d4af37]/60 transition-colors"
        />
      </div>
    </div>
  );
}
