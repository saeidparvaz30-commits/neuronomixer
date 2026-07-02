"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { Strategy, ORIGINAL_ROWS, applyStrategy, STRATEGY_META } from "./types";
import DataTable    from "./DataTable";
import StrategyPanel from "./StrategyPanel";
import ScatterPlot   from "./ScatterPlot";
import AccuracyMeter from "./AccuracyMeter";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

export default function MissingDataClient() {
  const { data: session } = useSession();
  const [selected,  setSelected]  = useState<Strategy>(null);
  const [explored,  setExplored]  = useState<Set<Exclude<Strategy, null>>>(new Set());
  const completionFired           = useRef(false);

  const rows = applyStrategy(selected);

  // Track explored strategies
  function handleSelect(s: Strategy) {
    setSelected(s);
    if (s) {
      setExplored((prev) => {
        const next = new Set(prev);
        next.add(s);
        return next;
      });
    }
  }

  // Guide completion: all 3 explored
  useEffect(() => {
    if (explored.size === 3 && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "missing-data", score: 3 }),
      }).catch(() => {});
    }
  }, [explored.size, session?.user]);

  const totalNulls  = ORIGINAL_ROWS.reduce((acc, r) => acc + (r.featureA === null ? 1 : 0) + (r.featureB === null ? 1 : 0), 0);
  const meta        = selected ? STRATEGY_META[selected] : null;

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={explored.size === 3} guideSlug="missing-data" score={3} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Missing Data</span>
        </nav>

        {/* Hero */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">Data &amp; Analysis</span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Missing Data:{" "}
            <span className="text-[var(--color-accent)]">Why It Matters</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[600px] mb-4">
            When data is incomplete, you have choices. Drop affected rows? Estimate missing values?
            See how each strategy trades off data loss against bias — and how it affects your model&apos;s performance.
          </p>

          {/* Dataset overview pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "12 rows",       color: "#3bb4a4" },
              { label: "5 columns",     color: "#3bb4a4" },
              { label: `${totalNulls} null cells`, color: "#ef4444" },
              { label: "3 strategies",  color: "#d4af37" },
            ].map((p) => (
              <span key={p.label} className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
                style={{ color: p.color, borderColor: p.color + "44", background: p.color + "12" }}>
                {p.label}
              </span>
            ))}
          </div>
        </section>

        {/* Exploration progress */}
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          <p className="text-[12px] text-[#94a3b8]">Strategies explored:</p>
          {(["drop-rows", "mean-imputation", "knn-imputation"] as const).map((id) => {
            const done = explored.has(id);
            return (
              <div key={id} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full transition-colors ${done ? "" : "bg-[#1e293b]"}`}
                  style={done ? { background: STRATEGY_META[id].color } : undefined} />
                <span className={`text-[11px] ${done ? "text-white" : "text-[#475569]"}`}>{STRATEGY_META[id].label}</span>
              </div>
            );
          })}
          {!session?.user && (
            <p className="text-[11px] text-[#475569] ml-auto">
              <Link href="/auth/sign-in" className="underline underline-offset-2 hover:text-[#94a3b8]">Sign in</Link>{" "}to track your progress
            </p>
          )}
          {explored.size === 3 && (
            <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="ml-auto text-[11px] font-semibold text-[#3bb4a4] flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Guide complete!
            </motion.span>
          )}
        </div>

        {/* Main panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* LEFT: Table + Scatter + Accuracy */}
          <div className="flex flex-col gap-6">

            {/* Selected strategy banner */}
            <AnimatePresence>
              {meta && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  className="px-4 py-2.5 rounded-xl border text-[12px] font-medium"
                  style={{ borderColor: meta.color + "44", background: meta.color + "0d", color: meta.color }}>
                  Showing: <strong>{meta.label}</strong> — {meta.rowCount} rows remain, {meta.dataLoss} data loss
                </motion.div>
              )}
            </AnimatePresence>

            {/* Data table */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
              <DataTable rows={rows} strategy={selected} />
            </div>

            {/* Scatter plot */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
              <ScatterPlot rows={rows} strategy={selected} />
            </div>

            {/* Accuracy meter */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
              <AccuracyMeter selected={selected} />
            </div>
          </div>

          {/* RIGHT: Strategies */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sticky top-24">
              <StrategyPanel selected={selected} onSelect={handleSelect} />

              {/* Key insight box */}
              <AnimatePresence mode="wait">
                {selected ? (
                  <motion.div key={selected} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                    className="mt-4 rounded-xl border-l-4 p-3 text-[12px] text-[#94a3b8] leading-relaxed"
                    style={{ borderColor: meta!.color, background: meta!.color + "08" }}>
                    <strong className="text-white block mb-0.5">When to use {meta!.label}</strong>
                    {selected === "drop-rows"       && "Use when missingness is completely random (MCAR) and you can afford the data loss — typically when < 5% of rows are affected."}
                    {selected === "mean-imputation" && "Use for a quick baseline with low complexity requirements. Avoid when feature correlations matter, as variance reduction can degrade model performance."}
                    {selected === "knn-imputation"  && "Use when features are correlated and the dataset is small-to-medium. For large datasets (> 100K rows), consider faster alternatives like MICE or iterative imputation."}
                  </motion.div>
                ) : (
                  <motion.div key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="mt-4 rounded-xl border border-[#1e293b] bg-[#1e293b]/20 p-3 text-[12px] text-[#475569] text-center">
                    Click a strategy above to see how it transforms the dataset
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Concept quick-ref */}
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-3">Key Concepts</p>
                <div className="flex flex-col gap-2 text-[11px] text-[#94a3b8]">
                  <div><strong className="text-white">MCAR</strong> — Missing Completely at Random. Missingness has no pattern.</div>
                  <div><strong className="text-white">MAR</strong> — Missing at Random. Missingness depends on other observed values.</div>
                  <div><strong className="text-white">MNAR</strong> — Missing Not at Random. The missing value itself affects whether it&apos;s missing.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer nav */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link href="/visual-guides/how-datasets-are-built"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors">
            ← Previous Guide
          </Link>
          <Link href="/visual-guides/feature-scaling"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
            Next: Feature Scaling Playground →
          </Link>
        </div>
      </div>
    </div>
  );
}
