"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  GRID,
  GRID_COLS,
  N_CELLS,
  N_TRAIN,
  N_VAL,
  LABEL_FLIP_RATE,
  BUDGET,
  ORACLE,
  QUIZ_TOP,
  StrategyId,
  RunResult,
  probTopHit,
} from "./tuningMath";
import ExploreMap from "./ExploreMap";
import SearchLab from "./SearchLab";
import type { HeatView } from "./HeatGrid";

const GUIDE_TITLE = "Hyperparameter Tuning";
const GUIDE_SLUG = "hyperparameter-tuning";
const NEXT_GUIDE_SLUG = "confusion-matrix";

/** Starting cell: depth 3, min leaf 8 (a mild, middling configuration). */
const DEFAULT_SELECTED = 2 * GRID_COLS + 5;

/** Quiz options, every percentage computed from the same grid geometry. */
const QUIZ_OPTIONS = [
  {
    id: "single",
    prob: QUIZ_TOP / N_CELLS,
    sub: "the chance for one single trial",
    correct: false,
  },
  {
    id: "coverage",
    prob: BUDGET / N_CELLS,
    sub: "the fraction of the grid the budget covers",
    correct: false,
  },
  {
    id: "small",
    prob: probTopHit(N_CELLS, QUIZ_TOP, 3),
    sub: "what a 3-trial budget would get",
    correct: false,
  },
  {
    id: "exact",
    prob: probTopHit(N_CELLS, QUIZ_TOP, BUDGET),
    sub: `1 minus the chance that all ${BUDGET} trials miss`,
    correct: true,
  },
] as const;

