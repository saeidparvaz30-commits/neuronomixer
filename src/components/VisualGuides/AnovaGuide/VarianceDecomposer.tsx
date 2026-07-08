"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GroupData, AnovaStatistics, mean } from "./types";

interface VarianceDecomposerProps {
  groups: GroupData[];
  statistics: AnovaStatistics | null;
  currentStep: number;
  onStepChange: (step: number) => void;
  onDecompositionComplete: () => void;
}

const MAX_STEP = 5;

function fmt(n: number, dec = 2): string {
  return n.toFixed(dec);
}

function fmtP(p: number): string {
  if (p < 0.001) return "< 0.001";
  return p.toFixed(3);
}

export default function VarianceDecomposer({
  groups,
  statistics,
  currentStep,
  onStepChange,
  onDecompositionComplete,
}: VarianceDecomposerProps) {
  const grandMean = statistics?.grandMean ?? mean(groups.flatMap(g => g.values));

  function handleNext() {
    const next = Math.min(currentStep + 1, MAX_STEP);
    onStepChange(next);
    if (next === MAX_STEP) {
      onDecompositionComplete();
    }
  }

  function handlePrev() {
    onStepChange(Math.max(currentStep - 1, 0));
  }

  // SVG dimensions for deviation diagrams
  const SVG_W = 460;
  const SVG_H = 90;
  const PAD_L = 20;
  const PAD_R = 20;
  const PAD_T = 10;
  const PAD_B = 20;
  const plotW = SVG_W - PAD_L - PAD_R;
  const plotH = SVG_H - PAD_T - PAD_B;

  const allVals = groups.flatMap(g => g.values);
  const dataMin = Math.min(...allVals);
  const dataMax = Math.max(...allVals);
  const range = dataMax - dataMin || 1;
  const yMin = dataMin - range * 0.1;
  const yMax = dataMax + range * 0.1;
  const yRange = yMax - yMin;

  function yScale(v: number) {
    return PAD_T + plotH - ((v - yMin) / yRange) * plotH;
  }

  // Render step 1: SS_Total deviations
  function renderSSTotalSVG() {
    const N = allVals.length;
    return (
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto max-w-[460px]">
        {/* Grand mean line */}
        <line x1={PAD_L} y1={yScale(grandMean)} x2={SVG_W - PAD_R} y2={yScale(grandMean)} stroke="var(--color-accent)" strokeWidth={1.5} strokeDasharray="4,3" />
        {/* Individual deviations */}
        {allVals.slice(0, Math.min(N, 40)).map((v, i) => {
          const x = PAD_L + (i / Math.min(N, 40) - 1) * plotW + plotW;
          const yVal = yScale(v);
          const yGM = yScale(grandMean);
          return (
            <g key={i}>
              <line x1={x} y1={yVal} x2={x} y2={yGM} stroke="#94a3b8" strokeWidth={1} opacity={0.6} />
              <circle cx={x} cy={yVal} r={2} fill="#94a3b8" opacity={0.6} />
            </g>
          );
        })}
        <text x={SVG_W - PAD_R} y={yScale(grandMean) - 4} textAnchor="end" fill="var(--color-accent)" fontSize={9}>x̄</text>
      </svg>
    );
  }

  // Render step 2: SS_Between — group means vs grand mean
  function renderSSBetweenSVG() {
    const groupSlotW = plotW / groups.length;
    return (
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto max-w-[460px]">
        {/* Grand mean line */}
        <line x1={PAD_L} y1={yScale(grandMean)} x2={SVG_W - PAD_R} y2={yScale(grandMean)} stroke="var(--color-accent)" strokeWidth={1.5} strokeDasharray="4,3" />
        {groups.map((g, gi) => {
          const gMean = mean(g.values);
          const cx = PAD_L + groupSlotW * gi + groupSlotW / 2;
          const yGM = yScale(gMean);
          const yGrand = yScale(grandMean);
          return (
            <g key={g.groupName}>
              {/* Deviation arrow */}
              <line x1={cx} y1={yGrand} x2={cx} y2={yGM} stroke={g.color} strokeWidth={3} markerEnd="url(#arrow)" />
              {/* Group mean dot */}
              <circle cx={cx} cy={yGM} r={5} fill={g.color} />
              <text x={cx} y={yGM - 8} textAnchor="middle" fill={g.color} fontSize={8} fontFamily="monospace">
                {gMean.toFixed(1)}
              </text>
            </g>
          );
        })}
        <text x={SVG_W - PAD_R} y={yScale(grandMean) - 4} textAnchor="end" fill="var(--color-accent)" fontSize={9}>x̄</text>
      </svg>
    );
  }

  // Render step 3: SS_Within — within-group deviations
  function renderSSWithinSVG() {
    const groupSlotW = plotW / groups.length;
    return (
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto max-w-[460px]">
        {groups.map((g, gi) => {
          const gMean = mean(g.values);
          const cx = PAD_L + groupSlotW * gi + groupSlotW / 2;
          const yGM = yScale(gMean);
          const spread = groupSlotW * 0.35;
          return (
            <g key={g.groupName}>
              {/* Group mean line */}
              <line x1={cx - spread} y1={yGM} x2={cx + spread} y2={yGM} stroke={g.color} strokeWidth={1.5} />
              {/* Within deviations */}
              {g.values.slice(0, 10).map((v, vi) => {
                const xj = cx + (vi - 4.5) * (spread / 5);
                return (
                  <g key={vi}>
                    <line x1={xj} y1={yScale(v)} x2={xj} y2={yGM} stroke={g.color} strokeWidth={1} opacity={0.5} />
                    <circle cx={xj} cy={yScale(v)} r={2} fill={g.color} opacity={0.6} />
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    );
  }

  const stats = statistics;

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[13px] font-semibold text-white uppercase tracking-wider">
          Variance Decomposition
        </h2>
        <div className="flex items-center gap-1">
          {Array.from({ length: MAX_STEP + 1 }, (_, i) => (
            <button
              key={i}
              onClick={() => {
                onStepChange(i);
                if (i === MAX_STEP) onDecompositionComplete();
              }}
              aria-label={`Go to decomposition step ${i}`}
              className="w-2 h-2 rounded-full transition-colors"
              style={{ background: i <= currentStep ? "#3bb4a4" : "#1e293b" }}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {/* Step 0: Intro */}
          {currentStep === 0 && (
            <div className="text-center py-6">
              <div className="text-5xl mb-4 text-[var(--color-accent)] font-black">SS</div>
              <p className="text-[#94a3b8] text-[14px] max-w-[500px] mx-auto">
                ANOVA decomposes total variability into <strong className="text-white">between-group</strong> and <strong className="text-white">within-group</strong> components.
                Press <span className="text-[var(--color-accent)]">Next</span> to begin the variance decomposition.
              </p>
              <p className="text-[12px] text-[#475569] mt-3 font-mono">
                SS<sub>Total</sub> = SS<sub>Between</sub> + SS<sub>Within</sub>
              </p>
            </div>
          )}

          {/* Step 1: SS_Total */}
          {currentStep === 1 && (
            <div>
              <div className="mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#1e293b] rounded-lg text-[11px] font-mono text-[#94a3b8] mb-2">
                  Step 1 of 5
                </span>
                <h3 className="text-white font-semibold text-[15px] mb-1">SS_Total: Total Variability</h3>
                <p className="text-[#94a3b8] text-[12px] mb-3">
                  Each vertical line shows how far a data point strays from the <span className="text-[var(--color-accent)]">grand mean</span>.
                  Squaring and summing all these distances gives SS_Total.
                </p>
              </div>
              <div className="p-3 bg-[#1e293b] rounded-xl mb-3 font-mono text-[12px] text-[#94a3b8]">
                SS<sub className="text-[10px]">Total</sub> = Σ(x<sub className="text-[10px]">ij</sub> − x̄)<sup className="text-[10px]">2</sup>
                {stats && <span className="ml-3 text-white">= {fmt(stats.ssTotal)}</span>}
              </div>
              {renderSSTotalSVG()}
            </div>
          )}

          {/* Step 2: SS_Between */}
          {currentStep === 2 && (
            <div>
              <div className="mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#1e293b] rounded-lg text-[11px] font-mono text-[#94a3b8] mb-2">
                  Step 2 of 5
                </span>
                <h3 className="text-white font-semibold text-[15px] mb-1">SS_Between: Group Differences</h3>
                <p className="text-[#94a3b8] text-[12px] mb-3">
                  How much do <em>group means</em> differ from the grand mean? Larger arrows = stronger group effect.
                </p>
              </div>
              <div className="p-3 bg-[#1e293b] rounded-xl mb-3 font-mono text-[12px] text-[#94a3b8]">
                SS<sub className="text-[10px]">Between</sub> = Σ n<sub className="text-[10px]">j</sub>(x̄<sub className="text-[10px]">j</sub> − x̄)<sup className="text-[10px]">2</sup>
                {stats && <span className="ml-3 text-white">= {fmt(stats.ssBetween)}</span>}
              </div>
              {renderSSBetweenSVG()}
            </div>
          )}

          {/* Step 3: SS_Within */}
          {currentStep === 3 && (
            <div>
              <div className="mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#1e293b] rounded-lg text-[11px] font-mono text-[#94a3b8] mb-2">
                  Step 3 of 5
                </span>
                <h3 className="text-white font-semibold text-[15px] mb-1">SS_Within: Noise Inside Groups</h3>
                <p className="text-[#94a3b8] text-[12px] mb-3">
                  How much do individual values scatter <em>within</em> each group? This is the residual error.
                </p>
              </div>
              <div className="p-3 bg-[#1e293b] rounded-xl mb-3 font-mono text-[12px] text-[#94a3b8]">
                SS<sub className="text-[10px]">Within</sub> = Σ<sub className="text-[10px]">j</sub>Σ<sub className="text-[10px]">i</sub>(x<sub className="text-[10px]">ij</sub> − x̄<sub className="text-[10px]">j</sub>)<sup className="text-[10px]">2</sup>
                {stats && <span className="ml-3 text-white">= {fmt(stats.ssWithin)}</span>}
              </div>
              {renderSSWithinSVG()}
            </div>
          )}

          {/* Step 4: Decomposition bar */}
          {currentStep === 4 && stats && (
            <div>
              <div className="mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#1e293b] rounded-lg text-[11px] font-mono text-[#94a3b8] mb-2">
                  Step 4 of 5
                </span>
                <h3 className="text-white font-semibold text-[15px] mb-1">Decomposition: SS_T = SS_B + SS_W</h3>
                <p className="text-[#94a3b8] text-[12px] mb-4">
                  The stacked bar shows what proportion of total variance is explained by group membership (η²).
                </p>
              </div>
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] text-[#94a3b8] w-16">SS_Total</span>
                  <span className="font-mono text-white text-[12px]">{fmt(stats.ssTotal)}</span>
                </div>
                <div className="h-7 rounded-xl overflow-hidden flex w-full">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(stats.ssBetween / stats.ssTotal) * 100}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: "#1e5d8a" }}
                  >
                    {(stats.etaSquared * 100).toFixed(1)}%
                  </motion.div>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(stats.ssWithin / stats.ssTotal) * 100}%` }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                    className="h-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: "#334155" }}
                  >
                    {((1 - stats.etaSquared) * 100).toFixed(1)}%
                  </motion.div>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#1e5d8a" }} />
                    <span className="text-[10px] text-[#94a3b8]">SS_Between ({fmt(stats.ssBetween)})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-[#334155]" />
                    <span className="text-[10px] text-[#94a3b8]">SS_Within ({fmt(stats.ssWithin)})</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-[#94a3b8]">
                η² = {fmt(stats.etaSquared, 3)}: {stats.etaSquared >= 0.14 ? "large" : stats.etaSquared >= 0.06 ? "medium" : "small"} effect size
              </p>
            </div>
          )}

          {/* Step 5: F-statistic + ANOVA table */}
          {currentStep === 5 && stats && (
            <div>
              <div className="mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#1e293b] rounded-lg text-[11px] font-mono text-[#94a3b8] mb-2">
                  Step 5 of 5
                </span>
                <h3 className="text-white font-semibold text-[15px] mb-1">F-Statistic: Signal-to-Noise Ratio</h3>
                <p className="text-[#94a3b8] text-[12px] mb-4">
                  F compares variance <em>between</em> groups to variance <em>within</em> groups. A large F suggests the groups are genuinely different.
                </p>
              </div>

              {/* F stat highlight */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="rounded-xl bg-[#1e293b] p-3 text-center">
                  <div className="text-[10px] text-[#94a3b8] mb-1">MS_Between</div>
                  <div className="text-[18px] font-black text-white font-mono">{fmt(stats.msBetween)}</div>
                </div>
                <div className="rounded-xl bg-[#1e293b] p-3 text-center">
                  <div className="text-[10px] text-[#94a3b8] mb-1">MS_Within</div>
                  <div className="text-[18px] font-black text-white font-mono">{fmt(stats.msWithin)}</div>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: stats.pValue < 0.05 ? "#14532d" : "#1e293b", border: stats.pValue < 0.05 ? "1px solid var(--color-success)" : "1px solid transparent" }}>
                  <div className="text-[10px] text-[#94a3b8] mb-1">F-statistic</div>
                  <div className="text-[24px] font-black font-mono" style={{ color: stats.pValue < 0.05 ? "var(--color-success)" : "var(--color-accent)" }}>
                    {fmt(stats.fStatistic)}
                  </div>
                </div>
              </div>

              {/* ANOVA table */}
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-[#1e293b]">
                      <th className="text-left py-2 pr-3 text-[#94a3b8] font-medium">Source</th>
                      <th className="text-right py-2 px-2 text-[#94a3b8] font-medium">SS</th>
                      <th className="text-right py-2 px-2 text-[#94a3b8] font-medium">df</th>
                      <th className="text-right py-2 px-2 text-[#94a3b8] font-medium">MS</th>
                      <th className="text-right py-2 px-2 text-[#94a3b8] font-medium">F</th>
                      <th className="text-right py-2 pl-2 text-[#94a3b8] font-medium">p-value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#1e293b]/50">
                      <td className="py-2 pr-3 text-white font-medium">Between</td>
                      <td className="py-2 px-2 text-right font-mono text-[#94a3b8]">{fmt(stats.ssBetween)}</td>
                      <td className="py-2 px-2 text-right font-mono text-[#94a3b8]">{stats.dfBetween}</td>
                      <td className="py-2 px-2 text-right font-mono text-[#94a3b8]">{fmt(stats.msBetween)}</td>
                      <td className="py-2 px-2 text-right font-mono text-[var(--color-accent)] font-bold">{fmt(stats.fStatistic)}</td>
                      <td className="py-2 pl-2 text-right font-mono" style={{ color: stats.pValue < 0.05 ? "var(--color-success)" : "#ef4444" }}>
                        {fmtP(stats.pValue)}
                      </td>
                    </tr>
                    <tr className="border-b border-[#1e293b]/50">
                      <td className="py-2 pr-3 text-white font-medium">Within</td>
                      <td className="py-2 px-2 text-right font-mono text-[#94a3b8]">{fmt(stats.ssWithin)}</td>
                      <td className="py-2 px-2 text-right font-mono text-[#94a3b8]">{stats.dfWithin}</td>
                      <td className="py-2 px-2 text-right font-mono text-[#94a3b8]">{fmt(stats.msWithin)}</td>
                      <td className="py-2 px-2 text-right text-[#475569]">—</td>
                      <td className="py-2 pl-2 text-right text-[#475569]">—</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 text-white font-medium">Total</td>
                      <td className="py-2 px-2 text-right font-mono text-[#94a3b8]">{fmt(stats.ssTotal)}</td>
                      <td className="py-2 px-2 text-right font-mono text-[#94a3b8]">{stats.dfBetween + stats.dfWithin}</td>
                      <td className="py-2 px-2 text-right text-[#475569]">—</td>
                      <td className="py-2 px-2 text-right text-[#475569]">—</td>
                      <td className="py-2 pl-2 text-right text-[#475569]">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* No stats yet (step >= 1) */}
          {currentStep >= 1 && !stats && (
            <p className="text-[#94a3b8] text-[12px] mt-3">
              Run ANOVA first to see computed values.
            </p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="flex items-center gap-3 mt-5 pt-4 border-t border-[#1e293b]">
        <button
          onClick={handlePrev}
          disabled={currentStep === 0}
          aria-label="Previous decomposition step"
          className="px-4 py-2 rounded-xl text-[12px] font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← Previous
        </button>
        <span className="text-[11px] text-[#475569] flex-1 text-center">
          Step {currentStep} / {MAX_STEP}
        </span>
        <button
          onClick={handleNext}
          disabled={currentStep === MAX_STEP}
          aria-label="Next decomposition step"
          className="px-4 py-2 rounded-xl text-[12px] font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
