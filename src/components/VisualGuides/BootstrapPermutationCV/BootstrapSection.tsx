"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import HistogramPlot from "./HistogramPlot";

// Fixed deterministic original data: 30 values from normal(50, 10)
const ORIGINAL_DATA = [
  47.2, 52.8, 48.1, 55.4, 43.6, 58.2, 49.7, 51.3, 46.8, 54.1,
  42.5, 57.9, 50.4, 53.7, 45.2, 56.8, 48.9, 51.6, 44.3, 59.1,
  47.8, 52.3, 46.1, 55.9, 41.7, 58.6, 50.2, 53.4, 45.8, 56.3,
];

function arrMean(arr: number[]) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function arrStd(arr: number[]) {
  if (arr.length < 2) return 0;
  const m = arrMean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

function bootstrapSample(data: number[]): number {
  const n = data.length;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += data[Math.floor(Math.random() * n)];
  }
  return sum / n;
}

function percentile(sortedArr: number[], p: number): number {
  const idx = (p / 100) * (sortedArr.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedArr[lo];
  return sortedArr[lo] + (sortedArr[hi] - sortedArr[lo]) * (idx - lo);
}

const TOTAL_SAMPLES = 1000;
const BATCH_PER_TICK = 20;
const TICK_MS = 50;

interface BootstrapSectionProps {
  onBootstrapDone: () => void;
}

export default function BootstrapSection({ onBootstrapDone }: BootstrapSectionProps) {
  const { fadeUp } = useGuideMotion();
  const [bootstrapMeans, setBootstrapMeans] = useState<number[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [ciLower, setCiLower] = useState(0);
  const [ciUpper, setCiUpper] = useState(0);
  const [doneFired, setDoneFired] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const meansRef = useRef<number[]>([]);

  const sampleMean = arrMean(ORIGINAL_DATA);

  const computeCI = useCallback((means: number[]) => {
    if (means.length < 2) return;
    const sorted = [...means].sort((a, b) => a - b);
    setCiLower(percentile(sorted, 2.5));
    setCiUpper(percentile(sorted, 97.5));
  }, []);

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
    if (meansRef.current.length >= TOTAL_SAMPLES) return;

    setIsAnimating(true);

    intervalRef.current = setInterval(() => {
      const newBatch: number[] = [];
      for (let i = 0; i < BATCH_PER_TICK; i++) {
        newBatch.push(bootstrapSample(ORIGINAL_DATA));
      }

      meansRef.current = [...meansRef.current, ...newBatch];

      if (meansRef.current.length >= TOTAL_SAMPLES) {
        meansRef.current = meansRef.current.slice(0, TOTAL_SAMPLES);
        setBootstrapMeans([...meansRef.current]);
        computeCI(meansRef.current);
        stopAnimation();
        setDoneFired(true);
      } else {
        setBootstrapMeans([...meansRef.current]);
        if (meansRef.current.length % 100 === 0) {
          computeCI(meansRef.current);
        }
      }
    }, TICK_MS);
  }, [isAnimating, stopAnimation, computeCI]);

  const handleReset = useCallback(() => {
    stopAnimation();
    meansRef.current = [];
    setBootstrapMeans([]);
    setCiLower(0);
    setCiUpper(0);
    setDoneFired(false);
  }, [stopAnimation]);

  useEffect(() => {
    if (doneFired) {
      onBootstrapDone();
    }
  }, [doneFired, onBootstrapDone]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const progress = Math.min(100, Math.round((bootstrapMeans.length / TOTAL_SAMPLES) * 100));
  const se = bootstrapMeans.length >= 2 ? arrStd(bootstrapMeans) : 0;
  const isDone = bootstrapMeans.length >= TOTAL_SAMPLES;

  // Small original data histogram bins (24 bins between 35 and 65)
  const origMin = 35;
  const origMax = 65;
  const origBinWidth = (origMax - origMin) / 16;
  const origBins = Array.from({ length: 16 }, (_, i) => {
    const lo = origMin + i * origBinWidth;
    const hi = lo + origBinWidth;
    return ORIGINAL_DATA.filter((v) => (i === 15 ? v >= lo && v <= hi : v >= lo && v < hi)).length;
  });
  const origMaxCount = Math.max(...origBins, 1);

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
            <span className="text-xs font-semibold text-[#3bb4a4] uppercase tracking-wider">Section 1</span>
          </div>
          <h2 className="text-xl font-bold text-white">Bootstrap Confidence Intervals</h2>
          <p className="text-sm text-[#94a3b8] mt-1">
            Resample with replacement 1,000 times to build the sampling distribution of the mean.
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
          {/* Original data histogram */}
          <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#94a3b8]">Original Sample (n=30)</span>
              <span className="text-sm font-bold text-[var(--color-accent)]">
                x̄ = {sampleMean.toFixed(2)}
              </span>
            </div>
            <svg viewBox="0 0 400 110" className="w-full">
              {origBins.map((count, i) => {
                const bw = 400 / 16 - 2;
                const bx = i * (400 / 16) + 1;
                const bh = count > 0 ? (count / origMaxCount) * 80 : 0;
                const by = 90 - bh;
                return (
                  <rect key={i} x={bx} y={by} width={bw} height={bh} fill="#1e5d8a" opacity={0.7} rx="1" />
                );
              })}
              {/* Mean line */}
              {(() => {
                const mx = ((sampleMean - origMin) / (origMax - origMin)) * 400;
                return (
                  <g>
                    <line x1={mx} y1={0} x2={mx} y2={90} stroke="var(--color-accent)" strokeWidth="2" strokeDasharray="4 2" />
                    <text x={mx + 4} y={12} fill="var(--color-accent)" fontSize="9" fontWeight="600">mean</text>
                  </g>
                );
              })()}
              {/* X axis */}
              <line x1={0} y1={90} x2={400} y2={90} stroke="#334155" strokeWidth="1" />
              {[35, 42.5, 50, 57.5, 65].map((v) => (
                <text
                  key={v}
                  x={((v - origMin) / (origMax - origMin)) * 400}
                  y={105}
                  fill="#475569"
                  fontSize="8"
                  textAnchor="middle"
                >
                  {v}
                </text>
              ))}
            </svg>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-[#1e293b] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#1e5d8a] to-[#3bb4a4] rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
            <span className="text-xs text-[#94a3b8] whitespace-nowrap font-mono">
              {bootstrapMeans.length} / {TOTAL_SAMPLES}
            </span>
          </div>

          {/* Bootstrap distribution */}
          <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-3">
            <span className="text-xs font-semibold text-[#94a3b8] block mb-2">Bootstrap Distribution of Means</span>
            <HistogramPlot
              values={bootstrapMeans}
              color="#3bb4a4"
              width={520}
              height={220}
              verticalLines={
                isDone
                  ? [
                      { x: ciLower, color: "#1e5d8a", label: `2.5% (${ciLower.toFixed(1)})` },
                      { x: ciUpper, color: "#1e5d8a", label: `97.5% (${ciUpper.toFixed(1)})` },
                    ]
                  : []
              }
              shadedRange={isDone ? { lo: ciLower, hi: ciUpper, color: "#1e5d8a" } : undefined}
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
              {isDone ? "Done" : isAnimating ? "Pause" : bootstrapMeans.length > 0 ? "Resume" : "Run Bootstrap"}
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
                { label: "Sample Mean", value: sampleMean.toFixed(3), color: "var(--color-accent)" },
                { label: "Bootstrap SE", value: se > 0 ? se.toFixed(3) : "—", color: "#3bb4a4" },
                {
                  label: "95% CI Lower",
                  value: ciLower > 0 ? ciLower.toFixed(3) : "—",
                  color: "#1e5d8a",
                },
                {
                  label: "95% CI Upper",
                  value: ciUpper > 0 ? ciUpper.toFixed(3) : "—",
                  color: "#1e5d8a",
                },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-[#94a3b8]">{label}</span>
                  <span className="text-sm font-mono font-semibold" style={{ color }}>
                    {value}
                  </span>
                </div>
              ))}
              {isDone && (
                <div className="mt-2 pt-2 border-t border-[#1e293b]">
                  <span className="text-xs font-semibold text-white">
                    95% CI: [{ciLower.toFixed(2)}, {ciUpper.toFixed(2)}]
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Method explanation */}
          <div className="rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-4">
            <h3 className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-3">How Bootstrap Works</h3>
            <ol className="space-y-2">
              {[
                "Start with your original sample of n observations.",
                "Draw n values at random WITH replacement from the sample.",
                "Compute the statistic (e.g., mean) on this resample.",
                "Repeat 1,000 times to get a distribution of the statistic.",
                "Take the 2.5th and 97.5th percentiles as the 95% CI.",
              ].map((step, i) => (
                <li key={i} className="flex gap-2 text-xs text-[#94a3b8]">
                  <span className="text-[var(--color-accent)] font-bold shrink-0">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Key insight */}
          <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-4">
            <p className="text-xs text-[#94a3b8] leading-relaxed">
              <span className="text-white font-semibold">Few assumptions, not none.</span> Bootstrap
              avoids assuming a particular population distribution, but it does assume your sample is
              representative (i.i.d. draws), and it can struggle with very small samples or extreme
              statistics like the maximum.
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
