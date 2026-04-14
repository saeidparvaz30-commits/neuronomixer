"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  TRAINING_BEFORE, TRAINING_AFTER,
  runPairedTTest, mean,
  type TTestResult,
} from "./types";
import ResultsPanel from "./ResultsPanel";

interface Props {
  onTestRun: () => void;
}

// ── Before/After scatter ───────────────────────────────────────────────────────
function PairedScatter({ before, after }: { before: number[]; after: number[] }) {
  const all = [...before, ...after];
  const mn = Math.min(...all) - 2, mx = Math.max(...all) + 2;
  const W = 280, H = 200;
  const PAD = { l: 28, r: 12, t: 12, b: 28 };
  const IW = W - PAD.l - PAD.r, IH = H - PAD.t - PAD.b;
  const tx = (v: number) => PAD.l + ((v - mn) / (mx - mn)) * IW;
  const ty = (v: number) => PAD.t + IH - ((v - mn) / (mx - mn)) * IH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      <line x1={PAD.l} y1={PAD.t + IH} x2={PAD.l + IW} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />
      {/* y = x reference line */}
      <line x1={tx(mn)} y1={ty(mn)} x2={tx(mx)} y2={ty(mx)}
        stroke="#d4af37" strokeWidth="1" strokeDasharray="3,2" opacity="0.6" />
      {/* Connecting lines per pair */}
      {before.map((b, i) => (
        <line key={`l${i}`}
          x1={tx(b)} y1={ty(after[i])} x2={tx(b)} y2={ty(after[i])}
          stroke={after[i] > b ? "#3bb4a4" : "#ef4444"}
          strokeWidth="0.8" opacity="0.4"
        />
      ))}
      {/* Lines from before to after */}
      {before.map((b, i) => (
        <line key={`cl${i}`}
          x1={tx(b)} y1={ty(b)} x2={tx(b)} y2={ty(after[i])}
          stroke={after[i] >= b ? "#3bb4a4" : "#ef4444"}
          strokeWidth="0.8" opacity="0.35"
        />
      ))}
      {/* Points */}
      {before.map((b, i) => (
        <g key={`pt${i}`}>
          <circle cx={tx(b)} cy={ty(after[i])} r="3" fill="#3bb4a4" opacity="0.8" />
        </g>
      ))}
      {/* Labels */}
      <text x={PAD.l + IW / 2} y={H - 6} textAnchor="middle" fill="#475569" fontSize="8">Before score</text>
      <text x={PAD.l - 10} y={PAD.t + IH / 2}
        fill="#475569" fontSize="8" textAnchor="middle"
        transform={`rotate(-90, ${PAD.l - 14}, ${PAD.t + IH / 2})`}>
        After score
      </text>
      <text x={tx(mx) - 10} y={ty(mx) - 4} fill="#d4af37" fontSize="7">y=x</text>
    </svg>
  );
}

// ── Difference histogram ───────────────────────────────────────────────────────
function DiffHistogram({ diffs }: { diffs: number[] }) {
  const mn = Math.min(...diffs) - 1, mx = Math.max(...diffs) + 1;
  const binCount = 7;
  const bw = (mx - mn) / binCount;
  const bins = Array.from({ length: binCount }, (_, i) => ({
    x: mn + i * bw,
    count: 0,
  }));
  diffs.forEach(d => {
    const idx = Math.min(Math.floor((d - mn) / bw), binCount - 1);
    bins[idx].count++;
  });
  const maxC = Math.max(...bins.map(b => b.count), 1);
  const W = 240, H = 80;
  const PAD = { l: 20, r: 8, t: 8, b: 18 };
  const IW = W - PAD.l - PAD.r, IH = H - PAD.t - PAD.b;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      <line x1={PAD.l} y1={PAD.t + IH} x2={PAD.l + IW} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />
      {bins.map((b, i) => {
        const bwPx = IW / binCount - 1;
        const bh = (b.count / maxC) * IH;
        const bx = PAD.l + (i / binCount) * IW;
        const isPositive = b.x >= 0;
        return (
          <rect key={i} x={bx} y={PAD.t + IH - bh} width={bwPx} height={bh}
            fill={isPositive ? "#3bb4a4" : "#ef4444"} opacity="0.8" rx="1" />
        );
      })}
      {/* Zero line */}
      {(() => {
        const zx = PAD.l + ((0 - mn) / (mx - mn)) * IW;
        if (zx >= PAD.l && zx <= PAD.l + IW) {
          return <line x1={zx} y1={PAD.t} x2={zx} y2={PAD.t + IH}
            stroke="#d4af37" strokeWidth="1" strokeDasharray="2,2" />;
        }
        return null;
      })()}
      <text x={PAD.l + IW / 2} y={H - 2} textAnchor="middle" fill="#475569" fontSize="7">
        Difference (After − Before)
      </text>
    </svg>
  );
}

