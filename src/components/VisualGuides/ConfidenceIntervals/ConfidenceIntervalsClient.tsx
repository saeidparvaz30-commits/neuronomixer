"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";
import {
  ConfidenceLevel,
  ConfidenceInterval,
  run100Experiments,
  TRUE_MEAN,
} from "./types";
import ConfidenceLevelToggle from "./ConfidenceLevelToggle";
import ExperimentPanel from "./ExperimentPanel";
import IntervalVisualization from "./IntervalVisualization";
import IntervalExpander from "./IntervalExpander";
import StatsPanel from "./StatsPanel";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

const NEXT_GUIDE_SLUG = "hypothesis-testing";

export default function ConfidenceIntervalsClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();
  const completionFired = useRef(false);

  const [confidenceLevel, setConfidenceLevel] = useState<ConfidenceLevel>(95);
  const [intervals, setIntervals] = useState<ConfidenceInterval[]>([]);
  const [expandedSampleId, setExpandedSampleId] = useState<number | null>(null);
  const [totalIntervalsGenerated, setTotalIntervalsGenerated] = useState(0);
  const [samplesExplored, setSamplesExplored] = useState(0);
  const exploredIds = useRef<Set<number>>(new Set());

  // ── Completion tracking ──────────────────────────────────────────────────────

  const allComplete = totalIntervalsGenerated >= 50 && samplesExplored >= 3;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "confidence-intervals", score: 100 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleGenerate() {
    const newIntervals = run100Experiments(confidenceLevel);
    setIntervals(newIntervals);
    setExpandedSampleId(null);
    setTotalIntervalsGenerated((prev) => prev + 100);
  }

  function handleConfidenceLevelChange(cl: ConfidenceLevel) {
    setConfidenceLevel(cl);
    if (intervals.length > 0) {
      const newIntervals = run100Experiments(cl);
      setIntervals(newIntervals);
      setExpandedSampleId(null);
      setTotalIntervalsGenerated((prev) => prev + 100);
    }
  }

  function handleIntervalClick(sampleId: number) {
    // Toggle expansion
    setExpandedSampleId((prev) => (prev === sampleId ? null : sampleId));
    // Track unique clicks for completion
    if (!exploredIds.current.has(sampleId)) {
      exploredIds.current.add(sampleId);
      setSamplesExplored(exploredIds.current.size);
    }
  }

  function handleReset() {
    setConfidenceLevel(95);
    setIntervals([]);
    setExpandedSampleId(null);
    setTotalIntervalsGenerated(0);
    setSamplesExplored(0);
    exploredIds.current = new Set();
  }

  // ── Progress ─────────────────────────────────────────────────────────────────

  const progress = [
    {
      label: `Intervals generated: ${totalIntervalsGenerated} / 100`,
      done: totalIntervalsGenerated >= 50,
    },
    {
      label: `Samples explored: ${samplesExplored} / 3`,
      done: samplesExplored >= 3,
    },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={allComplete} guideSlug="confidence-intervals" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Confidence Intervals</span>
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
            Confidence Intervals:{" "}
            <span className="text-[var(--color-accent)]">What They Actually Mean</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[680px]">
            Run 100 repeated experiments. Each draws a sample of{" "}
            <span className="text-white font-semibold">n = 30</span> from a
            population with μ = {TRUE_MEAN} and computes a confidence interval.
            Watch how many capture the true mean, and how width changes with
            confidence level.
          </p>
        </motion.section>

        {/* Progress indicators */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {progress.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full transition-colors"
                style={{ background: done ? "#3bb4a4" : "#1e293b" }}
              />
              <span
                className={`text-[11px] ${done ? "text-white" : "text-[#475569]"}`}
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

        {/* Confidence level toggle */}
        <div className="mb-5">
          <ConfidenceLevelToggle
            current={confidenceLevel}
            onChange={handleConfidenceLevelChange}
          />
        </div>

        {/* Experiment panel */}
        <div className="mb-6">
          <ExperimentPanel
            onGenerate={handleGenerate}
            confidenceLevel={confidenceLevel}
            hasIntervals={intervals.length > 0}
          />
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">

          {/* Left: visualization + expander */}
          <div className="space-y-4">
            {/* Interval visualization card */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`vis-${confidenceLevel}-${totalIntervalsGenerated}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <IntervalVisualization
                    intervals={intervals}
                    trueParameter={TRUE_MEAN}
                    confidenceLevel={confidenceLevel}
                    onIntervalClick={handleIntervalClick}
                    expandedSampleId={expandedSampleId}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Expanded sample breakdown */}
            <IntervalExpander
              expandedSampleId={expandedSampleId}
              intervals={intervals}
              confidenceLevel={confidenceLevel}
            />
          </div>

          {/* Right: stats panel + key insight */}
          <div className="space-y-4">
            <StatsPanel
              intervals={intervals}
              confidenceLevel={confidenceLevel}
            />

            {/* Key insight card */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[1px] text-[#475569]">
                Key Insight
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                A {confidenceLevel}% CI does{" "}
                <strong className="text-white">NOT</strong> mean there is a{" "}
                {confidenceLevel}% probability the true mean is in this specific
                interval.
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                It means: if you repeated the experiment many times,{" "}
                <span className="text-[var(--color-accent)] font-semibold">
                  ~{confidenceLevel}% of the intervals you construct
                </span>{" "}
                would contain the true parameter.
              </p>
              <div
                className="rounded-xl p-3 text-[11px] text-[#94a3b8] leading-relaxed"
                style={{ background: "#d4af3710", borderLeft: "3px solid var(--color-accent)" }}
              >
                The true mean is either in any given interval or it is not; the
                randomness is in the <em>procedure</em>, not the parameter.
              </div>
            </div>

            {/* Width comparison */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[1px] text-[#475569]">
                Width vs. Confidence
              </p>
              {([90, 95, 99] as ConfidenceLevel[]).map((level) => {
                const z = { 90: 1.699, 95: 2.045, 99: 2.756 }[level]; // t critical values, df = 29
                // Approximate width using avg SE from current intervals or a reference
                const avgSE =
                  intervals.length > 0
                    ? intervals.reduce(
                        (a, ci) => a + ci.sd / Math.sqrt(30),
                        0
                      ) / intervals.length
                    : 2.74; // ≈ 15/√30
                const approxWidth = 2 * z * avgSE;
                return (
                  <div key={level} className="flex items-center gap-3">
                    <span
                      className="text-[10px] font-semibold w-12 flex-shrink-0"
                      style={{
                        color: level === confidenceLevel ? "var(--color-accent)" : "#475569",
                      }}
                    >
                      {level}% CI
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-[#1e293b] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(approxWidth / (2 * 2.576 * (intervals.length > 0 ? intervals.reduce((a, ci) => a + ci.sd / Math.sqrt(30), 0) / intervals.length : 2.74))) * 100}%`,
                          background:
                            level === confidenceLevel ? "var(--color-accent)" : "#334155",
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-[#475569] w-10 text-right flex-shrink-0">
                      ±{(z * avgSE).toFixed(2)}
                    </span>
                  </div>
                );
              })}
              <p className="text-[9px] text-[#334155] leading-relaxed">
                Higher confidence = wider intervals. There is always a tradeoff
                between precision and confidence.
              </p>
            </div>
          </div>
        </div>

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
                  You Ran the Procedure, Not Just One Interval
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You generated batches of intervals, watched the capture rate hover
                  near the promised confidence level, and opened individual samples to
                  see where the misses come from.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Intervals generated</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {totalIntervalsGenerated}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      n = 30 per experiment
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Capture rate, latest run
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {intervals.filter((ci) => ci.containsTruth).length} of{" "}
                      {intervals.length}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      at {confidenceLevel}% confidence
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Samples inspected</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {samplesExplored}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      opened interval by interval
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;The confidence lives in the procedure, not in any single
                    interval. Each interval either contains the true mean or it does
                    not; what you can trust is that the recipe captures it at the
                    promised rate over many repeats.&quot;
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
              href="/visual-guides/p-values"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
            >
              ← P-Values
            </Link>
            <Link
              href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
            >
              Hypothesis Testing →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
