"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { INITIAL_STATE, StudentTChiSquareFState, ActiveDistribution } from "./types";
import DistributionComparison from "./DistributionComparison";
import TConvergenceVisualizer from "./TConvergenceVisualizer";
import UseCaseExplainer from "./UseCaseExplainer";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

// ── Tab config ────────────────────────────────────────────────────────────────

interface TabDef {
  id: ActiveDistribution;
  label: string;
  color: string;
  description: string;
}

const TABS: TabDef[] = [
  {
    id: "t",
    label: "t-Distribution",
    color: "#3bb4a4",
    description: "Symmetric, heavier tails than normal. Used with small samples and unknown σ.",
  },
  {
    id: "chi-square",
    label: "Chi-Square",
    color: "#d4af37",
    description: "Always positive, right-skewed. Used for categorical data tests.",
  },
  {
    id: "f",
    label: "F-Distribution",
    color: "#93c5fd",
    description: "Ratio of two chi-squares. Used for variance comparisons and ANOVA.",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function StudentTChiSquareFClient() {
  const { data: session } = useSession();
  const completionFired = useRef(false);

  const [state, setState] = useState<StudentTChiSquareFState>(INITIAL_STATE);

  // ── Completion tracking ────────────────────────────────────────────────────

  const tSliderMoved = useRef(false);
  const otherSliderMoved = useRef(false);
  const convergenceViewed = useRef(false);
  const cardsViewed = useRef(new Set<number>());

  function checkCompletion() {
    const allComplete =
      tSliderMoved.current &&
      otherSliderMoved.current &&
      convergenceViewed.current &&
      cardsViewed.current.size === 3;

    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "student-t-chi-square-f", score: 100 }),
      }).catch(() => {});
    }
  }

  const [progressItems, setProgressItems] = useState({
    tSliderMoved: false,
    otherSliderMoved: false,
    convergenceViewed: false,
    cardsViewed: 0,
  });

  function refreshProgress() {
    setProgressItems({
      tSliderMoved: tSliderMoved.current,
      otherSliderMoved: otherSliderMoved.current,
      convergenceViewed: convergenceViewed.current,
      cardsViewed: cardsViewed.current.size,
    });
  }

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleTDFChange(v: number) {
    setState((prev) => ({ ...prev, tDF: v }));
    tSliderMoved.current = true;
    refreshProgress();
    checkCompletion();
  }

  function handleChiSquareDFChange(v: number) {
    setState((prev) => ({ ...prev, chiSquareDF: v }));
    otherSliderMoved.current = true;
    refreshProgress();
    checkCompletion();
  }

  function handleFDF1Change(v: number) {
    setState((prev) => ({ ...prev, fDF1: v }));
    otherSliderMoved.current = true;
    refreshProgress();
    checkCompletion();
  }

  function handleFDF2Change(v: number) {
    setState((prev) => ({ ...prev, fDF2: v }));
    otherSliderMoved.current = true;
    refreshProgress();
    checkCompletion();
  }

  function handleTabChange(tab: ActiveDistribution) {
    setState((prev) => ({ ...prev, activeDistribution: tab }));
  }

  function handleConvergenceToggle() {
    setState((prev) => {
      const next = !prev.showConvergence;
      if (next) {
        convergenceViewed.current = true;
        refreshProgress();
        checkCompletion();
      }
      return { ...prev, showConvergence: next };
    });
  }

  const handleCardViewed = useCallback(
    (index: number) => {
      cardsViewed.current.add(index);
      refreshProgress();
      checkCompletion();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session?.user]
  );

  // Re-check completion when session becomes available
  useEffect(() => {
    checkCompletion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user]);

  // ── Progress items ──────────────────────────────────────────────────────────

  const progressDots = [
    { label: "t-slider adjusted", done: progressItems.tSliderMoved },
    { label: "Other distribution explored", done: progressItems.otherSliderMoved },
    { label: "Convergence viewed", done: progressItems.convergenceViewed },
    {
      label: `Use-case cards: ${progressItems.cardsViewed}/3`,
      done: progressItems.cardsViewed === 3,
    },
  ];

  const allComplete = progressDots.every((p) => p.done);

  // ── Active tab ─────────────────────────────────────────────────────────────

  const activeTab = TABS.find((t) => t.id === state.activeDistribution)!;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={allComplete} guideSlug="student-t-chi-square-f" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Student&#39;s t, Chi-Square &amp; F</span>
        </nav>

        {/* Hero */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              STATISTICS
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Student&apos;s t, Chi-Square{" "}
            <span className="text-[var(--color-accent)]">&amp; F Distributions</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[720px]">
            Three indispensable sampling distributions. Understand why small samples
            demand heavier tails, why categorical tests use chi-square, and how
            ANOVA relies on the F-distribution. Adjust degrees of freedom and watch
            the shapes transform in real time.
          </p>
        </section>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {progressDots.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full transition-colors duration-300"
                style={{ background: done ? "#3bb4a4" : "#1e293b" }}
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

        {/* Tab buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map((tab) => {
            const active = tab.id === state.activeDistribution;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className="px-4 py-2 rounded-xl text-[12px] font-semibold border transition-all"
                style={{
                  borderColor: active ? tab.color : "#1e293b",
                  color: active ? tab.color : "#475569",
                  background: active ? tab.color + "18" : "transparent",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Active tab description */}
        <AnimatePresence mode="wait">
          <motion.p
            key={activeTab.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-[12px] mb-6 leading-relaxed"
            style={{ color: "#94a3b8" }}
          >
            <span
              className="font-semibold"
              style={{ color: activeTab.color }}
            >
              {activeTab.label}:{" "}
            </span>
            {activeTab.description}
          </motion.p>
        </AnimatePresence>

        {/* Distribution comparison (interactive) */}
        <div className="mb-8">
          <DistributionComparison
            activeDistribution={state.activeDistribution}
            tDF={state.tDF}
            chiSquareDF={state.chiSquareDF}
            fDF1={state.fDF1}
            fDF2={state.fDF2}
            onTDFChange={handleTDFChange}
            onChiSquareDFChange={handleChiSquareDFChange}
            onFDF1Change={handleFDF1Change}
            onFDF2Change={handleFDF2Change}
          />
        </div>

        {/* Convergence visualizer */}
        <div className="mb-10">
          <TConvergenceVisualizer
            visible={state.showConvergence}
            onToggle={handleConvergenceToggle}
          />
        </div>

        {/* Use case explainer */}
        <UseCaseExplainer onCardViewed={handleCardViewed} />

        {/* Footer nav */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link
            href="/visual-guides/data-distributions"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            ← Data Distributions
          </Link>
          <Link
            href="/visual-guides/probability-fundamentals"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            Probability Fundamentals →
          </Link>
        </div>
      </div>
    </div>
  );
}
