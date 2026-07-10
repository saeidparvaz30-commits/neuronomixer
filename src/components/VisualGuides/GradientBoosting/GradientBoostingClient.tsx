"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  runBoosting,
  fitDeepTree,
  countLeaves,
  TRAIN,
  MAX_ROUNDS,
  DEFAULT_LR,
  LR_MIN,
  LR_MAX,
  LR_STEP,
  DEFAULT_DEPTH,
  DEEP_TREE_DEPTH,
  N_TRAIN,
  N_TEST,
} from "./boostMath";
import FitChart from "./FitChart";
import ResidualChart from "./ResidualChart";
import ErrorChart from "./ErrorChart";

const GUIDE_TITLE = "Gradient Boosting";
const GUIDE_SLUG = "gradient-boosting";
const NEXT_GUIDE_SLUG = "overfitting-underfitting";
const MIN_GATE_ROUNDS = 10;

const DEPTH_OPTIONS = [
  { depth: 1, label: "Stumps (depth 1)" },
  { depth: 2, label: "Depth 2" },
  { depth: 3, label: "Depth 3" },
] as const;

interface QuizOption {
  id: string;
  text: string;
  correct: boolean;
}

const QUIZ_OPTIONS: QuizOption[] = [
  {
    id: "targets",
    text: "The original targets y, on a bootstrap sample",
    correct: false,
  },
  {
    id: "residuals",
    text: "The residuals of the current ensemble",
    correct: true,
  },
  {
    id: "prev-preds",
    text: "The predictions of the previous tree",
    correct: false,
  },
  {
    id: "shuffled",
    text: "A random reshuffling of y",
    correct: false,
  },
];

