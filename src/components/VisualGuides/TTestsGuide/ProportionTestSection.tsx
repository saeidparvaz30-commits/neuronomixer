"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { runProportionTest, type ProportionTestResult } from "./types";

interface Props {
  onTestRun: () => void;
}

// ── Proportion bar with CI ─────────────────────────────────────────────────────
function ProportionBars({
  p1, n1, x1,
  p2, n2, x2,
}: {
  p1: number; n1: number; x1: number;
  p2: number; n2: number; x2: number;
}) {
  const se1 = Math.sqrt(p1 * (1 - p1) / n1);
  const se2 = Math.sqrt(p2 * (1 - p2) / n2);
  const ci1L = Math.max(0, p1 - 1.96 * se1);
  const ci1U = Math.min(1, p1 + 1.96 * se1);
  const ci2L = Math.max(0, p2 - 1.96 * se2);
  const ci2U = Math.min(1, p2 + 1.96 * se2);

  const W = 300, H = 160;
  const PAD = { l: 50, r: 24, t: 16, b: 28 };
  const IW = W - PAD.l - PAD.r, IH = H - PAD.t - PAD.b;
  const scale = (v: number) => PAD.l + v * IW;
  const barH = 24, gap = 12;
  const y1 = PAD.t + (IH - (2 * barH + gap)) / 2;
  const y2 = y1 + barH + gap;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />
      <line x1={PAD.l} y1={PAD.t + IH} x2={PAD.l + IW} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />

      {/* Treatment bar */}
      <rect x={PAD.l} y={y1} width={p1 * IW} height={barH} fill="#1e5d8a" opacity="0.8" rx="2" />
      {/* CI error bar */}
      <line x1={scale(ci1L)} y1={y1 + barH / 2} x2={scale(ci1U)} y2={y1 + barH / 2}
        stroke="white" strokeWidth="1.5" />
      <line x1={scale(ci1L)} y1={y1 + 4} x2={scale(ci1L)} y2={y1 + barH - 4}
        stroke="white" strokeWidth="1.5" />
      <line x1={scale(ci1U)} y1={y1 + 4} x2={scale(ci1U)} y2={y1 + barH - 4}
        stroke="white" strokeWidth="1.5" />

      {/* Control bar */}
      <rect x={PAD.l} y={y2} width={p2 * IW} height={barH} fill="#3bb4a4" opacity="0.8" rx="2" />
      <line x1={scale(ci2L)} y1={y2 + barH / 2} x2={scale(ci2U)} y2={y2 + barH / 2}
        stroke="white" strokeWidth="1.5" />
      <line x1={scale(ci2L)} y1={y2 + 4} x2={scale(ci2L)} y2={y2 + barH - 4}
        stroke="white" strokeWidth="1.5" />
      <line x1={scale(ci2U)} y1={y2 + 4} x2={scale(ci2U)} y2={y2 + barH - 4}
        stroke="white" strokeWidth="1.5" />

      {/* Labels */}
      <text x={PAD.l - 4} y={y1 + barH / 2 + 4} textAnchor="end" fill="#1e5d8a" fontSize="10" fontWeight="600">
        Treat
      </text>
      <text x={PAD.l - 4} y={y2 + barH / 2 + 4} textAnchor="end" fill="#3bb4a4" fontSize="10" fontWeight="600">
        Control
      </text>
      <text x={scale(p1) + 4} y={y1 + barH / 2 + 4} fill="white" fontSize="10">
        {(p1 * 100).toFixed(1)}%
      </text>
      <text x={scale(p2) + 4} y={y2 + barH / 2 + 4} fill="white" fontSize="10">
        {(p2 * 100).toFixed(1)}%
      </text>
      <text x={PAD.l - 2} y={H - 6} textAnchor="end" fill="#475569" fontSize="10">0%</text>
      <text x={scale(0.5)} y={H - 6} textAnchor="middle" fill="#475569" fontSize="10">50%</text>
      <text x={scale(1)} y={H - 6} textAnchor="middle" fill="#475569" fontSize="10">100%</text>
      <text x={scale(0.25)} y={H - 6} textAnchor="middle" fill="#475569" fontSize="10">25%</text>
      <text x={scale(0.75)} y={H - 6} textAnchor="middle" fill="#475569" fontSize="10">75%</text>
    </svg>
  );
}

