"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";
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

const NEXT_GUIDE_SLUG = "probability-fundamentals";

// ── Component ─────────────────────────────────────────────────────────────────

export default function StudentTChiSquareFClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();
  const completionFired = useRef(false);

  const [state, setState] = useState<StudentTChiSquareFState>(INITIAL_STATE);
  const [resetKey, setResetKey] = useState(0);

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

  function handleReset() {
    setState(INITIAL_STATE);
    tSliderMoved.current = false;
    otherSliderMoved.current = false;
    convergenceViewed.current = false;
    cardsViewed.current = new Set<number>();
    refreshProgress();
    setResetKey((k) => k + 1);
  }

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
        <UseCaseExplainer key={resetKey} onCardViewed={handleCardViewed} />

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
                  You Met the Three Test Distributions
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You reshaped each curve with degrees of freedom, watched the
                  t-distribution converge to the normal, and matched t,
                  chi-square, and F to the tests they power.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      t-distribution df
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[#3bb4a4]">
                      {state.tDF}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      heavier tails at low df
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Chi-square df
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {state.chiSquareDF}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      skew fades as df grows
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      F-distribution df pair
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[#93c5fd]">
                      ({state.fDF1}, {state.fDF2})
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      a ratio of two chi-squares
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;All three curves are children of the normal: t is a
                    mean with estimated spread, chi-square is a sum of squared
                    normals, and F is a ratio of chi-squares, so degrees of
                    freedom decide the shape of every classic test
                    statistic.&quot;
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
              href="/visual-guides/data-distributions"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
            >
              ← Data Distributions
            </Link>
            <Link
              href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
            >
              Probability Fundamentals →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
