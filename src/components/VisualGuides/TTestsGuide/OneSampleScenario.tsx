"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { FACTORY_DATA, runOneSampleTTest, type TTestResult } from "./types";
import AssumptionChecker from "./AssumptionChecker";
import ResultsPanel from "./ResultsPanel";

interface Props {
  onTestRun: () => void;
  onAssumptionChecked: () => void;
}

export default function OneSampleScenario({ onTestRun, onAssumptionChecked }: Props) {
  const [targetMean, setTargetMean] = useState(500);
  const [result, setResult] = useState<TTestResult | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const runTest = () => {
    const r = runOneSampleTTest(FACTORY_DATA, targetMean);
    setResult(r);
    if (!hasRun) {
      setHasRun(true);
      onTestRun();
    }
  };

  const dataMean = (FACTORY_DATA.reduce((a, b) => a + b, 0) / FACTORY_DATA.length).toFixed(2);
  const displayRows = FACTORY_DATA.slice(0, 10);

  return (
    <div className="space-y-5">
      {/* Context card */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#1e5d8a]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-[#1e5d8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-1">Scenario</p>
            <h3 className="text-[15px] font-bold text-white mb-1">Factory Output Quality Control</h3>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              A factory targets 500 units/hour. We sampled 30 hours of production.
              Is the true mean significantly different from the target?
            </p>
          </div>
        </div>

        {/* Hypothesis block */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl border border-[#1e293b] p-3">
            <p className="text-[9px] text-[#475569] mb-1 font-semibold">H₀ (Null)</p>
            <p className="text-[13px] font-mono text-[#94a3b8]">μ = {targetMean}</p>
          </div>
          <div className="rounded-xl border border-[#1e293b] p-3">
            <p className="text-[9px] text-[#475569] mb-1 font-semibold">H₁ (Alternative)</p>
            <p className="text-[13px] font-mono text-[#94a3b8]">μ ≠ {targetMean}</p>
          </div>
        </div>

        {/* Target input */}
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <span className="text-[11px] text-white">Target mean (μ₀)</span>
            <span className="text-[11px] font-mono text-[#d4af37]">{targetMean}</span>
          </div>
          <input
            type="range" min={480} max={520} step={1} value={targetMean}
            onChange={e => { setTargetMean(Number(e.target.value)); setResult(null); setHasRun(false); }}
            className="w-full" style={{ accentColor: "#d4af37" }}
          />
        </div>

        {/* Data preview */}
        <div className="mb-4">
          <p className="text-[11px] font-semibold text-[#475569] mb-2">
            Factory data (n=30, x̄={dataMean})
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[#1e293b]">
                  <th className="text-left py-1 pr-4 text-[#475569] font-semibold">Obs</th>
                  <th className="text-right py-1 text-[#475569] font-semibold">Units/hr</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((v, i) => (
                  <tr key={i} className="border-b border-[#1e293b]/50">
                    <td className="py-1 pr-4 text-[#475569]">{i + 1}</td>
                    <td className="py-1 text-right font-mono text-white">{v}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-1 text-[#475569] italic" colSpan={2}>
                    …and 20 more observations
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <motion.button
          onClick={runTest}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          className="w-full py-2.5 rounded-xl text-[13px] font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity"
        >
          Run One-Sample t-Test (H₀: μ = {targetMean})
        </motion.button>
      </div>

      {/* Assumption checker */}
      <AssumptionChecker
        data={FACTORY_DATA}
        title="Normality check — factory output data"
        onChecked={onAssumptionChecked}
      />

      {/* Results */}
      <ResultsPanel result={result} nullValue={targetMean} group1Name="Factory" group2Name={`target (${targetMean})`} />

      {/* Formula explainer */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">Formula</p>
        <div className="rounded-xl bg-[#1e293b]/50 p-4 text-center">
          <p className="text-[14px] font-mono text-white mb-1">
            t = (x̄ − μ₀) / (s / √n)
          </p>
          <p className="text-[11px] text-[#94a3b8]">
            degrees of freedom = n − 1 = {FACTORY_DATA.length - 1}
          </p>
        </div>
      </div>
    </div>
  );
}