export default function ProportionTestSection({ onTestRun }: Props) {
  const [x1, setX1] = useState(45);
  const [n1, setN1] = useState(200);
  const [x2, setX2] = useState(35);
  const [n2, setN2] = useState(200);
  const [result, setResult] = useState<ProportionTestResult | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const p1 = x1 / n1, p2 = x2 / n2;

  const runTest = () => {
    const r = runProportionTest(x1, n1, x2, n2);
    setResult(r);
    if (!hasRun) {
      setHasRun(true);
      onTestRun();
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#1e5d8a]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-[#1e5d8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-1">Scenario</p>
            <h3 className="text-[15px] font-bold text-white mb-1">A/B Conversion Rate Test</h3>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              Two landing pages (treatment vs. control) were shown to different visitors.
              Is there a significant difference in conversion rates?
            </p>
          </div>
        </div>

        {/* H0/H1 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl border border-[#1e293b] p-3">
            <p className="text-[9px] text-[#475569] mb-1 font-semibold">H₀ (Null)</p>
            <p className="text-[12px] font-mono text-[#94a3b8]">p₁ = p₂</p>
          </div>
          <div className="rounded-xl border border-[#1e293b] p-3">
            <p className="text-[9px] text-[#475569] mb-1 font-semibold">H₁ (Alternative)</p>
            <p className="text-[12px] font-mono text-[#94a3b8]">p₁ ≠ p₂</p>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {/* Treatment */}
          <div className="rounded-xl border border-[#1e293b] p-3">
            <p className="text-[10px] text-[#1e5d8a] font-semibold mb-3">Treatment Group</p>
            {[
              { label: "Conversions (x₁)", value: x1, min: 1, max: Math.min(200, n1 - 1), step: 1, set: setX1 },
              { label: "Sample size (n₁)", value: n1, min: 50, max: 500, step: 10, set: setN1 },
            ].map(({ label, value, min, max, step, set }) => (
              <div key={label} className="mb-2.5">
                <div className="flex justify-between mb-1">
                  <span className="text-[11px] text-white">{label}</span>
                  <span className="text-[11px] font-mono text-[#1e5d8a]">{value}</span>
                </div>
                <input type="range" min={min} max={max} step={step} value={value} aria-label={label}
                  onChange={e => { set(Number(e.target.value)); setResult(null); setHasRun(false); }}
                  className="w-full" style={{ accentColor: "#1e5d8a" }} />
              </div>
            ))}
            <p className="text-[12px] font-mono text-center mt-2 text-white">
              p̂₁ = {(p1 * 100).toFixed(1)}%
            </p>
          </div>

          {/* Control */}
          <div className="rounded-xl border border-[#1e293b] p-3">
            <p className="text-[10px] text-[#3bb4a4] font-semibold mb-3">Control Group</p>
            {[
              { label: "Conversions (x₂)", value: x2, min: 1, max: Math.min(200, n2 - 1), step: 1, set: setX2 },
              { label: "Sample size (n₂)", value: n2, min: 50, max: 500, step: 10, set: setN2 },
            ].map(({ label, value, min, max, step, set }) => (
              <div key={label} className="mb-2.5">
                <div className="flex justify-between mb-1">
                  <span className="text-[11px] text-white">{label}</span>
                  <span className="text-[11px] font-mono text-[#3bb4a4]">{value}</span>
                </div>
                <input type="range" min={min} max={max} step={step} value={value} aria-label={label}
                  onChange={e => { set(Number(e.target.value)); setResult(null); setHasRun(false); }}
                  className="w-full" style={{ accentColor: "#3bb4a4" }} />
              </div>
            ))}
            <p className="text-[12px] font-mono text-center mt-2 text-white">
              p̂₂ = {(p2 * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Proportion bars */}
        <div className="mb-4">
          <p className="text-[10px] text-[#475569] mb-2 font-semibold">
            Conversion rates with 95% CI error bars
          </p>
          <ProportionBars p1={p1} n1={n1} x1={x1} p2={p2} n2={n2} x2={x2} />
        </div>

        <motion.button
          onClick={runTest}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          className="w-full py-2.5 rounded-xl text-[13px] font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
        >
          Run Test for Proportions
        </motion.button>
      </div>

      {/* Proportion results */}
      <AnimatePresence>
        {result && (
          <motion.div
            key="prop-results"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 space-y-4"
          >
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">Test Results</p>
              <span className={`px-3 py-1 rounded-lg text-[12px] font-bold border ${
                result.significant
                  ? "border-[#3bb4a4]/40 bg-[#3bb4a4]/10 text-[#3bb4a4]"
                  : "border-white/10 bg-white/5 text-[#94a3b8]"
              }`}>
                {result.significant ? "Reject H\u2080" : "Fail to Reject H\u2080"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "z-statistic", value: result.zStatistic.toFixed(3), color: "var(--color-accent)" },
                { label: "p-value", value: result.pValue < 0.001 ? "< 0.001" : result.pValue.toFixed(4), color: result.significant ? "#3bb4a4" : "#ef4444" },
                { label: "Difference (p̂₁−p̂₂)", value: ((p1 - p2) * 100).toFixed(2) + "%", color: "#1e5d8a" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl border border-[#1e293b] p-3 text-center">
                  <p className="text-[9px] text-[#475569] mb-1">{label}</p>
                  <p className="text-[20px] font-black font-mono" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>

            {/* CI for difference */}
            <div>
              <p className="text-[10px] text-[#475569] mb-2 font-semibold">
                95% CI for proportion difference: [{(result.ciLower * 100).toFixed(2)}%, {(result.ciUpper * 100).toFixed(2)}%]
              </p>
              <div className="rounded-xl bg-[#1e293b]/30 p-3">
                <svg viewBox="0 0 300 40" width="100%">
                  {(() => {
                    const lo = result.ciLower, hi = result.ciUpper;
                    const span = Math.max(Math.abs(hi - lo) * 1.6, 0.04);
                    const mid = (lo + hi) / 2;
                    const domMin = mid - span, domMax = mid + span;
                    const PAD = 24, IW = 252;
                    const tx = (v: number) => PAD + ((v - domMin) / (domMax - domMin)) * IW;
                    const zx = tx(0);
                    return (
                      <>
                        <line x1={PAD} y1={20} x2={PAD + IW} y2={20} stroke="#334155" strokeWidth="1.5" />
                        <rect x={tx(lo)} y={14} width={tx(hi) - tx(lo)} height={12} fill="var(--color-accent)" opacity="0.7" rx="2" />
                        <circle cx={tx((lo + hi) / 2)} cy={20} r="3" fill="var(--color-accent)" />
                        <line x1={zx} y1={6} x2={zx} y2={34} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2,2" />
                        <text x={zx} y={6} textAnchor="middle" fill="#ef4444" fontSize="10">0</text>
                        <text x={tx(lo)} y={36} textAnchor="middle" fill="var(--color-accent)" fontSize="10">{(lo * 100).toFixed(1)}%</text>
                        <text x={tx(hi)} y={36} textAnchor="middle" fill="var(--color-accent)" fontSize="10">{(hi * 100).toFixed(1)}%</text>
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>

            <div className="rounded-xl border border-[#1e293b] p-3 bg-[#1e293b]/30">
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                <strong className="text-white">Interpretation: </strong>
                {result.significant
                  ? `The difference in conversion rates (${(p1 * 100).toFixed(1)}% vs. ${(p2 * 100).toFixed(1)}%) is statistically significant (z = ${result.zStatistic.toFixed(2)}, p ${result.pValue < 0.001 ? "< 0.001" : "= " + result.pValue.toFixed(4)}). The treatment group showed a ${Math.abs((p1 - p2) * 100).toFixed(1)} percentage point ${p1 > p2 ? "higher" : "lower"} conversion rate.`
                  : `The data do not provide sufficient evidence to conclude that conversion rates differ between groups (z = ${result.zStatistic.toFixed(2)}, p = ${result.pValue.toFixed(4)}). The 95% CI for the difference ${result.ciLower < 0 && result.ciUpper > 0 ? "contains zero, consistent with H₀" : "does not contain zero"}.`}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Formula */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">Formula</p>
        <div className="rounded-xl bg-[#1e293b]/50 p-4 text-center">
          <p className="text-[12px] font-mono text-white mb-2">
            z = (p̂₁ − p̂₂) / √(p̂(1−p̂)(1/n₁ + 1/n₂))
          </p>
          <p className="text-[11px] text-[#94a3b8]">
            where p̂ = (x₁ + x₂) / (n₁ + n₂) is the pooled proportion
          </p>
        </div>
      </div>
    </div>
  );
}
