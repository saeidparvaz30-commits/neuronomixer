"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";

import {
  DistributionType,
  generatePopulation,
  drawSample,
  mean,
  stdDev,
} from "./types";
import PopulationPanel from "./PopulationPanel";
import SimulationControls from "./SimulationControls";
import SamplingVisualization from "./SamplingVisualization";
import ComparisonView from "./ComparisonView";
import SummaryMetrics from "./SummaryMetrics";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

// ── Initial data ──────────────────────────────────────────────────────────────

function makeInitialState() {
  const selectedDistribution: DistributionType = "uniform";
  const populationData = generatePopulation(selectedDistribution, 500);
  return { selectedDistribution, populationData };
}

// ── Component ─────────────────────────────────────────────────────────────────

const NEXT_GUIDE_SLUG = "confidence-intervals";

export default function CentralLimitTheoremClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();

  const initial = useMemo(() => makeInitialState(), []);

  const [selectedDistribution, setSelectedDistribution] =
    useState<DistributionType>(initial.selectedDistribution);
  const [populationData, setPopulationData] = useState<number[]>(
    initial.populationData
  );
  const [sampleSize, setSampleSize] = useState(30);
  const [sampleMeans, setSampleMeans] = useState<number[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runRef = useRef(false); // tracks if "Run 1000×" is in flight

  // ── Derived population stats ─────────────────────────────────────────────

  const populationMean = useMemo(() => mean(populationData), [populationData]);
  const populationSD = useMemo(() => stdDev(populationData), [populationData]);
  const sampleMeansSD = useMemo(() => stdDev(sampleMeans), [sampleMeans]);
  const theoreticalSE = populationSD / Math.sqrt(sampleSize);

  // ── Completion tracking ───────────────────────────────────────────────────
  // Sticky flag: set once the user has genuinely run the full 1000-sample
  // simulation, and never reset (so resets / distribution switches cannot
  // re-trigger the completion flow). GuideCompletion itself fires the API
  // call exactly once.
  const [hasCompleted, setHasCompleted] = useState(false);

  useEffect(() => {
    if (sampleMeans.length >= 1000) {
      setHasCompleted(true);
    }
  }, [sampleMeans.length]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleSelectDistribution(type: DistributionType, data: number[]) {
    if (type === selectedDistribution) return;
    setSelectedDistribution(type);
    setPopulationData(data);
    setSampleMeans([]);
  }

  function handleSampleSizeChange(n: number) {
    setSampleSize(n);
    setSampleMeans([]);
  }

  function handleDrawOne() {
    if (isRunning) return;
    const sample = drawSample(populationData, sampleSize);
    setSampleMeans((prev) => [...prev, mean(sample)]);
  }

  async function handleRunThousand() {
    if (runRef.current) return;
    runRef.current = true;
    setIsRunning(true);

    const batchSize = 50;
    const batches = Math.ceil(1000 / batchSize);
    const newMeans: number[] = [];

    for (let b = 0; b < batches; b++) {
      for (let i = 0; i < batchSize; i++) {
        const sample = drawSample(populationData, sampleSize);
        newMeans.push(mean(sample));
      }
      // Capture slice for this batch (closure)
      const slice = newMeans.slice(b * batchSize, (b + 1) * batchSize);
      setSampleMeans((prev) => [...prev, ...slice]);
      await new Promise<void>((r) => setTimeout(r, 10));
    }

    runRef.current = false;
    setIsRunning(false);
  }

  function handleReset() {
    setSampleMeans([]);
  }

  // Full reset for the completion card's Try Again: restores every piece of
  // state (not just sampleMeans) and cancels any in-flight "Run 1000×" run.
  function handleFullReset() {
    runRef.current = false;
    setIsRunning(false);
    const next = makeInitialState();
    setSelectedDistribution(next.selectedDistribution);
    setPopulationData(next.populationData);
    setSampleSize(30);
    setSampleMeans([]);
  }

  // ── Progress ──────────────────────────────────────────────────────────────

  const isComplete = sampleMeans.length >= 1000;

  const progress = [
    { label: "Draw 1 sample", done: sampleMeans.length >= 1 },
    { label: "50 samples drawn", done: sampleMeans.length >= 50 },
    { label: "1000 samples (run CLT!)", done: isComplete },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion
        isComplete={hasCompleted}
        guideSlug="central-limit-theorem"
        score={100}
      />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white">The Central Limit Theorem in Action</span>
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
              STATISTICS
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            The Central Limit Theorem{" "}
            <span className="text-[var(--color-accent)]">in Action</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[680px]">
            See how sampling distributions converge to a bell curve regardless of the
            original population shape. Pick any distribution: uniform, skewed, or bimodal.
            Then draw random samples and watch the magic happen.
          </p>
        </motion.section>

        {/* Progress row */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {progress.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full transition-colors"
                style={{ background: done ? "#3bb4a4" : "#1e293b" }}
              />
              <span
                className={`text-[11px] transition-colors ${done ? "text-white" : "text-[#475569]"}`}
              >
                {label}
              </span>
            </div>
          ))}
          {!session?.user && (
            <p className="text-[11px] text-[#475569] ml-auto">
              <Link
                href="/auth/sign-in"
                className="underline underline-offset-2 hover:text-[#94a3b8]"
              >
                Sign in
              </Link>{" "}
              to track progress
            </p>
          )}
          <AnimatePresence>
            {isComplete && (
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Main 2-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 mb-6">

          {/* Left column */}
          <div className="space-y-5">
            <PopulationPanel
              selectedDistribution={selectedDistribution}
              populationData={populationData}
              onSelect={handleSelectDistribution}
            />
            <SimulationControls
              sampleSize={sampleSize}
              onSampleSizeChange={handleSampleSizeChange}
              onDrawOne={handleDrawOne}
              onRunThousand={handleRunThousand}
              onReset={handleReset}
              isRunning={isRunning}
              samplesCount={sampleMeans.length}
            />
          </div>

          {/* Right column */}
          <div className="space-y-5">
            <SamplingVisualization
              sampleMeans={sampleMeans}
              sampleSize={sampleSize}
              populationMean={populationMean}
              populationSD={populationSD}
            />
            <ComparisonView
              populationData={populationData}
              sampleMeans={sampleMeans}
              distributionType={selectedDistribution}
              sampleSize={sampleSize}
            />
            <SummaryMetrics
              sampleSize={sampleSize}
              sampleMeans={sampleMeans}
              populationSD={populationSD}
            />
          </div>
        </div>

        {/* Why does this matter */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 mb-6"
        >
          <h3 className="text-[15px] font-bold text-white mb-3">
            Why the CLT Is the Most Important Theorem in Statistics
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                title: "Confidence Intervals",
                desc: "Because sample means become approximately normal, we can build confidence intervals even when the population is not normal. The intervals are approximations whose accuracy improves as n grows.",
                color: "#3bb4a4",
              },
              {
                title: "Hypothesis Testing",
                desc: "t-tests, z-tests, and ANOVA rely on approximate normality of sample means. The CLT is why this approximation becomes good for large n.",
                color: "#1e5d8a",
              },
              {
                title: "The n ≥ 30 Rule of Thumb",
                desc: "For mildly non-normal distributions, n = 30 often gives a reasonably normal sampling distribution. But it is a heuristic, not a law: heavy tails or extreme skew can need hundreds of observations, and distributions without finite variance never converge at all.",
                color: "var(--color-accent)",
              },
            ].map(({ title, desc, color }) => (
              <div
                key={title}
                className="rounded-xl p-3"
                style={{ background: `color-mix(in srgb, ${color} 4%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 13%, transparent)` }}
              >
                <p className="text-[11px] font-bold mb-1.5" style={{ color }}>
                  {title}
                </p>
                <p className="text-[11px] text-[#94a3b8] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Completion card */}
        <AnimatePresence>
          {isComplete && (
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
                  You Watched the Bell Curve Emerge
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You drew {sampleMeans.length.toLocaleString()} sample means from a
                  population of your choosing and watched their distribution converge to
                  a normal curve, exactly as the theorem promises.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Sample means collected</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {sampleMeans.length.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      n = {sampleSize} per sample
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Population shape</p>
                    <p className="text-[14px] font-mono font-bold text-white capitalize">
                      {selectedDistribution}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      mean {populationMean.toFixed(2)}, SD {populationSD.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      SE of the mean, observed
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {sampleMeansSD.toFixed(3)}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      theory σ/√n = {theoreticalSE.toFixed(3)}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Whatever shape the population takes, the means of repeated
                    samples pile up into a bell curve whose spread shrinks like σ/√n.
                    That single fact is what lets a small sample speak for a large
                    population.&quot;
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
                    onClick={handleFullReset}
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
        {!isComplete && (
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
            <Link
              href="/visual-guides/data-distributions"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
            >
              ← Data Distributions
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
