"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { PopDist, POPULATIONS, sampleMean, computeStats } from "./types";
import PopulationChart from "./PopulationChart";
import SamplingDistChart from "./SamplingDistChart";

const POP_ORDER: PopDist[] = ["uniform", "exponential", "bimodal", "custom"];

// Theoretical population stats (cached)
const POP_STATS: Record<PopDist, { mean: number; std: number }> = {
  uniform:     { mean: 50, std: 28.87 },
  exponential: { mean: 25, std: 20 },
  bimodal:     { mean: 50, std: 25 },
  custom:      { mean: 20, std: 15 },
};

export default function CentralLimitTheoremClient() {
  const { data: session } = useSession();
  const [popDist, setPopDist]         = useState<PopDist>("uniform");
  const [sampleSize, setSampleSize]   = useState(30);
  const [sampleMeans, setSampleMeans] = useState<number[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [triedDists, setTriedDists]   = useState<Set<PopDist>>(new Set());
  const [drewManySamples, setDrewManySamples] = useState(false);
  const completionFired = useRef(false);
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allComplete = triedDists.size >= 3 && drewManySamples;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "central-limit-theorem", score: 6 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  function drawSamples(n: number) {
    const newMeans = Array.from({ length: n }, () => sampleMean(popDist, sampleSize));
    setSampleMeans(prev => {
      const next = [...prev, ...newMeans];
      if (next.length >= 50) setDrewManySamples(true);
      return next;
    });
    setTriedDists(prev => new Set([...prev, popDist]));
  }

  function handleAnimate() {
    setIsAnimating(true);
    let drawn = 0;
    function tick() {
      if (drawn >= 100) { setIsAnimating(false); return; }
      const batch = Math.min(5, 100 - drawn);
      drawn += batch;
      const newMeans = Array.from({ length: batch }, () => sampleMean(popDist, sampleSize));
      setSampleMeans(prev => {
        const next = [...prev, ...newMeans];
        if (next.length >= 50) setDrewManySamples(true);
        return next;
      });
      setTriedDists(prev => new Set([...prev, popDist]));
      animRef.current = setTimeout(tick, 80);
    }
    tick();
  }

  function reset() {
    if (animRef.current) clearTimeout(animRef.current);
    setIsAnimating(false);
    setSampleMeans([]);
  }

  useEffect(() => {
    reset();
  }, [popDist, sampleSize]);

  const stats = computeStats(sampleMeans);
  const popStats = POP_STATS[popDist];
  const theoreticalSE = popStats.std / Math.sqrt(sampleSize);
  const meta = POPULATIONS[popDist];

  const progress = [
    { label: `Distributions tried: ${triedDists.size}/3`, done: triedDists.size >= 3 },
    { label: "≥50 samples drawn",                          done: drewManySamples },
  ];

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Central Limit Theorem</span>
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
            Central Limit Theorem:{" "}
            <span className="text-[var(--color-accent)]">Why Everything Is Normal</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[640px]">
            Pick any population — uniform, exponential, bimodal, skewed. Draw enough random samples
            and compute their means. Watch the distribution of means always converge to a bell curve.
            This is the most important theorem in all of statistics.
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
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Distribution selector */}
          <div className="flex flex-wrap gap-2">
            {POP_ORDER.map(d => {
              const m = POPULATIONS[d];
              const active = d === popDist;
              return (
                <button
                  key={d}
                  onClick={() => setPopDist(d)}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-colors"
                  style={{
                    borderColor: active ? m.color : "#1e293b",
                    color: active ? m.color : "#475569",
                    background: active ? m.color + "14" : "transparent",
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
          {/* Sample size */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[11px] text-[#475569]">n =</span>
            {[5, 10, 30, 100].map(n => (
              <button
                key={n}
                onClick={() => setSampleSize(n)}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Population */}
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
            <h2 className="text-[13px] font-bold text-white mb-1">
              Population Distribution{" "}
              <span className="text-[11px] font-normal" style={{ color: meta.color }}>({meta.label})</span>
            </h2>
            <p className="text-[11px] text-[#475569] mb-3">{meta.description}</p>
            <AnimatePresence mode="wait">
              <motion.div key={popDist} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <PopulationChart dist={popDist} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Sampling distribution */}
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div>
                <h2 className="text-[13px] font-bold text-white">
                  Sampling Distribution of x̄
                  <span className="text-[11px] font-normal text-[#475569] ml-1">({sampleMeans.length} samples)</span>
                </h2>
                <p className="text-[11px] text-[#475569]">Sample size n={sampleSize} | Gold curve = predicted normal</p>
              </div>
            </div>

            <SamplingDistChart
              means={sampleMeans}
              color={meta.color}
              sampleSize={sampleSize}
              theoreticalMean={popStats.mean}
              theoreticalStd={popStats.std}
            />

            {/* Action buttons */}
            <div className="flex gap-2 mt-3 flex-wrap">
              <button
                onClick={() => drawSamples(1)}
                disabled={isAnimating}
                className="px-4 py-2 rounded-xl text-[11px] font-semibold border border-[#334155] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors disabled:opacity-40"
              >
                Draw Sample
              </button>
              <button
                onClick={() => drawSamples(10)}
                disabled={isAnimating}
                className="px-4 py-2 rounded-xl text-[11px] font-semibold border border-[#334155] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors disabled:opacity-40"
              >
                Draw 10
              </button>
              <button
                onClick={handleAnimate}
                disabled={isAnimating}
                className="px-4 py-2 rounded-xl text-[11px] font-semibold border border-[#1e5d8a] text-[#3b82f6] hover:border-[#3b82f6] transition-colors disabled:opacity-40"
              >
                {isAnimating ? "Animating…" : "Animate 100"}
              </button>
              <button
                onClick={reset}
                className="px-4 py-2 rounded-xl text-[11px] font-semibold border border-[#1e293b] text-[#475569] hover:border-[#334155] hover:text-white transition-colors ml-auto"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Stats comparison */}
        {sampleMeans.length >= 5 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 mb-6"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-4">
              CLT Predictions vs Observed
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Expected mean",      expected: popStats.mean.toFixed(1),         observed: stats.mean.toFixed(1),  color: "#3b82f6" },
                { label: "Expected SE",        expected: theoreticalSE.toFixed(2),          observed: stats.std.toFixed(2),   color: "#3bb4a4" },
                { label: "Samples drawn",      expected: "∞ → normal",                       observed: String(sampleMeans.length), color: "#d4af37" },
                { label: "Convergence",        expected: "Normal shape",                     observed: sampleMeans.length >= 30 ? "Converging ✓" : "Not yet", color: meta.color },
              ].map(({ label, expected, observed, color }) => (
                <div key={label} className="rounded-xl border border-[#1e293b] p-3">
                  <p className="text-[9px] text-[#475569] uppercase tracking-wide mb-1.5">{label}</p>
                  <p className="text-[11px] text-[#475569]">Theory: <span className="text-[#94a3b8] font-medium">{expected}</span></p>
                  <p className="text-[11px] text-[#475569]">Observed: <span className="font-bold" style={{ color }}>{observed}</span></p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* CLT explanation */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
          <h3 className="text-[15px] font-bold text-white mb-3">Why Does This Matter?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                title: "Confidence Intervals",
                desc: "Because sample means are normally distributed, we can compute exact confidence intervals — even if the population is not normal.",
                color: "#3b82f6",
              },
              {
                title: "Hypothesis Testing",
                desc: "t-tests, z-tests, and ANOVA all assume normality of sample means. The CLT is why this assumption is valid for large n.",
                color: "#3bb4a4",
              },
              {
                title: "n ≥ 30 Rule",
                desc: "For most distributions, n=30 is enough for the sampling distribution to be approximately normal. This is where the rule of thumb comes from.",
                color: "#d4af37",
              },
            ].map(({ title, desc, color }) => (
              <div key={title} className="rounded-xl p-3" style={{ background: color + "0a", border: `1px solid ${color}20` }}>
                <p className="text-[11px] font-bold mb-1.5" style={{ color }}>{title}</p>
                <p className="text-[11px] text-[#94a3b8] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer nav */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link
            href="/visual-guides/data-pipeline"
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
