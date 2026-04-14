"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  CAMPAIGN_A_DATA, CAMPAIGN_B_DATA,
  runIndependentTTest, levenesTest, mean, stdDev,
  type TTestResult,
} from "./types";
import ResultsPanel from "./ResultsPanel";

interface Props {
  onTestRun: () => void;
  onAssumptionChecked: () => void;
}

// ── Jitter scatter ─────────────────────────────────────────────────────────────
function JitterScatter({ a, b }: { a: number[]; b: number[] }) {
  const all = [...a, ...b];
  const mn = Math.min(...all) - 0.5, mx = Math.max(...all) + 0.5;
  const W = 300, H = 160;
  const PAD = { l: 24, r: 24, t: 12, b: 30 };
  const IH = H - PAD.t - PAD.b;
  const ty = (v: number) => PAD.t + IH - ((v - mn) / (mx - mn)) * IH;

  const jitter = (seed: number) => (((seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 28;
  const aX = W * 0.3, bX = W * 0.7;
  const aMean = mean(a), bMean = mean(b);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {/* Axis */}
      <line x1={PAD.l} y1={PAD.t + IH} x2={W - PAD.r} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />

      {/* Group A points */}
      {a.map((v, i) => (
        <circle key={`a${i}`} cx={aX + jitter(i * 7 + 1)} cy={ty(v)} r="3"
          fill="#1e5d8a" opacity="0.7" />
      ))}
      {/* Group B points */}
      {b.map((v, i) => (
        <circle key={`b${i}`} cx={bX + jitter(i * 11 + 3)} cy={ty(v)} r="3"
          fill="#3bb4a4" opacity="0.7" />
      ))}
      {/* Mean lines */}
      <line x1={aX - 14} y1={ty(aMean)} x2={aX + 14} y2={ty(aMean)}
        stroke="#1e5d8a" strokeWidth="2.5" />
      <line x1={bX - 14} y1={ty(bMean)} x2={bX + 14} y2={ty(bMean)}
        stroke="#3bb4a4" strokeWidth="2.5" />

      {/* Labels */}
      <text x={aX} y={H - 6} textAnchor="middle" fill="#1e5d8a" fontSize="9" fontWeight="600">
        Campaign A
      </text>
      <text x={bX} y={H - 6} textAnchor="middle" fill="#3bb4a4" fontSize="9" fontWeight="600">
        Campaign B
      </text>
      {/* Y ticks */}
      {[mn + 0.5, (mn + mx) / 2, mx - 0.5].map((v, i) => (
        <text key={i} x={PAD.l - 2} y={ty(v) + 3} textAnchor="end" fill="#475569" fontSize="7">
          {v.toFixed(1)}
        </text>
      ))}
    </svg>
  );
}

export default function IndependentSampleScenario({ onTestRun, onAssumptionChecked }: Props) {
  const [result, setResult] = useState<TTestResult | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [leveneShown, setLeveneShown] = useState(false);
  const [leveneResult, setLeveneResult] = useState<{ pValue: number; equalVariance: boolean } | null>(null);

  const showLevene = () => {
    const lr = levenesTest(CAMPAIGN_A_DATA, CAMPAIGN_B_DATA);
    setLeveneResult(lr);
    setLeveneShown(true);
    onAssumptionChecked();
  };

  const runTest = () => {
    const lr = leveneResult ?? levenesTest(CAMPAIGN_A_DATA, CAMPAIGN_B_DATA);
    if (!leveneResult) {
      setLeveneResult(lr);
      setLeveneShown(true);
      onAssumptionChecked();
    }
    const r = runIndependentTTest(CAMPAIGN_A_DATA, CAMPAIGN_B_DATA, lr.equalVariance);
    setResult(r);
    if (!hasRun) {
      setHasRun(true);
      onTestRun();
    }
  };

  const mA = mean(CAMPAIGN_A_DATA).toFixed(2);
  const mB = mean(CAMPAIGN_B_DATA).toFixed(2);
  const sA = stdDev(CAMPAIGN_A_DATA).toFixed(2);
  const sB = stdDev(CAMPAIGN_B_DATA).toFixed(2);
  const testType = leveneResult ? (leveneResult.equalVariance ? "Student's t-test" : "Welch's t-test") : "—";

  return (
    <div className="space-y-5">
      {/* Context */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#3bb4a4]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-[#3bb4a4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-1">Scenario</p>
            <h3 className="text-[15px] font-bold text-white mb-1">Marketing Campaign Comparison</h3>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              Two email campaigns were tested on separate groups of 25 customers each.
              Did Campaign A generate significantly more clicks (%) than Campaign B?
            </p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: "Campaign A (n=25)", m: mA, s: sA, color: "#1e5d8a" },
            { label: "Campaign B (n=25)", m: mB, s: sB, color: "#3bb4a4" },
          ].map(({ label, m: mv, s: sv, color }) => (
            <div key={label} className="rounded-xl border border-[#1e293b] p-3">
              <p className="text-[9px] text-[#475569] mb-1.5 font-semibold">{label}</p>
              <p className="text-[12px] font-mono text-white">x̄ = <span style={{ color }}>{mv}%</span></p>
              <p className="text-[12px] font-mono text-white mt-0.5">s = <span style={{ color }}>{sv}</span></p>
            </div>
          ))}
        </div>

        {/* H0/H1 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl border border-[#1e293b] p-3">
            <p className="text-[9px] text-[#475569] mb-1 font-semibold">H₀ (Null)</p>
            <p className="text-[12px] font-mono text-[#94a3b8]">μ_A = μ_B</p>
          </div>
          <div className="rounded-xl border border-[#1e293b] p-3">
            <p className="text-[9px] text-[#475569] mb-1 font-semibold">H₁ (Alternative)</p>
            <p className="text-[12px] font-mono text-[#94a3b8]">μ_A ≠ μ_B</p>
          </div>
        </div>

        {/* Scatter plot */}
        <div className="mb-4">
          <p className="text-[10px] text-[#475569] mb-2 font-semibold">Data distribution (jittered)</p>
          <JitterScatter a={CAMPAIGN_A_DATA} b={CAMPAIGN_B_DATA} />
        </div>

        {/* Levene's test */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-[#475569] font-semibold">
              Step 1: Check equal variance (Levene&apos;s test)
            </p>
            {!leveneShown && (
              <motion.button
                onClick={showLevene}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="px-3 py-1.5 rounded-xl text-[11px] font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
              >
                Run Levene&apos;s Test
              </motion.button>
            )}
          </div>

          {leveneResult && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border p-3 flex items-center justify-between"
              style={{
                borderColor: (leveneResult.equalVariance ? "#3bb4a4" : "#d4af37") + "40",
                background: (leveneResult.equalVariance ? "#3bb4a4" : "#d4af37") + "10",
              }}
            >
              <div>
                <p className="text-[11px] font-mono text-white">
                  Levene p = {leveneResult.pValue.toFixed(4)}
                </p>
                <p className="text-[10px] text-[#94a3b8] mt-0.5">
                  {leveneResult.equalVariance ? "Equal variances assumed" : "Unequal variances — Welch's t-test recommended"}
                </p>
              </div>
              <span
                className="text-[11px] font-semibold px-2 py-1 rounded-lg"
                style={{ color: leveneResult.equalVariance ? "#3bb4a4" : "#d4af37" }}
              >
                {testType}
              </span>
            </motion.div>
          )}

          {!leveneShown && (
            <p className="text-[11px] text-[#475569] italic">
              Run Levene&apos;s test to determine which t-test variant to use.
            </p>
          )}
        </div>

        <motion.button
          onClick={runTest}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          className="w-full py-2.5 rounded-xl text-[13px] font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity"
        >
          Run Independent t-Test
        </motion.button>
      </div>

      {/* Results */}
      <ResultsPanel result={result} nullValue={0} group1Name="Campaign A" group2Name="Campaign B" />

      {/* Explainer */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">Formula</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#1e293b]/50 p-3 text-center">
            <p className="text-[10px] text-[#475569] mb-1">Student&apos;s (equal variance)</p>
            <p className="text-[12px] font-mono text-white">t = (x̄₁ − x̄₂) / (sₚ √(1/n₁ + 1/n₂))</p>
          </div>
          <div className="rounded-xl bg-[#1e293b]/50 p-3 text-center">
            <p className="text-[10px] text-[#475569] mb-1">Welch&apos;s (unequal variance)</p>
            <p className="text-[12px] font-mono text-white">t = (x̄₁ − x̄₂) / √(s₁²/n₁ + s₂²/n₂)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
