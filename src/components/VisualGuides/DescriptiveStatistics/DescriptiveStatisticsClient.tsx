"use client";

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

import DataPointDragZone from "./DataPointDragZone";
import StatisticsPanel from "./StatisticsPanel";
import { computeAllStats } from "./utils";
import { DEFAULT_DATA_POINTS } from "./types";
import type { DataPoint } from "./types";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

// ── Deep-clone helper ─────────────────────────────────────────────────────────
function clonePoints(pts: DataPoint[]): DataPoint[] {
  return pts.map((p) => ({ ...p }));
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DescriptiveStatisticsClient() {
  const { data: session } = useSession();
  const completionFired = useRef(false);

  // ── Data state ──────────────────────────────────────────────────────────────
  const [dataPoints, setDataPoints] = useState<DataPoint[]>(
    clonePoints(DEFAULT_DATA_POINTS)
  );
  const [showRobustStats, setShowRobustStats] = useState(false);
  const [showDistanceViz, setShowDistanceViz] = useState(false);

  // ── Completion tracking ─────────────────────────────────────────────────────
  const draggedPointIds = useRef<Set<number>>(new Set());
  const robustToggled = useRef(false);
  const distanceVizSeen = useRef(false);

  // Track robust toggle
  const handleToggleRobust = useCallback((v: boolean) => {
    setShowRobustStats(v);
    if (v) robustToggled.current = true;
  }, []);

  // Track std dev card hover
  const handleStdDevHover = useCallback((hovering: boolean) => {
    setShowDistanceViz(hovering);
    if (hovering) distanceVizSeen.current = true;
  }, []);

  // ── Computed statistics ─────────────────────────────────────────────────────
  const stats = useMemo(() => computeAllStats(dataPoints), [dataPoints]);

  // ── Completion logic ────────────────────────────────────────────────────────
  const draggedCount = draggedPointIds.current.size;
  const allComplete =
    draggedCount >= 5 && robustToggled.current && distanceVizSeen.current;

  // Derived display values (re-check on every render)
  const [completionVisible, setCompletionVisible] = useState(false);
  useEffect(() => {
    if (allComplete) setCompletionVisible(true);
  }, [allComplete]);

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "descriptive-statistics", score: 100 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  // ── Drag handlers ───────────────────────────────────────────────────────────
  const handleDragStart = useCallback((id: number) => {
    draggedPointIds.current.add(id);
  }, []);

  const handlePointDragged = useCallback((id: number, newValue: number) => {
    draggedPointIds.current.add(id);
    setDataPoints((prev) =>
      prev.map((p) => (p.id === id ? { ...p, value: newValue } : p))
    );
  }, []);

  // ── Reset ───────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setDataPoints(clonePoints(DEFAULT_DATA_POINTS));
  }, []);

  // ── Progress display (reactive) ─────────────────────────────────────────────
  // Force a re-render tick when draggedPointIds changes (since it's a ref)
  const [draggedCountDisplay, setDraggedCountDisplay] = useState(0);
  const [robustDisplay, setRobustDisplay] = useState(false);
  const [distDisplay, setDistDisplay] = useState(false);

  const syncProgress = useCallback(() => {
    setDraggedCountDisplay(draggedPointIds.current.size);
    setRobustDisplay(robustToggled.current);
    setDistDisplay(distanceVizSeen.current);
  }, []);

  const handleDragStartWithSync = useCallback(
    (id: number) => {
      handleDragStart(id);
      syncProgress();
    },
    [handleDragStart, syncProgress]
  );

  const handlePointDraggedWithSync = useCallback(
    (id: number, newValue: number) => {
      handlePointDragged(id, newValue);
      syncProgress();
    },
    [handlePointDragged, syncProgress]
  );

  const handleToggleRobustWithSync = useCallback(
    (v: boolean) => {
      handleToggleRobust(v);
      syncProgress();
    },
    [handleToggleRobust, syncProgress]
  );

  const handleStdDevHoverWithSync = useCallback(
    (hovering: boolean) => {
      handleStdDevHover(hovering);
      syncProgress();
    },
    [handleStdDevHover, syncProgress]
  );

  const progressItems = [
    {
      label: `Points dragged: ${Math.min(draggedCountDisplay, 5)}/5`,
      done: draggedCountDisplay >= 5,
    },
    { label: `Robust toggle: ${robustDisplay ? "✓" : "—"}`, done: robustDisplay },
    {
      label: `Distance viz: ${distDisplay ? "✓" : "—"}`,
      done: distDisplay,
    },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={allComplete} guideSlug="descriptive-statistics" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Descriptive Statistics</span>
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
              Statistics
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Descriptive Statistics:{" "}
            <span className="text-[var(--color-accent)]">Center, Spread &amp; Shape</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[680px]">
            What is the &ldquo;typical&rdquo; salary? How spread out are salaries? Are there
            outliers? Drag data points on a number line and watch key statistics
            update instantly.
          </p>
        </motion.section>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {progressItems.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full transition-colors ${
                  done ? "bg-[#3bb4a4]" : "bg-[#1e293b]"
                }`}
              />
              <span className={`text-[11px] ${done ? "text-white" : "text-[#475569]"}`}>
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
            {completionVisible && (
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

        {/* Interactive drag zone */}
        <motion.div
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[14px] font-bold text-white">
                Salary Distribution
              </h2>
              <p className="text-[11px] text-[#94a3b8] mt-0.5">
                20 employees &mdash; drag any dot left or right to change its salary
              </p>
            </div>
          </div>

          <DataPointDragZone
            dataPoints={dataPoints}
            mean={stats.mean}
            median={stats.median}
            showDistanceViz={showDistanceViz}
            onPointDragged={handlePointDraggedWithSync}
            onDragStart={handleDragStartWithSync}
            onReset={handleReset}
          />
        </motion.div>

        {/* Statistics panel */}
        <motion.div
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <h2 className="text-[14px] font-bold text-white mb-5">
            Live Statistics
          </h2>
          <StatisticsPanel
            stats={stats}
            showRobustStats={showRobustStats}
            onToggleRobust={handleToggleRobustWithSync}
            showDistanceViz={showDistanceViz}
            onStdDevHover={handleStdDevHoverWithSync}
          />
        </motion.div>

        {/* Footer nav */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link
            href="/visual-guides/math-for-statistics"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
          >
            ← Math for Statistics
          </Link>
          <Link
            href="/visual-guides/percentiles-quartiles-box-plots"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            Next: Percentiles &amp; Box Plots →
          </Link>
        </div>
      </div>
    </div>
  );
}
