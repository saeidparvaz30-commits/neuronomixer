"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";
import { Point, DetectionMethod, INITIAL_POINTS, detectZScore, detectIQR } from "./types";
import InteractiveScatter  from "./InteractiveScatter";
import DetectionMethodPanel from "./DetectionMethodPanel";
import ComparisonStats      from "./ComparisonStats";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

const NEXT_GUIDE_SLUG = "correlation-causation";

export default function OutlierDetectionClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();
  const nextIdRef         = useRef(INITIAL_POINTS.length);
  const completionFired   = useRef(false);

  const [points,    setPoints]    = useState<Point[]>([...INITIAL_POINTS]);
  const [method,    setMethod]    = useState<DetectionMethod>("zscore");
  const [threshold, setThreshold] = useState(3);
  const [explored,  setExplored]  = useState<Set<DetectionMethod>>(new Set(["zscore"]));
  const [hasDragged, setHasDragged] = useState(false);

  const outlierIds = method === "zscore"
    ? detectZScore(points, threshold)
    : detectIQR(points);

  function handleMethodChange(m: DetectionMethod) {
    setMethod(m);
    setExplored(prev => { const n = new Set(prev); n.add(m); return n; });
  }

  const handleMovePoint = useCallback((id: number, x: number, y: number) => {
    setPoints(prev => prev.map(p => p.id === id ? { ...p, x, y } : p));
    setHasDragged(true);
  }, []);

  function handleAddPoint(x: number, y: number) {
    setPoints(prev => [...prev, { id: nextIdRef.current++, x, y }]);
  }

  function handleRemovePoint(id: number) {
    setPoints(prev => prev.filter(p => p.id !== id));
  }

  function reset() {
    setPoints([...INITIAL_POINTS]);
    setHasDragged(false);
    completionFired.current = false;
  }

  // Full restart for the completion card: also returns method, threshold, and
  // explored tracking to their initial values.
  function handleReset() {
    reset();
    setMethod("zscore");
    setThreshold(3);
    setExplored(new Set(["zscore"]));
  }

  const allComplete = explored.size === 2 && hasDragged;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "outlier-detection", score: 100 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  const methodColor = method === "zscore" ? "#ef4444" : "var(--color-warning)";

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={allComplete} guideSlug="outlier-detection" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Outlier Detection</span>
        </nav>

        {/* Hero */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">Data &amp; Analysis</span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Outlier Detection:{" "}
            <span className="text-[var(--color-accent)]">Spot the Odd One Out</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[600px]">
            Drag, add, or remove data points and watch the mean, median, and trend lines update
            when you drop them. Toggle between Z-Score and IQR methods to see which points get
            flagged, and why the answers can differ.
          </p>
        </section>

        {/* Progress */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap">
            {(["zscore", "iqr"] as const).map(m => {
              const done = explored.has(m);
              return (
                <div key={m} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full transition-colors"
                    style={{ background: done ? (m === "zscore" ? "#ef4444" : "var(--color-warning)") : "#1e293b" }} />
                  <span className={`text-[11px] ${done ? "text-white" : "text-[#475569]"}`}>
                    {m === "zscore" ? "Z-Score" : "IQR"} explored
                  </span>
                </div>
              );
            })}
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full transition-colors ${hasDragged ? "bg-[#3bb4a4]" : "bg-[#1e293b]"}`} />
              <span className={`text-[11px] ${hasDragged ? "text-white" : "text-[#475569]"}`}>Point dragged</span>
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

        {/* Active method banner */}
        <AnimatePresence mode="wait">
          <motion.div key={method} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-6 px-4 py-2 rounded-xl border text-[12px] font-medium"
            style={{ borderColor: methodColor + "44", background: methodColor + "0d", color: methodColor }}>
            <strong>{method === "zscore" ? "Z-Score" : "IQR"} Method</strong>:{" "}
            {method === "zscore"
              ? `flagging points more than ${threshold}σ from the mean on either axis`
              : "flagging points outside the 1.5×IQR fences on either axis"}
            {" · "}{outlierIds.size} outlier{outlierIds.size !== 1 ? "s" : ""} detected
          </motion.div>
        </AnimatePresence>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* LEFT: Scatter (3/5) */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] text-[#94a3b8]">
                  {points.length} points · {outlierIds.size} flagged
                </p>
                <button
                  onClick={reset}
                  className="text-[11px] text-[#475569] hover:text-[#94a3b8] transition-colors px-2.5 py-1 rounded-lg border border-[#1e293b] hover:border-[#334155]"
                >
                  Reset
                </button>
              </div>
              <InteractiveScatter
                points={points}
                onMovePoint={handleMovePoint}
                onAddPoint={handleAddPoint}
                onRemovePoint={handleRemovePoint}
                outlierIds={outlierIds}
                method={method}
                threshold={threshold}
              />
            </div>

            {/* Method explainer */}
            <AnimatePresence mode="wait">
              <motion.div key={method} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
                <p className="text-[11px] font-bold mb-2" style={{ color: methodColor }}>
                  {method === "zscore" ? "Z-Score Method" : "IQR Method"}
                </p>
                <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
                  {method === "zscore"
                    ? "Measures how many standard deviations each coordinate is from that axis mean, applied to X and Y separately. Assumes a roughly normal distribution. A key limitation: extreme outliers inflate the standard deviation, which can actually mask themselves."
                    : "Uses the interquartile range (Q3 − Q1) of each axis to set fences, applied to X and Y separately. Entirely distribution-free: no normality assumption. More robust because outliers barely influence Q1, Q3, or the IQR itself."}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(method === "zscore" ? [
                    { label: "Best for",    text: "Normally distributed data" },
                    { label: "Formula",     text: "z = (x − μ) / σ" },
                    { label: "Limitation",  text: "Outliers inflate σ, masking themselves" },
                    { label: "Used in",     text: "Quality control, anomaly detection" },
                  ] : [
                    { label: "Best for",   text: "Skewed or non-normal data" },
                    { label: "Formula",    text: "fences = Q1/Q3 ± 1.5×IQR" },
                    { label: "Strength",   text: "Robust: outliers don't shift fences" },
                    { label: "Used in",    text: "EDA, box plots, robust statistics" },
                  ]).map(({ label, text }) => (
                    <div key={label} className="rounded-lg bg-[#1e293b]/40 p-2">
                      <p className="text-[9px] text-[#475569] uppercase tracking-wide mb-0.5">{label}</p>
                      <p className="text-[11px] text-[#94a3b8]">{text}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* RIGHT: Controls (2/5) */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <DetectionMethodPanel
              method={method}
              onMethodChange={handleMethodChange}
              threshold={threshold}
              onThresholdChange={setThreshold}
              outlierIds={outlierIds}
              points={points}
            />

            <ComparisonStats points={points} outlierIds={outlierIds} />

            {/* Quick reference */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-3">When to Use Which</p>
              <div className="flex flex-col gap-2.5 text-[11px]">
                {[
                  { color: "#ef4444", label: "Z-Score", note: "Data is normally distributed; you need a threshold in interpretable σ units." },
                  { color: "var(--color-warning)", label: "IQR",     note: "Data is skewed or you can't assume normality; need resistance to masking." },
                  { color: "#94a3b8", label: "Both agree",    note: "High confidence the point is genuinely anomalous." },
                  { color: "#3bb4a4", label: "They disagree", note: "Use domain knowledge: the disagreement reveals the distribution shape." },
                ].map(({ color, label, note }) => (
                  <div key={label} className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full mt-0.5 flex-shrink-0" style={{ background: color }} />
                    <div>
                      <span className="font-semibold text-white">{label}: </span>
                      <span className="text-[#94a3b8]">{note}</span>
                    </div>
                  </div>
                ))}
              </div>
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
                  You Spotted the Odd Ones Out
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You moved the data yourself and compared what Z-Score and IQR
                  each flag, and where they disagree.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Detection methods explored
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {explored.size} of 2
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      Z-Score and IQR
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Points on your canvas
                    </p>
                    <p className="text-[14px] font-mono font-bold text-white">
                      {points.length}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      dragged, added, or removed by you
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Flagged by {method === "zscore" ? "Z-Score" : "IQR"} right now
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {outlierIds.size}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      {method === "zscore"
                        ? `beyond ${threshold}σ on either axis`
                        : "outside the 1.5×IQR fences"}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;An outlier is only outlying relative to a method:
                    Z-Score trusts the mean that extreme points distort, IQR
                    holds its fences steady, and when the two disagree it is the
                    shape of your distribution talking.&quot;
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
          <Link href="/visual-guides/feature-scaling"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors">
            ← Previous Guide
          </Link>
          <Link href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
            Next: Correlation vs Causation →
          </Link>
        </div>
        )}
      </div>
    </div>
  );
}
