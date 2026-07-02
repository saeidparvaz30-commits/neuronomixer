"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import type { ToolType } from "./types";
import ConceptToolbar from "./ConceptToolbar";
import GrowthCalculator from "./GrowthCalculator";
import LogScaleToggle from "./LogScaleToggle";
import SummationVisualizer from "./SummationVisualizer";
import WeightedAverageBuilder from "./WeightedAverageBuilder";
import SlopeVisualizer from "./SlopeVisualizer";
import VennDiagramBuilder from "./VennDiagramBuilder";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

const TOOL_LABELS: Record<ToolType, string> = {
  growth: "Compound vs Simple Growth",
  logScale: "Log vs Linear Scale",
  summation: "Sigma Notation",
  weightedAvg: "Weighted Averages",
  slope: "Rate of Change",
  setOps: "Set Operations",
};

export default function MathForStatisticsClient() {
  const { data: session } = useSession();
  const completionFired = useRef(false);

  const [activeTool, setActiveTool] = useState<ToolType>("growth");
  const [exploredTools, setExploredTools] = useState<Set<ToolType>>(new Set(["growth"]));
  // Track which tools have been adjusted (unique tool adjustments, capped at 6)
  const [adjustedTools, setAdjustedTools] = useState<Set<ToolType>>(new Set());

  const allComplete = exploredTools.size === 6 && adjustedTools.size >= 4;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "math-for-statistics", score: 5 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  function handleToolChange(tool: ToolType) {
    setActiveTool(tool);
    setExploredTools((prev) => new Set([...prev, tool]));
  }

  const handleAdjust = useCallback(() => {
    setAdjustedTools((prev) => new Set([...prev, activeTool]));
  }, [activeTool]);

  const progress = [
    { label: `Tools explored: ${exploredTools.size}/6`, done: exploredTools.size === 6 },
    { label: `Tools adjusted: ${Math.min(adjustedTools.size, 4)}/4`, done: adjustedTools.size >= 4 },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={allComplete} guideSlug="math-for-statistics" score={5} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Math for Statistics</span>
        </nav>

        {/* Hero */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[#d4af37]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#d4af37]">
              Statistics
            </span>
            <span className="w-6 h-px bg-[#d4af37]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Math for Statistics:{" "}
            <span className="text-[#d4af37]">The Visual Toolkit</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[680px] mb-3">
            Statistics relies on a small toolkit of mathematical ideas. You do not need to memorize formulas; you need to understand what they mean.
          </p>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed max-w-[680px]">
            Explore growth, logarithms, summation, weighted averages, rates of change, and set operations with six interactive tools.
          </p>
        </section>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {progress.map(({ label, done }) => (
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

        {/* Tab navigation */}
        <div className="mb-6">
          <ConceptToolbar
            active={activeTool}
            explored={exploredTools}
            onChange={handleToolChange}
          />
        </div>

        {/* Tool area */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
          {/* Tool header */}
          <div className="mb-5 pb-4 border-b border-[#1e293b]">
            <h2 className="text-lg font-bold text-white">{TOOL_LABELS[activeTool]}</h2>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTool}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {activeTool === "growth" && (
                <GrowthCalculator onAdjust={handleAdjust} />
              )}
              {activeTool === "logScale" && (
                <LogScaleToggle onAdjust={handleAdjust} />
              )}
              {activeTool === "summation" && (
                <SummationVisualizer onAdjust={handleAdjust} />
              )}
              {activeTool === "weightedAvg" && (
                <WeightedAverageBuilder onAdjust={handleAdjust} />
              )}
              {activeTool === "slope" && (
                <SlopeVisualizer onAdjust={handleAdjust} />
              )}
              {activeTool === "setOps" && (
                <VennDiagramBuilder onAdjust={handleAdjust} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer nav */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link
            href="/visual-guides/sources-of-bias"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            ← Previous: Sources of Bias
          </Link>
          <Link
            href="/visual-guides/descriptive-statistics"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            Next: Descriptive Statistics →
          </Link>
        </div>
      </div>
    </div>
  );
}
