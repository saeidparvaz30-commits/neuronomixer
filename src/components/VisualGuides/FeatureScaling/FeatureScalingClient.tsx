"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { ScalingMethod, METHOD_META } from "./types";
import ScalingToggle      from "./ScalingToggle";
import ScatterPlot        from "./ScatterPlot";
import FormulaPanel       from "./FormulaPanel";
import DistanceCalculator from "./DistanceCalculator";
import MethodExplainer    from "./MethodExplainer";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

export default function FeatureScalingClient() {
  const { data: session } = useSession();

  const [method,   setMethod]   = useState<ScalingMethod>("raw");
  const [explored, setExplored] = useState<Set<ScalingMethod>>(new Set(["raw"]));
  const [pair,     setPair]     = useState<[number, number] | null>(null);
  const [pendingIdx, setPendingIdx] = useState<number | null>(null);
  const completionFired = useRef(false);

  // Track explored methods
  function handleMethod(m: ScalingMethod) {
    setMethod(m);
    setExplored((prev) => { const n = new Set(prev); n.add(m); return n; });
  }

  // Two-click point selection
  const handleSelectPoint = useCallback((idx: number) => {
    if (pair && pair.includes(idx)) {
      // Deselect: remove this point
      const remaining = pair.filter((i) => i !== idx);
      setPair(remaining.length === 1 ? [remaining[0], -1] as unknown as [number, number] : null);
      setPendingIdx(remaining.length === 1 ? remaining[0] : null);
      return;
    }
    if (pendingIdx === null) {
      // First click
      setPendingIdx(idx);
      setPair(null);
    } else if (pendingIdx !== idx) {
      // Second click — form a pair
      setPair([pendingIdx, idx]);
      setPendingIdx(null);
    }
  }, [pair, pendingIdx]);

  // Resolve pending into pair display
  const displayPair: [number, number] | null = pair ?? (pendingIdx !== null ? null : null);

  // Completion
  const hasSelectedPair = pair !== null;
  const allComplete     = explored.size === 4 && hasSelectedPair;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "feature-scaling", score: 4 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  const meta = METHOD_META[method];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={allComplete} guideSlug="feature-scaling" score={4} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Feature Scaling</span>
        </nav>

        {/* Hero */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">Data &amp; Analysis</span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Feature Scaling{" "}
            <span className="text-[var(--color-accent)]">Playground</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]">
            Different features live on different scales — Age in years, Salary in thousands.
            But algorithms like KNN and SVM don&apos;t know this. Watch what happens when you scale.
          </p>
        </section>

        {/* Progress */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap">
            {(["raw", "normalized", "meannorm", "standardized"] as const).map((m) => {
              const done = explored.has(m);
              return (
                <div key={m} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full transition-colors`}
                    style={{ background: done ? METHOD_META[m].color : "#1e293b" }} />
                  <span className={`text-[11px] ${done ? "text-white" : "text-[#475569]"}`}>{METHOD_META[m].label}</span>
                </div>
              );
            })}
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full transition-colors ${hasSelectedPair ? "bg-[#d4af37]" : "bg-[#1e293b]"}`} />
              <span className={`text-[11px] ${hasSelectedPair ? "text-white" : "text-[#475569]"}`}>Distance comparison</span>
            </div>
          </div>
          {!session?.user && (
            <p className="text-[11px] text-[#475569] ml-auto">
              <Link href="/auth/sign-in" className="underline underline-offset-2 hover:text-[#94a3b8]">Sign in</Link>{" "}to track progress
            </p>
          )}
          <AnimatePresence>
            {allComplete && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="ml-auto text-[11px] font-semibold text-[#3bb4a4] flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Toggle */}
        <div className="mb-6">
          <ScalingToggle active={method} onChange={handleMethod} />
        </div>

        {/* Active method banner */}
        <AnimatePresence mode="wait">
          <motion.div key={method} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-6 px-4 py-2 rounded-xl border text-[12px] font-medium"
            style={{ borderColor: meta.color + "44", background: meta.color + "0d", color: meta.color }}>
            <strong>{meta.label}</strong> — {meta.tagline}
          </motion.div>
        </AnimatePresence>

        {/* Pending selection hint */}
        <AnimatePresence>
          {pendingIdx !== null && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4 px-4 py-2 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 text-[12px] text-[#d4af37]">
              Point A selected — click a second point to compare distances.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* LEFT: Scatter (3/5 width) */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
              <ScatterPlot
                method={method}
                selectedPair={displayPair ?? (pendingIdx !== null ? [pendingIdx, -1] as unknown as [number, number] : null)}
                onSelectPoint={handleSelectPoint}
              />
            </div>

            {/* Method explainer */}
            <MethodExplainer method={method} />
          </div>

          {/* RIGHT: Formula + Distance (2/5 width) */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <FormulaPanel method={method} />
            <DistanceCalculator selectedPair={pair} />

            {/* Quick-ref card */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-3">When to Use Which</p>
              <div className="flex flex-col gap-2 text-[11px]">
                {([
                  { m: "raw",          note: "Tree-based models — splits don't care about scale" },
                  { m: "normalized",   note: "Neural networks, bounded inputs, image pixel values" },
                  { m: "meannorm",     note: "Gradient descent — centered and bounded without std" },
                  { m: "standardized", note: "SVM, PCA, KNN, linear regression, regularized models" },
                ] as const).map(({ m, note }) => (
                  <div key={m} className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: METHOD_META[m].color }} />
                    <div>
                      <span className="font-semibold text-white">{METHOD_META[m].label}: </span>
                      <span className="text-[#94a3b8]">{note}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer nav */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link href="/visual-guides/missing-data"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors">
            ← Previous Guide
          </Link>
          <Link href="/visual-guides/outlier-detection"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
            Next: Outlier Detection: Spot the Odd One Out →
          </Link>
        </div>
      </div>
    </div>
  );
}
