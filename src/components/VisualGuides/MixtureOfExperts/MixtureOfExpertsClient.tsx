"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  MoEState,
  initState,
  initParams,
  trainSteps,
  moeForward,
  gridRmse,
  allEnabled,
  comboKey,
  expertParamCount,
  routerParamCount,
  totalParamCount,
  activeParamCount,
  activeFlopCount,
  denseEquivalentHidden,
  denseEquivalentParams,
  denseEquivalentFlops,
  NUM_EXPERTS,
  TOP_K,
  HIDDEN_DIM,
  MIN_TRAIN_STEPS,
  MAX_STEPS,
  DEFAULT_X1,
  DEFAULT_X2,
} from "./moeMath";
import TrainPanel from "./TrainPanel";
import MoELab from "./MoELab";
import RouterMap from "./RouterMap";

const GUIDE_TITLE = "Mixture of Experts";
const NEXT_GUIDE_SLUG = "temperature-topk";

/** Deterministic (fixed seed), so SSR and client agree byte-for-byte. */
const INITIAL_RMSE = gridRmse(initParams(), allEnabled());

/** Quiz options derived from the architecture, not hardcoded. */
const QUIZ_KS = [1, TOP_K, NUM_EXPERTS / 2, NUM_EXPERTS] as const;

export default function MixtureOfExpertsClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // ── Model + interaction state (Try Again restores exactly these) ─────────
  const [model, setModel] = useState<MoEState>(() => initState());
  const [stepCount, setStepCount] = useState(0);
  const [rmseHistory, setRmseHistory] = useState<number[]>(() => [
    INITIAL_RMSE,
  ]);
  const [x1, setX1] = useState(DEFAULT_X1);
  const [x2, setX2] = useState(DEFAULT_X2);
  const [enabled, setEnabled] = useState<boolean[]>(() => allEnabled());
  const [observedCombos, setObservedCombos] = useState<Set<string>>(
    () => new Set()
  );
  const [gateAblate, setGateAblate] = useState(false);
  const [quizPick, setQuizPick] = useState<number | null>(null);
  const [quizSolved, setQuizSolved] = useState(false);

  // ── Gates ─────────────────────────────────────────────────────────────────
  const gateTrain = stepCount >= MIN_TRAIN_STEPS;
  const gateRoute = observedCombos.size >= 2;
  const isComplete = gateTrain && gateRoute && gateAblate && quizSolved;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleTrain = useCallback(
    (n: number) => {
      const capped = Math.min(n, MAX_STEPS - stepCount);
      if (capped <= 0) return;
      const result = trainSteps(model, capped);
      setModel(result.state);
      setStepCount(stepCount + capped);
      setRmseHistory((prev) => [...prev, ...result.rmseHistory]);
    },
    [model, stepCount]
  );

  const handleResetWeights = useCallback(() => {
    setModel(initState());
    setStepCount(0);
    setRmseHistory([INITIAL_RMSE]);
  }, []);

  const handleInputChange = useCallback(
    (nx1: number, nx2: number) => {
      setX1(nx1);
      setX2(nx2);
      if (stepCount >= MIN_TRAIN_STEPS) {
        const fwd = moeForward(model.params, [nx1, nx2], enabled);
        setObservedCombos((prev) => {
          const next = new Set(prev);
          next.add(comboKey(fwd.top));
          return next;
        });
      }
    },
    [model, enabled, stepCount]
  );

  const handleToggleExpert = useCallback(
    (i: number) => {
      const enabledCount = enabled.filter(Boolean).length;
      if (enabled[i] && enabledCount === 1) return;
      if (enabled[i] && stepCount >= MIN_TRAIN_STEPS) {
        // Ablation gate: only when the user knocks out an expert that is
        // actually in the top-2 for the current input, so the output changes.
        const fwd = moeForward(model.params, [x1, x2], enabled);
        if (fwd.top.includes(i)) setGateAblate(true);
      }
      setEnabled((prev) => prev.map((on, j) => (j === i ? !on : on)));
    },
    [enabled, model, x1, x2, stepCount]
  );

  const handleQuizPick = useCallback((k: number) => {
    setQuizPick(k);
    if (k === TOP_K) setQuizSolved(true);
  }, []);

  function handleReset() {
    setModel(initState());
    setStepCount(0);
    setRmseHistory([INITIAL_RMSE]);
    setX1(DEFAULT_X1);
    setX2(DEFAULT_X2);
    setEnabled(allEnabled());
    setObservedCombos(new Set());
    setGateAblate(false);
    setQuizPick(null);
    setQuizSolved(false);
  }

  const progressItems = [
    { id: "train", label: `Train ${MIN_TRAIN_STEPS}+ steps`, done: gateTrain },
    { id: "route", label: "Visit 2 routing regions", done: gateRoute },
    { id: "ablate", label: "Knock out an active expert", done: gateAblate },
    { id: "quiz", label: "Answer the sparsity question", done: quizSolved },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion
        isComplete={isComplete}
        guideSlug="mixture-of-experts"
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
              LLMs
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3"
          >
            Mixture of{" "}
            <span className="text-[var(--color-accent)]">Experts</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Replace one big MLP with many small ones plus a router, so each
            token only pays for the experts it actually uses. Here you train a
            real {NUM_EXPERTS}-expert, top-{TOP_K} MoE layer in your browser,
            watch the router carve up the input space, then break it by
            knocking experts out.
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

        {/* Concept: why MoE */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The bargain: parameters without the FLOPs
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            A transformer spends most of its parameters in feed-forward (MLP)
            blocks, and a dense model runs every one of those parameters for
            every token. A Mixture of Experts splits that block into many small
            expert MLPs plus a learned router, and each token runs only the
            top-k experts the router picks. Knowledge scales with the number of
            experts; compute scales with k.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Experts are just MLPs
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Nothing exotic inside: each expert here is an ordinary 2 &rarr;{" "}
                {HIDDEN_DIM} (tanh) &rarr; 1 network with{" "}
                {expertParamCount()} parameters. The power comes from having{" "}
                {NUM_EXPERTS} of them that are free to specialize on different
                inputs.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                The router is a learned classifier
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                A tiny linear layer ({routerParamCount()} parameters) scores
                every expert per input and a softmax turns scores into
                probabilities. It is trained end-to-end: gradient flows through
                the gate weights of the selected experts, so routing and
                expertise co-evolve.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Top-{TOP_K} means sparse
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Only the {TOP_K} highest-probability experts run; their gates
                are renormalized to sum to 1 and weight the mixture. The other{" "}
                {NUM_EXPERTS - TOP_K} experts cost storage but zero compute for
                this input.
              </p>
            </div>
          </div>

          {/* Cost comparison, every number from the counter functions */}
          <div className="rounded-xl border border-[#1e293b] overflow-hidden mb-3">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[#1e293b] text-left">
                    <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                      layer
                    </th>
                    <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                      params stored
                    </th>
                    <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                      params active / input
                    </th>
                    <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                      FLOPs / input
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: "#0f172a" }}>
                    <td className="px-3 py-2 text-[#94a3b8]">
                      One dense MLP, matched size (hidden{" "}
                      {denseEquivalentHidden()})
                    </td>
                    <td className="px-3 py-2 font-mono text-[#f1f5f9]">
                      {denseEquivalentParams()}
                    </td>
                    <td className="px-3 py-2 font-mono text-[#f1f5f9]">
                      {denseEquivalentParams()}
                    </td>
                    <td className="px-3 py-2 font-mono text-[#ef4444]">
                      {denseEquivalentFlops()}
                    </td>
                  </tr>
                  <tr style={{ background: "#162032" }}>
                    <td className="px-3 py-2 text-[#94a3b8]">
                      This MoE layer ({NUM_EXPERTS} experts, top-{TOP_K})
                    </td>
                    <td className="px-3 py-2 font-mono text-[#f1f5f9]">
                      {totalParamCount()}
                    </td>
                    <td className="px-3 py-2 font-mono text-[#f1f5f9]">
                      {activeParamCount()}
                    </td>
                    <td className="px-3 py-2 font-mono text-[var(--color-success)]">
                      {activeFlopCount()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-[11px] text-[#475569] leading-relaxed">
            FLOP counts cover the linear layers only (each multiply-add counted
            as 2 FLOPs plus bias adds; tanh and softmax excluded). Same
            parameter budget, roughly a third of the compute per input: that
            ratio is the entire reason MoE exists. In the wild: Mixtral 8x7B
            uses this exact pattern, 8 experts with top-2 routing, storing
            46.7B parameters while activating 12.9B per token (Jiang et al.,
            2024, arXiv:2401.04088).
          </p>
        </motion.section>

        {/* Train */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Step 1: train the layer, for real, in your browser
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            The layer starts at a deterministic random initialization. Every
            number on this page, router probabilities, gates, expert outputs,
            RMSE, is recomputed from the current weights; nothing is scripted.
          </p>
          <TrainPanel
            stepCount={stepCount}
            rmseHistory={rmseHistory}
            onTrain={handleTrain}
            onResetWeights={handleResetWeights}
          />
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
            Step 2: feed inputs and watch the routing
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Move the input and watch the router redistribute its softmax mass.
            Cross a region boundary and the top-{TOP_K} set changes: different
            inputs literally run different parameters. Then knock out an active
            expert and watch the prediction and the grid RMSE degrade.
          </p>
          <MoELab
            params={model.params}
            enabled={enabled}
            x1={x1}
            x2={x2}
            onInputChange={handleInputChange}
            onToggleExpert={handleToggleExpert}
            trained={gateTrain}
          />
        </motion.section>

        {/* Router map */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The router map: where each expert lives
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            The router is linear, so it partitions the input plane into convex
            regions, one specialist per region. This is the specialization MoE
            training is supposed to produce, made visible. Disable an expert
            and its territory is annexed by the runners-up, whose parameters
            never trained there.
          </p>
          <RouterMap
            params={model.params}
            enabled={enabled}
            x1={x1}
            x2={x2}
            onSelect={handleInputChange}
            trained={gateTrain}
          />
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
            Step 3: the sparsity check
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            This layer stores {NUM_EXPERTS} experts of {expertParamCount()}{" "}
            parameters each and routes every input through its top-{TOP_K}.
            What fraction of the expert parameters does one input activate?
          </p>
          <div
            role="radiogroup"
            aria-label="Sparsity question options"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3"
          >
            {QUIZ_KS.map((k) => {
              const picked = quizPick === k;
              const correct = k === TOP_K;
              const showState = picked || (quizSolved && correct);
              return (
                <button
                  key={k}
                  role="radio"
                  aria-checked={picked}
                  onClick={() => handleQuizPick(k)}
                  disabled={quizSolved}
                  className={`rounded-xl border p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                    showState
                      ? correct
                        ? "border-[var(--color-success)]"
                        : "border-[#ef4444]"
                      : "border-[#1e293b] hover:border-[#334155]"
                  } ${quizSolved && !correct ? "opacity-50" : ""}`}
                >
                  <p className="text-[14px] font-mono font-bold text-[#f1f5f9]">
                    {((100 * k) / NUM_EXPERTS).toFixed(1)}%
                  </p>
                  <p className="text-[11px] text-[#94a3b8]">
                    {k * expertParamCount()} of{" "}
                    {NUM_EXPERTS * expertParamCount()} expert params
                  </p>
                  {showState && (
                    <p
                      className={`text-[10px] font-semibold mt-1 ${
                        correct
                          ? "text-[var(--color-success)]"
                          : "text-[#ef4444]"
                      }`}
                    >
                      {correct ? "Correct" : "Not quite"}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
          {quizPick !== null && !quizSolved && (
            <p className="text-[11px] text-[var(--color-warning)] leading-relaxed">
              Count the experts that actually run for one input, not the ones
              that exist. Try again.
            </p>
          )}
          {quizSolved && (
            <p className="text-[11px] text-[var(--color-success)] leading-relaxed">
              Right: top-{TOP_K} of {NUM_EXPERTS} identical experts means{" "}
              {TOP_K * expertParamCount()} of{" "}
              {NUM_EXPERTS * expertParamCount()} expert parameters run, plus
              the {routerParamCount()}-parameter router that always runs. That
              is the sparse-activation bargain.
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
                  Sparsely Activated
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You trained a real MoE layer, watched the router assign
                  specialists, and proved the sparsity math on your own model.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Your training run
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {stepCount} steps, grid RMSE{" "}
                      {rmseHistory[rmseHistory.length - 1].toFixed(4)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Parameters stored vs active
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {totalParamCount()} stored, {activeParamCount()} per
                      input
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      FLOPs per input vs dense
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {activeFlopCount()} vs {denseEquivalentFlops()} at equal
                      params
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;A Mixture of Experts separates what a model knows
                    from what it spends: parameters scale with the number of
                    experts while compute scales with the number you activate.
                    The router makes the bargain work, and load balancing keeps
                    it honest.&quot;
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