export default function HyperparameterTuningClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // ── Interaction state (Try Again restores exactly these) ─────────────────
  const [selectedIndex, setSelectedIndex] = useState(DEFAULT_SELECTED);
  const [view, setView] = useState<HeatView>("val");
  const [visited, setVisited] = useState<Set<number>>(() => new Set());
  const [results, setResults] = useState<
    Partial<Record<StrategyId, RunResult>>
  >({});
  const [completed, setCompleted] = useState<Set<StrategyId>>(
    () => new Set()
  );
  const [quizPick, setQuizPick] = useState<string | null>(null);
  const [quizSolved, setQuizSolved] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  // ── Gates ─────────────────────────────────────────────────────────────────
  const gateInspect = visited.size >= 3;
  const gateSearch = completed.size >= 1;
  const gateCompare = completed.size >= 3;
  const isComplete = gateInspect && gateSearch && gateCompare && quizSolved;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelectCell = useCallback(
    (index: number) => {
      if (index !== selectedIndex) {
        setVisited((prev) =>
          prev.has(index) ? prev : new Set(prev).add(index)
        );
      }
      setSelectedIndex(index);
    },
    [selectedIndex]
  );

  const handleResult = useCallback((result: RunResult) => {
    setResults((prev) => ({ ...prev, [result.strategy]: result }));
    setCompleted((prev) =>
      prev.has(result.strategy) ? prev : new Set(prev).add(result.strategy)
    );
  }, []);

  const handleQuizPick = useCallback((id: string) => {
    setQuizPick(id);
    if (QUIZ_OPTIONS.find((o) => o.id === id)?.correct) setQuizSolved(true);
  }, []);

  function handleReset() {
    setSelectedIndex(DEFAULT_SELECTED);
    setView("val");
    setVisited(new Set());
    setResults({});
    setCompleted(new Set());
    setQuizPick(null);
    setQuizSolved(false);
    setResetKey((k) => k + 1);
  }

  const yourBest = useMemo(() => {
    const done = Object.values(results).filter(Boolean) as RunResult[];
    if (done.length === 0) return null;
    return done.reduce((a, b) => (b.bestValAcc > a.bestValAcc ? b : a));
  }, [results]);

  const progressItems = [
    { id: "inspect", label: "Inspect 3 configs", done: gateInspect },
    { id: "search", label: "Run a budgeted search", done: gateSearch },
    { id: "compare", label: "Try all 3 strategies", done: gateCompare },
    { id: "quiz", label: "Answer the budget question", done: quizSolved },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion
        isComplete={isComplete}
        guideSlug={GUIDE_SLUG}
        score={100}
      />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-[12px] text-[#475569] mb-6"
        >
          <Link
            href="/visual-guides"
            className="hover:text-[var(--color-accent)] transition-colors"
          >
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-[#94a3b8]">{GUIDE_TITLE}</span>
        </nav>

        {/* Hero */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              Machine Learning
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3"
          >
            Hyperparameter{" "}
            <span className="text-[var(--color-accent)]">Tuning</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Training learns parameters; you choose hyperparameters. Every cell
            of this 10 by 10 grid is a real decision tree trained in your
            browser on the same {N_TRAIN + N_VAL}-point dataset. Explore the
            validation landscape, then spend a budget of {BUDGET} trials with
            grid, random, and adaptive search to find the best configuration.
          </motion.p>
        </section>

        {/* Progress */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          {progressItems.map((item) => (
            <div key={item.id} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full transition-colors"
                style={{
                  background: item.done ? "var(--color-accent)" : "#1e293b",
                }}
              />
              <span
                className={`text-[11px] ${item.done ? "text-white" : "text-[#475569]"}`}
              >
                {item.label}
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
              to save progress
            </p>
          )}
          <AnimatePresence>
            {isComplete && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="ml-auto text-[11px] font-semibold text-[var(--color-success)] flex items-center gap-1"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden="true"
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

        {/* Concept */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The settings space: a landscape you can only sample
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            A decision tree learns its splits from data, but its depth limit
            and minimum leaf size are set by you before training starts. Each
            combination produces a different model with a different validation
            score, so tuning is a search over a landscape you cannot see in
            advance. Evaluating one point of that landscape costs a full
            training run, which is why real tuning always happens under a
            budget. Here the playground is small enough to cheat: all{" "}
            {N_CELLS} trees are trained up front (in a few milliseconds), so
            you can compare what your budget found against the true optimum.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Grid search
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Lay a lattice over the space and evaluate every crossing.
                Predictable coverage, but each hyperparameter only ever gets a
                handful of distinct values, and useless rows and columns burn
                trials.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Random search
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Draw configurations uniformly. When only some hyperparameters
                matter, random search tries more distinct values of each one
                than a grid does, which is why it often wins (Bergstra and
                Bengio, 2012, JMLR 13).
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Adaptive search
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Spend a few trials probing, then concentrate the rest near the
                best score found so far. This greedy hill-climb is the
                simplest member of the family that includes Bayesian
                optimization and Hyperband.
              </p>
            </div>
          </div>
          <p className="text-[11px] text-[#475569] leading-relaxed">
            The dataset: {N_TRAIN + N_VAL} points in two interleaved
            crescents, split {N_TRAIN} train / {N_VAL} validation, with{" "}
            {(LABEL_FLIP_RATE * 100).toFixed(0)} percent of training labels
            deliberately flipped so that an unconstrained tree overfits. Every
            accuracy on this page is measured on these points by the code
            running in your browser; nothing is scripted.
          </p>
        </motion.section>

        {/* Step 1: explore */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Step 1: walk the landscape
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Each cell is one trained tree: brighter teal means higher
            accuracy. Click or arrow-key through at least three
            configurations and watch the decision boundary change shape, from
            one straight cut at depth 1 to a jagged, noise-chasing partition
            at depth 10 with min leaf 1.
          </p>
          <ExploreMap
            selectedIndex={selectedIndex}
            onSelect={handleSelectCell}
            view={view}
            onViewChange={setView}
          />
        </motion.section>

        {/* Step 2: search under budget */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Step 2: spend {BUDGET} trials wisely
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Now pretend the landscape is invisible, as it always is in
            practice. You can afford {BUDGET} training runs out of {N_CELLS}{" "}
            possible configurations. Run all three strategies and compare
            what each one finds against the full-sweep optimum.
          </p>
          <SearchLab key={resetKey} results={results} onResult={handleResult} />
        </motion.section>

        {/* Step 3: quiz */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Step 3: the budget question
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Random search draws {BUDGET} of the {N_CELLS} grid cells without
            replacement. How likely is it that at least one draw lands in the{" "}
            {QUIZ_TOP} best cells?
          </p>
          <div
            role="radiogroup"
            aria-label="Budget question options"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3"
          >
            {QUIZ_OPTIONS.map((opt) => {
              const picked = quizPick === opt.id;
              const showState = picked || (quizSolved && opt.correct);
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={picked}
                  onClick={() => handleQuizPick(opt.id)}
                  disabled={quizSolved}
                  className={`rounded-xl border p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                    showState
                      ? opt.correct
                        ? "border-[var(--color-success)]"
                        : "border-[#ef4444]"
                      : "border-[#1e293b] hover:border-[#334155]"
                  } ${quizSolved && !opt.correct ? "opacity-50" : ""}`}
                >
                  <p className="text-[14px] font-mono font-bold text-[#f1f5f9]">
                    {(opt.prob * 100).toFixed(1)}%
                  </p>
                  <p className="text-[11px] text-[#94a3b8]">{opt.sub}</p>
                  {showState && (
                    <p
                      className={`text-[10px] font-semibold mt-1 ${
                        opt.correct
                          ? "text-[var(--color-success)]"
                          : "text-[#ef4444]"
                      }`}
                    >
                      {opt.correct ? "Correct" : "Not quite"}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
          {quizPick !== null && !quizSolved && (
            <p className="text-[11px] text-[var(--color-warning)] leading-relaxed">
              Think about the complement: what is the chance that every single
              one of the {BUDGET} draws misses the top {QUIZ_TOP}? Try again.
            </p>
          )}
          {quizSolved && (
            <p className="text-[11px] text-[var(--color-success)] leading-relaxed">
              Right: the miss chance shrinks multiplicatively with every draw,
              so {BUDGET} blind trials already find a top-
              {((QUIZ_TOP / N_CELLS) * 100).toFixed(0)}-percent configuration{" "}
              {(probTopHit(N_CELLS, QUIZ_TOP, BUDGET) * 100).toFixed(1)}{" "}
              percent of the time. That mathematical inevitability is the
              engine behind random search.
            </p>
          )}
        </motion.section>

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
                  Budget Well Spent
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You mapped a real validation landscape, then found a
                  near-optimal configuration by training only {BUDGET} of{" "}
                  {N_CELLS} real trees.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Full sweep best ({N_CELLS} trials)
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {(ORACLE.valAcc * 100).toFixed(1)}% at depth{" "}
                      {ORACLE.depth}, leaf {ORACLE.minLeaf}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Your best search ({BUDGET} trials)
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {yourBest
                        ? `${(yourBest.bestValAcc * 100).toFixed(1)}% via ${yourBest.strategy} search`
                        : "no search recorded"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Configurations you inspected
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {visited.size} of {GRID.length} cells by hand
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Hyperparameter tuning is search under a budget. The
                    landscape is fixed before you start; your only choice is
                    where to spend your trials, and random or adaptive
                    placement usually spends them better than a rigid
                    grid.&quot;
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
              href="/visual-guides"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
            >
              ← All Guides
            </Link>
            <Link
              href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
            >
              Next Guide →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
