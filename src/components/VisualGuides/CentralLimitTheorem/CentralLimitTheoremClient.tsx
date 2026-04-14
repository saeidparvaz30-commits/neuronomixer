"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

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

// ── Initial data ──────────────────────────────────────────────────────────────

function makeInitialState() {
  const selectedDistribution: DistributionType = "uniform";
  const populationData = generatePopulation(selectedDistribution, 500);
  return { selectedDistribution, populationData };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CentralLimitTheoremClient() {
  const { data: session } = useSession();
  const completionFired = useRef(false);

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

  // ── Completion tracking ───────────────────────────────────────────────────

  useEffect(() => {
    if (
      sampleMeans.length >= 1000 &&
      !completionFired.current &&
      session?.user
    ) {
      completionFired.current = true;
      const score = Math.min(10, Math.floor(sampleMeans.length / 100));
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "central-limit-theorem", score }),
      }).catch(() => {});
    }
  }, [sampleMeans.length, session?.user]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleSelectDistribution(type: DistributionType, data: number[]) {
    if (type === selectedDistribution) return;
    setSelectedDistribution(type);
    setPopulationData(data);
    setSampleMeans([]);
    completionFired.current = false;
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
            <span className="w-6 h-px bg-[#d4af37]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#d4af37]">
              STATISTICS
            </span>
            <span className="w-6 h-px bg-[#d4af37]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            The Central Limit Theorem{" "}
            <span className="text-[#d4af37]">in Action</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[680px]">
            See how sampling distributions converge to a bell curve regardless of the
            original population shape. Pick any distribution — uniform, skewed, bimodal —
            draw random samples and watch the magic happen.
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
                desc: "Because sample means are normally distributed, we can compute exact confidence intervals even when the population is not normal.",
                color: "#3bb4a4",
              },
              {
                title: "Hypothesis Testing",
                desc: "t-tests, z-tests, and ANOVA all assume normality of sample means. The CLT is why this assumption holds for large n.",
                color: "#1e5d8a",
              },
              {
                title: "The n ≥ 30 Rule",
                desc: "For most distributions n = 30 is enough for the sampling distribution to be approximately normal. This is where the rule of thumb comes from.",
                color: "#d4af37",
              },
            ].map(({ title, desc, color }) => (
              <div
                key={title}
                className="rounded-xl p-3"
                style={{ background: color + "0a", border: `1px solid ${color}20` }}
              >
                <p className="text-[11px] font-bold mb-1.5" style={{ color }}>
                  {title}
                </p>
                <p className="text-[11px] text-[#94a3b8] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Footer nav */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link
            href="/visual-guides/data-distributions"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            ← Data Distributions
          </Link>
          <Link
            href="/visual-guides/confidence-intervals"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            Confidence Intervals →
          </Link>
        </div>
      </div>
    </div>
  );
}
