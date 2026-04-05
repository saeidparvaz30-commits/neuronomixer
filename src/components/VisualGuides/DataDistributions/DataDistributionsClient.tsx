"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { DistType, DISTRIBUTIONS, computeHistogram } from "./types";
import DistributionSelector from "./DistributionSelector";
import HistogramChart from "./HistogramChart";
import StatsPanel from "./StatsPanel";

const DIST_ORDER: DistType[] = ["normal", "uniform", "skewed-right", "skewed-left", "bimodal"];
const SAMPLE_SIZES = [50, 200, 1000];

export default function DataDistributionsClient() {
  const { data: session } = useSession();
  const [distType, setDistType]   = useState<DistType>("normal");
  const [sampleSize, setSampleSize] = useState(200);
  const [binCount, setBinCount]   = useState(20);
  const [showMean, setShowMean]   = useState(true);
  const [showMedian, setShowMedian] = useState(true);
  const [showStd, setShowStd]     = useState(false);
  const [explored, setExplored]   = useState<Set<DistType>>(new Set(["normal"]));
  const [changedSampleSize, setChangedSampleSize] = useState(false);
  const completionFired = useRef(false);

  const allComplete = explored.size >= 4 && changedSampleSize;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "data-distributions", score: 5 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  const data = useMemo(
    () => DISTRIBUTIONS[distType].generate(sampleSize),
    [distType, sampleSize]
  );

  const bins = useMemo(() => computeHistogram(data, binCount), [data, binCount]);
  const meta = DISTRIBUTIONS[distType];

  function handleDistChange(d: DistType) {
    setDistType(d);
    setExplored(prev => new Set([...prev, d]));
  }

  function handleSampleSize(n: number) {
    setSampleSize(n);
    setChangedSampleSize(true);
  }

  const progress = [
    { label: `Distributions seen: ${explored.size}/4`, done: explored.size >= 4 },
    { label: "Sample size changed", done: changedSampleSize },
  ];

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Data Distributions</span>
        </nav>

        {/* Hero */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              Statistics
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Data Distributions:{" "}
            <span className="text-[var(--color-accent)]">Shape Matters</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[620px]">
            Before running statistics, understand your data&apos;s shape. Normal, uniform, skewed, bimodal — the distribution
            determines which tests apply, how to interpret mean vs. median, and where outliers hide.
          </p>
        </section>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {progress.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full transition-colors ${done ? "bg-[#3bb4a4]" : "bg-[#1e293b]"}`} />
              <span className={`text-[11px] ${done ? "text-white" : "text-[#475569]"}`}>{label}</span>
            </div>
          ))}
          {!session?.user && (
            <p className="text-[11px] text-[#475569] ml-auto">
              <Link href="/auth/sign-in" className="underline underline-offset-2 hover:text-[#94a3b8]">Sign in</Link>{" "}to track progress
            </p>
          )}
          <AnimatePresence>
            {allComplete && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="ml-auto text-[11px] font-semibold text-[#3bb4a4] flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <DistributionSelector current={distType} onChange={handleDistChange} />
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[11px] text-[#475569]">N =</span>
            {SAMPLE_SIZES.map(n => (
              <button
                key={n}
                onClick={() => handleSampleSize(n)}
                className="px-3 py-1 rounded-lg text-[11px] font-semibold border transition-colors"
                style={{
                  borderColor: sampleSize === n ? "#d4af37" : "#1e293b",
                  color: sampleSize === n ? "#d4af37" : "#475569",
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <div className="space-y-4">
            {/* Histogram */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <AnimatePresence mode="wait">
                  <motion.h2
                    key={distType}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-[14px] font-bold"
                    style={{ color: meta.color }}
                  >
                    {meta.label} Distribution — n={sampleSize}
                  </motion.h2>
                </AnimatePresence>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#475569]">Bins:</span>
                  <input
                    type="range" min={5} max={50} value={binCount}
                    onChange={e => setBinCount(Number(e.target.value))}
                    className="w-24" style={{ accentColor: meta.color }}
                  />
                  <span className="text-[10px] text-[#d4af37] font-mono">{binCount}</span>
                </div>
              </div>
              <HistogramChart
                bins={bins}
                color={meta.color}
                showMean={showMean}
                showMedian={showMedian}
                showStd={showStd}
                data={data}
              />
            </div>

            {/* Description */}
            <AnimatePresence mode="wait">
              <motion.div
                key={distType}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5"
              >
                <p className="text-[13px] text-[#94a3b8] leading-relaxed mb-4">{meta.description}</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Mean vs Median", value: meta.mean },
                    { label: "Median location", value: meta.median },
                    { label: "Mode", value: meta.mode },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg border border-[#1e293b] p-2.5">
                      <p className="text-[9px] text-[#475569] uppercase tracking-wide mb-1">{label}</p>
                      <p className="text-[11px] text-white font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-lg p-2.5" style={{ background: meta.color + "0d", border: `1px solid ${meta.color}20` }}>
                  <p className="text-[10px] font-semibold uppercase tracking-[1px] mb-1" style={{ color: meta.color }}>
                    Real-World Examples
                  </p>
                  <p className="text-[11px] text-[#94a3b8]">{meta.realWorld}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right panel */}
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
            <StatsPanel
              data={data}
              color={meta.color}
              showMean={showMean}
              showMedian={showMedian}
              showStd={showStd}
              onToggleMean={() => setShowMean(v => !v)}
              onToggleMedian={() => setShowMedian(v => !v)}
              onToggleStd={() => setShowStd(v => !v)}
            />

            {/* Distribution comparison note */}
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[#475569] mb-2">
                Explored
              </p>
              <div className="flex flex-wrap gap-1.5">
                {DIST_ORDER.map(d => (
                  <div
                    key={d}
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      background: explored.has(d) ? DISTRIBUTIONS[d].color : "#1e293b",
                    }}
                    title={DISTRIBUTIONS[d].label}
                  />
                ))}
              </div>
              <p className="text-[9px] text-[#334155] mt-1.5">Try all 5 distributions + change sample size to complete this guide</p>
            </div>
          </div>
        </div>

        {/* Footer nav */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link
            href="/visual-guides/dimensionality-reduction"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            ← Previous Guide
          </Link>
          <Link
            href="/visual-guides"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            All Guides →
          </Link>
        </div>
      </div>
    </div>
  );
}