export default function PairedSampleScenario({ onTestRun }: Props) {
  const [result, setResult] = useState<TTestResult | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const diffs = TRAINING_BEFORE.map((b, i) => TRAINING_AFTER[i] - b);
  const meanDiff = mean(diffs).toFixed(2);
  const improved = diffs.filter(d => d > 0).length;

  const runTest = () => {
    const r = runPairedTTest(TRAINING_BEFORE, TRAINING_AFTER);
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
          <div className="w-8 h-8 rounded-lg bg-[#d4af37]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-[#d4af37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-1">Scenario</p>
            <h3 className="text-[15px] font-bold text-white mb-1">Employee Training Effectiveness</h3>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              25 employees took a skills test before and after a training program.
              Did training significantly improve their scores?
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-xl border border-[#1e293b] p-3 text-center">
            <p className="text-[9px] text-[#475569] mb-1">Mean Before</p>
            <p className="text-[18px] font-black font-mono text-[#94a3b8]">
              {mean(TRAINING_BEFORE).toFixed(1)}
            </p>
          </div>
          <div className="rounded-xl border border-[#1e293b] p-3 text-center">
            <p className="text-[9px] text-[#475569] mb-1">Mean After</p>
            <p className="text-[18px] font-black font-mono text-[#3bb4a4]">
              {mean(TRAINING_AFTER).toFixed(1)}
            </p>
          </div>
          <div className="rounded-xl border border-[#1e293b] p-3 text-center">
            <p className="text-[9px] text-[#475569] mb-1">Mean Diff</p>
            <p className="text-[18px] font-black font-mono text-[#d4af37]">
              +{meanDiff}
            </p>
          </div>
        </div>

        {/* H0/H1 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl border border-[#1e293b] p-3">
            <p className="text-[9px] text-[#475569] mb-1 font-semibold">H₀ (Null)</p>
            <p className="text-[12px] font-mono text-[#94a3b8]">μ_diff = 0</p>
          </div>
          <div className="rounded-xl border border-[#1e293b] p-3">
            <p className="text-[9px] text-[#475569] mb-1 font-semibold">H₁ (Alternative)</p>
            <p className="text-[12px] font-mono text-[#94a3b8]">μ_diff ≠ 0</p>
          </div>
        </div>

        {/* Data table */}
        <div className="mb-4">
          <p className="text-[11px] font-semibold text-[#475569] mb-2">
            {improved}/{TRAINING_BEFORE.length} employees improved after training
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[#1e293b]">
                  <th className="text-left py-1 pr-3 text-[#475569] font-semibold">Emp.</th>
                  <th className="text-right py-1 pr-3 text-[#475569] font-semibold">Before</th>
                  <th className="text-right py-1 pr-3 text-[#475569] font-semibold">After</th>
                  <th className="text-right py-1 text-[#475569] font-semibold">Diff</th>
                </tr>
              </thead>
              <tbody>
                {TRAINING_BEFORE.slice(0, 8).map((b, i) => {
                  const diff = TRAINING_AFTER[i] - b;
                  return (
                    <tr key={i} className="border-b border-[#1e293b]/50">
                      <td className="py-1 pr-3 text-[#475569]">{i + 1}</td>
                      <td className="py-1 pr-3 text-right font-mono text-white">{b}</td>
                      <td className="py-1 pr-3 text-right font-mono text-[#3bb4a4]">{TRAINING_AFTER[i]}</td>
                      <td className={`py-1 text-right font-mono font-semibold ${diff >= 0 ? "text-[#3bb4a4]" : "text-[#ef4444]"}`}>
                        {diff >= 0 ? "+" : ""}{diff}
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td className="py-1 text-[#475569] italic" colSpan={4}>
                    …and {TRAINING_BEFORE.length - 8} more rows
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Visualizations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-[10px] text-[#475569] mb-1 font-semibold">Before vs. After scatter</p>
            <PairedScatter before={TRAINING_BEFORE} after={TRAINING_AFTER} />
          </div>
          <div>
            <p className="text-[10px] text-[#475569] mb-1 font-semibold">Distribution of differences</p>
            <DiffHistogram diffs={diffs} />
          </div>
        </div>

        <motion.button
          onClick={runTest}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          className="w-full py-2.5 rounded-xl text-[13px] font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity"
        >
          Run Paired t-Test
        </motion.button>
      </div>

      {/* Results */}
      <ResultsPanel result={result} nullValue={0} group1Name="After" group2Name="Before (paired differences)" />

      {/* Formula */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">How it works</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { step: "1", title: "Compute differences", body: "dᵢ = Afterᵢ − Beforeᵢ for each pair" },
            { step: "2", title: "One-sample test", body: "t = d̄ / (s_d / √n) with H₀: μ_d = 0" },
            { step: "3", title: "Paired advantage", body: "Removes between-subject variability, increasing power" },
          ].map(({ step, title, body }) => (
            <div key={step} className="rounded-xl border border-[#1e293b] p-3">
              <p className="text-[10px] font-mono text-[#d4af37] mb-1">Step {step}</p>
              <p className="text-[11px] font-semibold text-white mb-1">{title}</p>
              <p className="text-[11px] text-[#94a3b8]">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
