"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import HistogramPlot from "./HistogramPlot";

// Fixed deterministic group data
// Group 1 (control): 20 values, mean ≈ 50, std ≈ 8
const GROUP1 = [
  50.2, 44.8, 52.1, 47.3, 55.6, 41.9, 53.4, 46.7, 58.1, 43.2,
  49.6, 56.3, 42.8, 51.7, 45.4, 57.9, 48.3, 54.6, 40.5, 52.8,
];
// Group 2 (treatment): 20 values, mean ≈ 55, std ≈ 8
const GROUP2 = [
  55.3, 49.7, 57.2, 52.4, 60.8, 46.9, 58.5, 51.6, 63.2, 48.1,
  54.7, 61.4, 47.9, 56.8, 50.5, 62.9, 53.4, 59.7, 45.6, 57.9,
];

function arrMean(arr: number[]) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const TOTAL_PERMS = 5000;
const BATCH_PER_TICK = 50;
const TICK_MS = 50;

interface PermutationTestSectionProps {
  onPermutationDone: () => void;
}

export default function PermutationTestSection({ onPermutationDone }: PermutationTestSectionProps) {
  const { fadeUp } = useGuideMotion();
  const [nullDist, setNullDist] = useState<number[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [pValue, setPValue] = useState<number | null>(null);
  const [doneFired, setDoneFired] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const distRef = useRef<number[]>([]);

  const group1Mean = arrMean(GROUP1);
  const group2Mean = arrMean(GROUP2);
  const observedDiff = group2Mean - group1Mean;
  const combined = [...GROUP1, ...GROUP2];

  // (k + 1) / (N + 1): the observed labeling counts as one permutation,
  // so a permutation p-value can never legitimately be exactly 0.
  const computePValue = useCallback((dist: number[]) => {
    const absDiff = Math.abs(observedDiff);
    const extreme = dist.filter((d) => Math.abs(d) >= absDiff).length;
    return (extreme + 1) / (dist.length + 1);
  }, [observedDiff]);

  const stopAnimation = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsAnimating(false);
  }, []);

  const handleRun = useCallback(() => {
    if (isAnimating) {
      stopAnimation();
      return;
    }
    if (distRef.current.length >= TOTAL_PERMS) return;

    setIsAnimating(true);

    intervalRef.current = setInterval(() => {
      const newBatch: number[] = [];
      for (let i = 0; i < BATCH_PER_TICK; i++) {
        const shuffled = shuffleArray(combined);
        const g1 = shuffled.slice(0, GROUP1.length);
        const g2 = shuffled.slice(GROUP1.length);
        newBatch.push(arrMean(g2) - arrMean(g1));
      }

      distRef.current = [...distRef.current, ...newBatch];

      if (distRef.current.length >= TOTAL_PERMS) {
        distRef.current = distRef.current.slice(0, TOTAL_PERMS);
        setNullDist([...distRef.current]);
        setPValue(computePValue(distRef.current));
        stopAnimation();
        setDoneFired(true);
      } else {
        setNullDist([...distRef.current]);
        if (distRef.current.length % 500 === 0) {
          setPValue(computePValue(distRef.current));
        }
      }
    }, TICK_MS);
  }, [isAnimating, stopAnimation, computePValue, combined]);

  const handleReset = useCallback(() => {
    stopAnimation();
    distRef.current = [];
    setNullDist([]);
    setPValue(null);
    setDoneFired(false);
  }, [stopAnimation]);

  useEffect(() => {
    if (doneFired) {
      onPermutationDone();
    }
  }, [doneFired, onPermutationDone]);

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const progress = Math.min(100, Math.round((nullDist.length / TOTAL_PERMS) * 100));
  const isDone = nullDist.length >= TOTAL_PERMS;
  const isSignificant = pValue !== null && pValue < 0.05;

  // Small group histogram rendering
  const renderGroupHistogram = (data: number[], color: string, label: string, mean: number) => {
    const minV = 35;
    const maxV = 75;
    const numBins = 12;
    const binW = (maxV - minV) / numBins;
    const bins = Array.from({ length: numBins }, (_, i) => {
      const lo = minV + i * binW;
      const hi = lo + binW;
      return data.filter((v) => (i === numBins - 1 ? v >= lo && v <= hi : v >= lo && v < hi)).length;
    });
    const maxCount = Math.max(...bins, 1);
    const W = 200;
    const H = 100;
    const PAD = { l: 8, r: 8, t: 8, b: 24 };
    const chartW = W - PAD.l - PAD.r;
    const chartH = H - PAD.t - PAD.b;

    return (
      <div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          {bins.map((count, i) => {
            const bw = chartW / numBins - 1;
            const bx = PAD.l + i * (chartW / numBins);
            const bh = (count / maxCount) * chartH;
            const by = PAD.t + chartH - bh;
            return (
              <rect key={i} x={bx} y={by} width={bw} height={bh} fill={color} opacity={0.7} rx="1" />
            );
          })}
          {/* Mean line */}
          {(() => {
            const mx = PAD.l + ((mean - minV) / (maxV - minV)) * chartW;
            return (
              <line x1={mx} y1={PAD.t} x2={mx} y2={PAD.t + chartH} stroke={color} strokeWidth="2" strokeDasharray="3 2" />
            );
          })()}
          <line x1={PAD.l} y1={PAD.t + chartH} x2={W - PAD.r} y2={PAD.t + chartH} stroke="#334155" strokeWidth="1" />
          {[40, 50, 60, 70].map((v) => (
            <text
              key={v}
              x={PAD.l + ((v - minV) / (maxV - minV)) * chartW}
              y={H - 4}
              fill="#475569"
              fontSize="10"
              textAnchor="middle"
            >
              {v}
            </text>
          ))}
        </svg>
        <div className="flex items-center justify-between px-1 mt-1">
          <span className="text-xs font-semibold" style={{ color }}>{label}</span>
          <span className="text-xs font-mono text-white">x̄ = {mean.toFixed(2)}</span>
        </div>
      </div>
    );
  };

  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={GUIDE_VIEWPORT}
      className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="inline-flex items-center gap-2 bg-[#1e5d8a]/20 border border-[#1e5d8a]/40 rounded-full px-3 py-1 mb-2">
            <span className="text-xs font-semibold text-[#3bb4a4] uppercase tracking-wider">Section 2</span>
          </div>
          <h2 className="text-xl font-bold text-white">Permutation Test</h2>
          <p className="text-sm text-[#94a3b8] mt-1">
            Test if the difference between two groups is statistically significant. No normality
            assumption needed, only that observations are exchangeable between groups under the null.
          </p>
        </div>
        {isDone && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 text-xs text-[#3bb4a4] font-semibold bg-[#3bb4a4]/10 border border-[#3bb4a4]/30 rounded-full px-3 py-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Complete
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left: charts */}
        <div className="flex flex-col gap-4">
          {/* Group histograms */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-3">
              {renderGroupHistogram(GROUP1, "#1e5d8a", "Control (Group 1)", group1Mean)}
            </div>
            <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-3">
              {renderGroupHistogram(GROUP2, "#3bb4a4", "Treatment (Group 2)", group2Mean)}
            </div>
          </div>

          {/* Observed difference */}
          <div className="rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-4 text-center">
            <span className="text-xs text-[#94a3b8] uppercase tracking-wide">Observed Difference (Group 2 − Group 1)</span>
            <div className="text-3xl font-black text-[var(--color-accent)] mt-1">+{observedDiff.toFixed(3)}</div>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-[#1e293b] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#3bb4a4] to-[var(--color-accent)] rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
            <span className="text-xs text-[#94a3b8] whitespace-nowrap font-mono">
              {nullDist.length} / {TOTAL_PERMS}
            </span>
          </div>

          {/* Null distribution */}
          <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-3">
            <span className="text-xs font-semibold text-[#94a3b8] block mb-2">
              Null Distribution (permuted differences)
            </span>
            <HistogramPlot
              values={nullDist}
              color="#475569"
              width={520}
              height={220}
              verticalLines={
                nullDist.length > 0
                  ? [
                      {
                        x: observedDiff,
                        color: "#ef4444",
                        label: `obs (${observedDiff.toFixed(1)})`,
                      },
                      {
                        x: -observedDiff,
                        color: "#ef4444",
                        label: `−obs (${(-observedDiff).toFixed(1)})`,
                      },
                    ]
                  : []
              }
              shadedRanges={
                nullDist.length > 0
                  ? [
                      // both tails count toward the two-tailed p-value
                      { lo: Math.abs(observedDiff), hi: Math.max(...nullDist) + 1, color: "#ef4444" },
                      { lo: Math.min(...nullDist) - 1, hi: -Math.abs(observedDiff), color: "#ef4444" },
                    ]
                  : undefined
              }
            />
          </div>
        </div>

        {/* Right: controls + results */}
        <div className="flex flex-col gap-4">
          {/* Controls */}
          <div className="flex gap-2">
            <button
              onClick={handleRun}
              disabled={isDone}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isDone
                  ? "bg-[#1e293b] text-[#475569] cursor-not-allowed"
                  : isAnimating
                  ? "bg-[#d4af37]/20 text-[var(--color-accent)] border border-[#d4af37]/40 hover:opacity-90"
                  : "bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90"
              }`}
            >
              {isDone ? "Done" : isAnimating ? "Pause" : nullDist.length > 0 ? "Resume" : "Run Permutation Test"}
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl text-sm border border-[#334155] text-[#94a3b8] hover:border-[#475569] transition-colors"
            >
              Reset
            </button>
          </div>

          {/* Results card */}
          <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-4">
            <h3 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wide mb-3">Results</h3>
            <div className="space-y-2.5">
              {[
                { label: "Group 1 Mean", value: group1Mean.toFixed(3), color: "#1e5d8a" },
                { label: "Group 2 Mean", value: group2Mean.toFixed(3), color: "#3bb4a4" },
                { label: "Observed Diff", value: `+${observedDiff.toFixed(3)}`, color: "var(--color-accent)" },
                {
                  label: "p-value (two-tailed)",
                  value: pValue !== null ? pValue.toFixed(4) : "—",
                  color: pValue !== null ? (isSignificant ? "var(--color-success)" : "#ef4444") : "#94a3b8",
                },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-[#94a3b8]">{label}</span>
                  <span className="text-sm font-mono font-semibold" style={{ color }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {pValue !== null && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-3 pt-3 border-t border-[#1e293b] rounded-lg p-2 text-center ${
                  isSignificant ? "bg-[#22c55e]/10 border border-[#22c55e]/30" : "bg-[#ef4444]/10 border border-[#ef4444]/30"
                }`}
              >
                <span
                  className="text-sm font-bold"
                  style={{ color: isSignificant ? "var(--color-success)" : "#ef4444" }}
                >
                  {isSignificant ? "Significant (p < 0.05)" : "Not Significant (p ≥ 0.05)"}
                </span>
              </motion.div>
            )}
          </div>

          {/* Method explanation */}
          <div className="rounded-xl border border-[#3bb4a4]/20 bg-[#3bb4a4]/5 p-4">
            <h3 className="text-xs font-semibold text-[#3bb4a4] uppercase tracking-wide mb-3">How Permutation Test Works</h3>
            <ol className="space-y-2">
              {[
                "Compute observed difference between group means.",
                "Pool all observations into one combined dataset.",
                "Randomly shuffle and re-split into two groups of same size.",
                "Compute the difference for this random permutation.",
                "Repeat 5,000 times to build the null distribution.",
                "p-value = (k + 1) / (N + 1), where k = permutations with |diff| ≥ |observed|. Both tails count, and the +1 (the observed labeling itself) keeps p from ever being exactly 0.",
              ].map((step, i) => (
                <li key={i} className="flex gap-2 text-xs text-[#94a3b8]">
                  <span className="text-[#3bb4a4] font-bold shrink-0">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-4">
            <p className="text-xs text-[#94a3b8] leading-relaxed">
              <span className="text-white font-semibold">Key idea:</span> Under the null hypothesis (no group difference),
              any assignment of labels to observations is equally likely.
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
