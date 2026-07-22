"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";
import type { DatasetType, ChartOptionId, MisleadingId } from "./types";
import { DATASETS } from "./types";
import ChartChooserSection from "./ChartChooserSection";
import MisleadingChartsGallery from "./MisleadingChartsGallery";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

const NEXT_GUIDE_SLUG = "probability-fundamentals";

export default function VisualizingDataChartsClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();
  const completionFired = useRef(false);

  const [selectedDataset, setSelectedDataset] = useState<DatasetType>("test_scores");
  const [selectedChartOption, setSelectedChartOption] = useState<ChartOptionId | null>(null);
  const [revealedMisleadingCharts, setRevealedMisleadingCharts] = useState<Set<MisleadingId>>(new Set());
  const [datasetsCorrected, setDatasetsCorrected] = useState<Set<DatasetType>>(new Set());

  // Completion: at least 3 datasets correct + all 5 misleading charts revealed
  const isComplete = datasetsCorrected.size >= 3 && revealedMisleadingCharts.size === 5;

  useEffect(() => {
    if (isComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "visualizing-data-charts", score: 100 }),
      }).catch(() => {});
    }
  }, [isComplete, session?.user]);

  function handleDatasetChange(id: DatasetType) {
    setSelectedDataset(id);
    setSelectedChartOption(null);
  }

  function handleChartSelect(id: ChartOptionId) {
    setSelectedChartOption(id);
    const dataset = DATASETS.find((d) => d.id === selectedDataset)!;
    if (dataset.bestChartId === id) {
      setDatasetsCorrected((prev) => new Set([...prev, selectedDataset]));
    }
  }

  function handleReveal(id: MisleadingId) {
    setRevealedMisleadingCharts((prev) => new Set([...prev, id]));
  }

  function handleReset() {
    setSelectedDataset("test_scores");
    setSelectedChartOption(null);
    setRevealedMisleadingCharts(new Set());
    setDatasetsCorrected(new Set());
  }

  const progress = [
    { label: `Datasets solved: ${datasetsCorrected.size}/3`, done: datasetsCorrected.size >= 3 },
    { label: `Misleading charts revealed: ${revealedMisleadingCharts.size}/5`, done: revealedMisleadingCharts.size === 5 },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="visualizing-data-charts" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Visualizing Data: Charts That Tell the Truth</span>
        </nav>

        {/* Hero */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">Statistics</span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Visualizing Data:{" "}
            <span className="text-[var(--color-accent)]">Charts That Tell the Truth</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[680px] mb-4">
            Every dataset has a story. Discover which chart reveals it most clearly, and learn how bad design can hide the truth, or even lie outright.
          </p>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed max-w-[680px]">
            The same data can tell radically different stories depending on the chart you choose. In this guide, you&apos;ll pick the right chart type for four real datasets, then expose five classic techniques used to deceive with visualization.
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
            {isComplete && (
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

        {/* ── Section 1: Chart Chooser ─────────────────────────────────────── */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center">
              <span className="text-[12px] font-bold text-[var(--color-accent)]">1</span>
            </span>
            <div>
              <h2 className="text-[18px] font-bold text-white">Chart Chooser</h2>
              <p className="text-[12px] text-[#94a3b8]">
                Select a dataset, read the analytical question, and pick the chart type that answers it best.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
            <ChartChooserSection
              selectedDataset={selectedDataset}
              selectedChartOption={selectedChartOption}
              datasetsCorrected={datasetsCorrected}
              onDatasetChange={handleDatasetChange}
              onChartSelect={handleChartSelect}
            />
          </div>
        </section>

        {/* Section divider */}
        <div className="flex items-center gap-4 mb-10">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-[11px] text-[#475569] uppercase tracking-widest font-semibold">Charts can also deceive</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        {/* ── Section 2: Misleading Charts Gallery ────────────────────────── */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#ef4444]/10 border border-[#ef4444]/30 flex items-center justify-center">
              <span className="text-[12px] font-bold text-[#ef4444]">2</span>
            </span>
            <div>
              <h2 className="text-[18px] font-bold text-white">Misleading Charts Gallery</h2>
              <p className="text-[12px] text-[#94a3b8]">
                Five real chart design techniques used to deceive. Reveal each one to see the honest version.
              </p>
            </div>
          </div>

          <MisleadingChartsGallery
            revealedCharts={revealedMisleadingCharts}
            onReveal={handleReveal}
          />
        </section>

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
                  You Can Tell an Honest Chart From a Lie
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You matched datasets to the chart that answers their question
                  and exposed the classic design tricks that make true numbers
                  leave false impressions.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Datasets matched to the right chart
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {datasetsCorrected.size} of {DATASETS.length}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      chosen for the question, not the look
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Deception techniques exposed
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {revealedMisleadingCharts.size} of 5
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      each shown next to its honest version
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;A chart is part of the argument: the right form
                    reveals the structure of the data, while a truncated axis or
                    a scaled picture can turn a true number into a false
                    impression.&quot;
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
        {!isComplete && (
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
            <Link
              href="/visual-guides/data-distributions"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
            >
              ← Previous: Data Distributions
            </Link>
            <Link
              href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
            >
              Next: Probability Fundamentals →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
