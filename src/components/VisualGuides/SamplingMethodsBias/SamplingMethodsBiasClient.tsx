"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import {
  SamplingState,
  SamplingMethod,
  generatePopulation,
  computeMean,
  computeSD,
  drawSample,
} from "./types";
import PopulationVisualizer from "./PopulationVisualizer";
import SamplingMethodSelector from "./SamplingMethodSelector";
import SampleSizeSlider from "./SampleSizeSlider";
import DrawSampleButton from "./DrawSampleButton";
import ResultsComparison from "./ResultsComparison";
import RepeatDrawsVisualization from "./RepeatDrawsVisualization";
import BiasGallery from "./BiasGallery";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import { useGuideMotion } from "@/lib/guideMotion";

const NEXT_GUIDE_SLUG = "confidence-intervals";

// ── Initial state ─────────────────────────────────────────────────────────────

function buildInitialState(): SamplingState {
  const population = generatePopulation(1000);
  return {
    population,
    populationMean: computeMean(population),
    populationSD: computeSD(population),
    selectedMethod: "random",
    sampleSize: 100,
    currentSample: [],
    sampleMean: 0,
    sampleSD: 0,
    repeatedMeans: [],
    drawCount: 0,
    methodsUsed: new Set<SamplingMethod>(["random"]),
    sizeAdjusted: false,
    galleryViewed: false,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SamplingMethodsBiasClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();
  const completionFired = useRef(false);

  const [state, setState] = useState<SamplingState>(() => buildInitialState());

  // ── Derived ────────────────────────────────────────────────────────────────

  const selectedIds = useMemo(
    () => new Set(state.currentSample.map(u => u.id)),
    [state.currentSample]
  );

  // ── Completion ─────────────────────────────────────────────────────────────

  const allComplete =
    state.methodsUsed.size >= 3 &&
    state.sizeAdjusted &&
    state.repeatedMeans.length >= 10 &&
    state.galleryViewed;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "sampling-methods-bias", score: 100 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleMethodChange(method: SamplingMethod) {
    setState(prev => ({
      ...prev,
      selectedMethod: method,
      methodsUsed: new Set([...prev.methodsUsed, method]),
    }));
  }

  function handleSizeChange(n: number) {
    setState(prev => ({
      ...prev,
      sampleSize: n,
      sizeAdjusted: n !== 100,
    }));
  }

  function handleDraw() {
    setState(prev => {
      const sample = drawSample(prev.selectedMethod, prev.population, prev.sampleSize);
      const mean = computeMean(sample);
      const sd = computeSD(sample);
      return {
        ...prev,
        currentSample: sample,
        sampleMean: mean,
        sampleSD: sd,
        repeatedMeans: [...prev.repeatedMeans, mean],
        drawCount: prev.drawCount + 1,
        methodsUsed: new Set([...prev.methodsUsed, prev.selectedMethod]),
      };
    });
  }

  function handleDrawMore(n: number) {
    setState(prev => {
      const newMeans: number[] = [];
      let lastSample = prev.currentSample;
      let lastMean = prev.sampleMean;
      let lastSD = prev.sampleSD;

      for (let i = 0; i < n; i++) {
        const sample = drawSample(prev.selectedMethod, prev.population, prev.sampleSize);
        const mean = computeMean(sample);
        const sd = computeSD(sample);
        newMeans.push(mean);
        if (i === n - 1) {
          lastSample = sample;
          lastMean = mean;
          lastSD = sd;
        }
      }

      return {
        ...prev,
        currentSample: lastSample,
        sampleMean: lastMean,
        sampleSD: lastSD,
        repeatedMeans: [...prev.repeatedMeans, ...newMeans],
        drawCount: prev.drawCount + n,
        methodsUsed: new Set([...prev.methodsUsed, prev.selectedMethod]),
      };
    });
  }

  function handleClear() {
    setState(prev => ({
      ...prev,
      repeatedMeans: [],
      drawCount: 0,
    }));
  }

  function handleGalleryExpand() {
    setState(prev => ({ ...prev, galleryViewed: true }));
  }

  function handleReset() {
    setState(buildInitialState());
  }

  // ── Progress items ──────────────────────────────────────────────────────────

  const progress = [
    {
      label: `Methods tried: ${state.methodsUsed.size}/3`,
      done: state.methodsUsed.size >= 3,
    },
    {
      label: "Sample size adjusted",
      done: state.sizeAdjusted,
    },
    {
      label: `Repeated draws: ${state.repeatedMeans.length}/10`,
      done: state.repeatedMeans.length >= 10,
    },
    {
      label: "Bias gallery viewed",
      done: state.galleryViewed,
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={allComplete} guideSlug="sampling-methods-bias" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Sampling Methods &amp; Bias</span>
        </nav>

        {/* Hero */}
        <motion.section
          className="mb-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              STATISTICS &amp; SAMPLING
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Sampling Methods{" "}
            <span className="text-[var(--color-accent)]">&amp; Bias</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[680px]">
            Simulate random, stratified, cluster, and systematic sampling on a population of 1,000 units.
            See how well each method estimates the true mean, and why convenience sampling leads to
            disaster. Backed by famous real-world failures.
          </p>
        </motion.section>

        {/* Progress tracker */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {progress.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full transition-colors"
                style={{ background: done ? "#3bb4a4" : "#1e293b" }}
              />
              <span className={`text-[11px] ${done ? "text-white" : "text-[#475569]"}`}>
                {label}
              </span>
            </div>
          ))}
          {!session?.user && (
            <p className="text-[11px] text-[#475569] ml-auto">
              <Link href="/auth/sign-in" className="underline underline-offset-2 hover:text-[#94a3b8]">
                Sign in
              </Link>{" "}
              to track progress
            </p>
          )}
          <AnimatePresence>
            {allComplete && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="ml-auto text-[11px] font-semibold text-[#3bb4a4] flex items-center gap-1"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">

          {/* Left column: controls */}
          <div className="space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
            >
              <PopulationVisualizer
                population={state.population}
                selectedIds={selectedIds}
                populationMean={state.populationMean}
                populationSD={state.populationSD}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <SamplingMethodSelector
                selected={state.selectedMethod}
                onChange={handleMethodChange}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <SampleSizeSlider value={state.sampleSize} onChange={handleSizeChange} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <DrawSampleButton
                onDraw={handleDraw}
                onDrawMore={handleDrawMore}
                onClear={handleClear}
                drawCount={state.drawCount}
              />
            </motion.div>
          </div>

          {/* Right column: results */}
          <div className="space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${state.drawCount}-${state.selectedMethod}`}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ResultsComparison
                    population={state.population}
                    populationMean={state.populationMean}
                    populationSD={state.populationSD}
                    currentSample={state.currentSample}
                    sampleMean={state.sampleMean}
                    sampleSD={state.sampleSD}
                  />
                </motion.div>
              </AnimatePresence>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <RepeatDrawsVisualization
                repeatedMeans={state.repeatedMeans}
                populationMean={state.populationMean}
              />
            </motion.div>

            {/* Method summary card */}
            {state.methodsUsed.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">
                  Methods Tried
                </p>
                <div className="flex flex-wrap gap-2">
                  {(["random", "stratified", "cluster", "systematic", "convenience"] as SamplingMethod[]).map(m => {
                    const tried = state.methodsUsed.has(m);
                    const isCurrent = state.selectedMethod === m;
                    const LABELS: Record<SamplingMethod, string> = {
                      random: "Random",
                      stratified: "Stratified",
                      cluster: "Cluster",
                      systematic: "Systematic",
                      convenience: "Convenience",
                    };
                    return (
                      <span
                        key={m}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all"
                        style={{
                          borderColor: isCurrent ? "var(--color-accent)" : tried ? "#3bb4a4" : "#1e293b",
                          color: isCurrent ? "var(--color-accent)" : tried ? "#3bb4a4" : "#334155",
                          background: isCurrent ? "#d4af3718" : tried ? "#3bb4a418" : "transparent",
                        }}
                      >
                        {LABELS[m]}
                      </span>
                    );
                  })}
                </div>
                <p className="text-[10px] text-[#334155] mt-2">
                  Try all 5 methods and compare how each estimates the population mean.
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Bias Gallery */}
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <BiasGallery onExpand={handleGalleryExpand} />
        </motion.div>

        {/* Completion card */}
        <AnimatePresence>
          {allComplete && (
            <motion.div
              variants={card}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="mt-8 rounded-2xl border border-white/[0.08] bg-[#0f172a] overflow-hidden"
            >
              <div className="px-6 pt-6 pb-4 border-b border-white/[0.07]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-px bg-[var(--color-accent)]" />
                  <span className="text-[10px] font-semibold uppercase tracking-[2px] text-[var(--color-accent)]">
                    Guide Complete
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">
                  You Out-Sampled the Bias
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You drew samples several different ways, watched their means
                  cluster or drift from the truth, and connected each failure
                  mode to a famous real-world polling disaster.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Sampling methods tried
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {state.methodsUsed.size} of 5
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      random to convenience
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Samples drawn
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {state.repeatedMeans.length}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      n = {state.sampleSize} from 1,000 units
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Last sample vs true mean
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {state.currentSample.length > 0
                        ? `${state.sampleMean - state.populationMean >= 0 ? "+" : ""}${(
                            state.sampleMean - state.populationMean
                          ).toFixed(2)}`
                        : "n/a"}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      true mean {state.populationMean.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;How you pick the sample decides what the numbers can
                    ever tell you: a small random sample beats a huge
                    convenient one, because bias does not average out with
                    volume.&quot;
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-3">
                <Link
                  href="/visual-guides"
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
                >
                  ← All Guides
                </Link>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
                  >
                    Try Again
                  </button>
                  <Link
                    href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
                    className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
                  >
                    Next Guide →
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer nav (pre-completion) */}
        {!allComplete && (
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
            <Link
              href="/visual-guides/sources-of-bias"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
            >
              ← Sources of Bias
            </Link>
            <Link
              href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
            >
              Confidence Intervals →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