export default function GradientBoostingClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // ── Interaction state ──────────────────────────────────────────────────────
  const [rounds, setRounds] = useState(0);
  const [maxRoundsSeen, setMaxRoundsSeen] = useState(0);
  const [lr, setLr] = useState(DEFAULT_LR);
  const [depth, setDepth] = useState<number>(DEFAULT_DEPTH);
  const [showDeep, setShowDeep] = useState(false);
  const [gateLr, setGateLr] = useState(false);
  const [gateCompare, setGateCompare] = useState(false);
  const [quizPick, setQuizPick] = useState<string | null>(null);
  const [quizSolved, setQuizSolved] = useState(false);

  // ── Real computation: the full boosting sequence for the current lr/depth ──
  const run = useMemo(() => runBoosting(lr, depth), [lr, depth]);
  const deep = useMemo(() => fitDeepTree(), []);

  const residuals = useMemo(
    () => TRAIN.ys.map((y, i) => y - run.trainPreds[rounds][i]),
    [run, rounds]
  );
  const boostedLeaves = useMemo(
    () => run.trees.slice(0, rounds).reduce((s, t) => s + countLeaves(t), 0),
    [run, rounds]
  );

  const trainMseNow = run.trainMse[rounds];
  const testMseNow = run.testMse[rounds];
  const residualRms = Math.sqrt(trainMseNow);
  const nextTree = rounds < MAX_ROUNDS ? run.treeGrid[rounds] : null;

  // ── Gates ──────────────────────────────────────────────────────────────────
  const gateBoost = maxRoundsSeen >= MIN_GATE_ROUNDS;
  const isComplete = gateBoost && gateLr && gateCompare && quizSolved;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleRounds = useCallback((n: number) => {
    setRounds(n);
    setMaxRoundsSeen((prev) => Math.max(prev, n));
  }, []);

  const handleStep = useCallback(() => {
    handleRounds(Math.min(rounds + 1, MAX_ROUNDS));
  }, [rounds, handleRounds]);

  const handleLrChange = useCallback(
    (v: number) => {
      if (v !== lr) setGateLr(true);
      setLr(v);
    },
    [lr]
  );

  const handleToggleDeep = useCallback(() => {
    const next = !showDeep;
    if (next) setGateCompare(true);
    setShowDeep(next);
  }, [showDeep]);

  const handleQuizPick = useCallback((id: string) => {
    setQuizPick(id);
    const opt = QUIZ_OPTIONS.find((o) => o.id === id);
    if (opt?.correct) setQuizSolved(true);
  }, []);

  function handleReset() {
    setRounds(0);
    setMaxRoundsSeen(0);
    setLr(DEFAULT_LR);
    setDepth(DEFAULT_DEPTH);
    setShowDeep(false);
    setGateLr(false);
    setGateCompare(false);
    setQuizPick(null);
    setQuizSolved(false);
  }

  const progressItems = [
    {
      id: "boost",
      label: `Boost ${MIN_GATE_ROUNDS}+ rounds (${Math.min(maxRoundsSeen, MIN_GATE_ROUNDS)}/${MIN_GATE_ROUNDS})`,
      done: gateBoost,
    },
    { id: "lr", label: "Change the learning rate", done: gateLr },
    { id: "compare", label: "Compare vs a deep tree", done: gateCompare },
    { id: "quiz", label: "Answer the residual question", done: quizSolved },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug={GUIDE_SLUG} score={100} />
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
            Gradient <span className="text-[var(--color-accent)]">Boosting</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Build a strong model one weak tree at a time. Press Step to fit a
            small tree to the current residuals and add a shrunken copy of it
            to the ensemble. Every curve and error number on this page is
            computed live from the {N_TRAIN} training points in front of you.
          </motion.p>
        </section>

        {/* Progress */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          {progressItems.map((item) => (
            <div key={item.id} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full transition-colors"
                style={{ background: item.done ? "var(--color-accent)" : "#1e293b" }}
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
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
            The idea: keep fixing what is still wrong
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            A boosted model is a running sum of small trees. It starts from a
            constant, the mean of the targets. Each round measures the
            residuals, the part of y the current ensemble still gets wrong,
            fits one depth-limited tree to them, and adds that tree scaled by
            the learning rate. For squared loss the residual is exactly the
            negative gradient, which is where the name comes from.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Weak learners on purpose
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                The trees here are the same regression trees from the{" "}
                <Link
                  href="/visual-guides/decision-trees"
                  className="underline underline-offset-2 hover:text-white"
                >
                  Decision Trees
                </Link>{" "}
                guide, kept deliberately shallow. One shallow tree underfits
                badly; a sequence of them, each correcting the last, does not.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Exact split search
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Every split in every tree is found by exhaustively scanning all
                candidate thresholds and picking the one that minimizes the
                summed squared error of the two sides. Nothing on this page is
                approximated or scripted.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Sequential, not parallel
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                <Link
                  href="/visual-guides/random-forests"
                  className="underline underline-offset-2 hover:text-white"
                >
                  Random forests
                </Link>{" "}
                average many independent trees to cut variance. Boosting is the
                opposite bet: trees are built in order, and each one only makes
                sense given the ensemble before it.
              </p>
            </div>
          </div>
          <pre className="rounded-xl bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[12px] leading-relaxed p-4 overflow-x-auto mb-3">
{`F_0(x)    = mean(y) = ${run.base.toFixed(2)}          start from a constant
r_i       = y_i - F_m(x_i)           residuals after m trees
F_m+1(x)  = F_m(x) + lr * tree(x)    tree is fit to r by exact split search`}
          </pre>
          <p className="text-[11px] text-[#475569] leading-relaxed max-w-[720px]">
            The data is synthetic and fully disclosed: {N_TRAIN} training and{" "}
            {N_TEST} held-out test points drawn from y = f(x) + noise with a
            fixed seed, where f is a smooth curve with one step. Gradient
            boosting was formalized by Friedman (2001), &quot;Greedy Function
            Approximation: A Gradient Boosting Machine&quot;, Annals of
            Statistics 29(5). XGBoost, LightGBM, and CatBoost are industrial
            implementations of the same idea.
          </p>
        </motion.section>

        {/* Lab */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Step 1: boost, one tree at a time
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Each press of Step fits one tree to the current residuals and adds
            lr times it to the model. Changing the learning rate or the tree
            depth refits the whole sequence from round zero, so the chart always
            shows a genuine boosting run for the settings you chose.
          </p>

          {/* Controls */}
          <div className="flex flex-col lg:flex-row lg:items-end gap-5 mb-5">
            <div className="flex items-end gap-3">
              <button
                onClick={handleStep}
                disabled={rounds >= MAX_ROUNDS}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Step: fit tree {Math.min(rounds + 1, MAX_ROUNDS)}
              </button>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label
                htmlFor="gb-rounds"
                className="block text-[11px] font-semibold text-[#475569] uppercase tracking-wide mb-1.5"
              >
                Rounds: <span className="text-white font-mono">{rounds}</span> / {MAX_ROUNDS}
              </label>
              <input
                id="gb-rounds"
                type="range"
                min={0}
                max={MAX_ROUNDS}
                step={1}
                value={rounds}
                onChange={(e) => handleRounds(Number(e.target.value))}
                className="w-full accent-[#d4af37]"
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label
                htmlFor="gb-lr"
                className="block text-[11px] font-semibold text-[#475569] uppercase tracking-wide mb-1.5"
              >
                Learning rate:{" "}
                <span className="text-white font-mono">{lr.toFixed(2)}</span>
              </label>
              <input
                id="gb-lr"
                type="range"
                min={LR_MIN}
                max={LR_MAX}
                step={LR_STEP}
                value={lr}
                onChange={(e) => handleLrChange(Number(e.target.value))}
                className="w-full accent-[#d4af37]"
              />
            </div>
            <div>
              <p
                id="gb-depth-label"
                className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide mb-1.5"
              >
                Weak learner depth
              </p>
              <div
                role="radiogroup"
                aria-labelledby="gb-depth-label"
                className="flex gap-2"
              >
                {DEPTH_OPTIONS.map((opt) => (
                  <button
                    key={opt.depth}
                    role="radio"
                    aria-checked={depth === opt.depth}
                    onClick={() => setDepth(opt.depth)}
                    className={`px-3 py-2 rounded-xl text-[12px] font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                      depth === opt.depth
                        ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                        : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155] hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stat tiles: every value computed in boostMath.ts */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <div className="rounded-xl border border-[#1e293b] p-3">
              <p className="text-[10px] text-[#475569] mb-1 uppercase tracking-wide">
                Trees in ensemble
              </p>
              <p className="text-[18px] font-mono font-bold text-[#f1f5f9]">
                {rounds}
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-3">
              <p className="text-[10px] text-[#475569] mb-1 uppercase tracking-wide">
                Train MSE
              </p>
              <p className="text-[18px] font-mono font-bold text-[#3bb4a4]">
                {trainMseNow.toFixed(3)}
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-3">
              <p className="text-[10px] text-[#475569] mb-1 uppercase tracking-wide">
                Test MSE ({N_TEST} held-out)
              </p>
              <p className="text-[18px] font-mono font-bold text-[var(--color-warning)]">
                {testMseNow.toFixed(3)}
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-3">
              <p className="text-[10px] text-[#475569] mb-1 uppercase tracking-wide">
                Residual RMSE
              </p>
              <p className="text-[18px] font-mono font-bold text-[#f1f5f9]">
                {residualRms.toFixed(3)}
              </p>
            </div>
          </div>

          <FitChart
            ensemble={run.gridPreds[rounds]}
            deep={showDeep ? deep.gridPreds : null}
            round={rounds}
          />
        </motion.section>

        {/* Residual panel */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Step 2: watch the residuals collapse
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            This panel shows what the next tree sees: the residuals of the
            current ensemble, on a fixed scale. At round zero they are just y
            minus the mean. Boost a few rounds and they shrink toward the zero
            line, which is exactly why each new tree has less and less left to
            fix. The dashed line is the real tree the next Step would add,
            already fit to these residuals.
          </p>
          <ResidualChart
            residuals={residuals}
            nextTree={nextTree}
            residualRms={residualRms}
          />
        </motion.section>

        {/* Comparison vs a single deep tree */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
            <p className="text-[13px] font-semibold text-white">
              Step 3: many weak trees vs one deep tree
            </p>
            <button
              onClick={handleToggleDeep}
              aria-pressed={showDeep}
              className={`px-4 py-2 rounded-xl text-[12px] font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                showDeep
                  ? "border-[#a855f7] text-[#a855f7]"
                  : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155] hover:text-white"
              }`}
            >
              {showDeep ? "Deep tree overlay: on" : "Overlay a single deep tree"}
            </button>
          </div>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            The natural objection: why bother with sixty tiny trees when one
            big tree could fit the data directly? Toggle the overlay to fit a
            single depth {DEEP_TREE_DEPTH} tree to the same {N_TRAIN} points.
            It appears as a dashed line in the chart above and as a reference
            line below. Watch its two errors: excellent on the training set,
            worse than your boosted ensemble on the held-out test set. That gap
            is variance, and shrunken weak learners are how boosting avoids it.
          </p>

          <ErrorChart
            trainMse={run.trainMse}
            testMse={run.testMse}
            round={rounds}
            deepTestMse={showDeep ? deep.testMse : null}
          />

          {showDeep && (
            <div className="mt-4 rounded-xl border border-[#1e293b] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr className="bg-[#1e293b] text-left">
                      <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                        model
                      </th>
                      <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                        trees
                      </th>
                      <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                        total leaves
                      </th>
                      <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                        train MSE
                      </th>
                      <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                        test MSE
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ background: "#0f172a" }}>
                      <td className="px-3 py-2 text-[#94a3b8]">
                        Boosted ensemble (depth {depth}, lr {lr.toFixed(2)},{" "}
                        {rounds} rounds)
                      </td>
                      <td className="px-3 py-2 font-mono text-[#f1f5f9]">
                        {rounds}
                      </td>
                      <td className="px-3 py-2 font-mono text-[#f1f5f9]">
                        {boostedLeaves}
                      </td>
                      <td className="px-3 py-2 font-mono text-[#3bb4a4]">
                        {trainMseNow.toFixed(3)}
                      </td>
                      <td className="px-3 py-2 font-mono text-[var(--color-warning)]">
                        {testMseNow.toFixed(3)}
                      </td>
                    </tr>
                    <tr style={{ background: "#162032" }}>
                      <td className="px-3 py-2 text-[#94a3b8]">
                        Single deep tree (depth {DEEP_TREE_DEPTH}, unpruned)
                      </td>
                      <td className="px-3 py-2 font-mono text-[#f1f5f9]">1</td>
                      <td className="px-3 py-2 font-mono text-[#f1f5f9]">
                        {deep.leaves}
                      </td>
                      <td className="px-3 py-2 font-mono text-[#3bb4a4]">
                        {deep.trainMse.toFixed(3)}
                      </td>
                      <td className="px-3 py-2 font-mono text-[var(--color-warning)]">
                        {deep.testMse.toFixed(3)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-4 rounded-xl border-l-4 border-[var(--color-warning)] bg-[#f97316]/5 border border-[#f97316]/20 p-4">
            <p className="text-[12px] font-semibold text-[var(--color-warning)] mb-1.5 uppercase tracking-wide">
              Try to break it
            </p>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              Push the learning rate to 1.00, set depth 3, and boost to{" "}
              {MAX_ROUNDS} rounds. Train MSE keeps falling while test MSE bottoms
              out and turns upward: the ensemble starts memorizing noise. Small
              learning rates trade more rounds for a flatter, later minimum,
              which is why real systems pair a low rate with early stopping.
              That failure mode has its own guide next.
            </p>
          </div>
        </motion.section>

        {/* Quiz */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Step 4: the defining question
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Each new tree in gradient boosting is fit to:
          </p>
          <div
            role="radiogroup"
            aria-label="What each new boosting tree is fit to"
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3"
          >
            {QUIZ_OPTIONS.map((opt) => {
              const picked = quizPick === opt.id;
              const showState = picked || (quizSolved && opt.correct);
              return (
                <button
                  key={opt.id}
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
                  <p className="text-[12px] text-[#f1f5f9]">{opt.text}</p>
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
              Look at the residual panel again: what exactly does the dashed
              next-tree line hug? Try again.
            </p>
          )}
          {quizSolved && (
            <p className="text-[11px] text-[var(--color-success)] leading-relaxed">
              Right: for squared loss the negative gradient is exactly the
              residual y - F(x), so every round is a small regression problem
              on what the ensemble still gets wrong. Bootstrap samples of the
              raw targets are the random forest recipe, not boosting.
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
                  Boosted, Round by Round
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You built a real gradient boosting ensemble, watched the
                  residuals collapse, and beat a deep tree on held-out data.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Your ensemble
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {rounds} trees, test MSE {testMseNow.toFixed(3)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Settings explored
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      lr {lr.toFixed(2)}, depth {depth}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Single deep tree test MSE
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[#a855f7]">
                      {deep.testMse.toFixed(3)} ({deep.leaves} leaves)
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;A boosted model is many weak trees, each fit to what
                    the ensemble before it still gets wrong. The learning rate
                    shrinks every correction, trading more rounds for better
                    generalization.&quot;
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
