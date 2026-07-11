"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  WIDTHS,
  DATA_SIZES,
  NUM_SIZES,
  NUM_RUNS,
  STEPS,
  paramCount,
  createRun,
  trainChunk,
  valLoss,
  chunkStepsFor,
  runWork,
  totalWork,
  runSpec,
  bestWidthIdxForData,
  type RunState,
  type RunResult,
} from "./scalingMath";
import TaskPreview from "./TaskPreview";
import ExperimentPanel, { type Phase } from "./ExperimentPanel";
import LossChart from "./LossChart";

const GUIDE_TITLE = "Model Size vs Data";
const GUIDE_SLUG = "scaling-intuition";
const NEXT_GUIDE_SLUG = "scaling-laws";
const TOTAL_WORK = totalWork();

const QUIZ_OPTIONS = [
  { id: "smaller", label: "It got smaller" },
  { id: "same", label: "It stayed the same" },
  { id: "bigger", label: "It got bigger" },
] as const;
type QuizId = (typeof QUIZ_OPTIONS)[number]["id"];

export default function ScalingIntuitionClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // ── Experiment state ──
  const [phase, setPhase] = useState<Phase>("idle");
  const [results, setResults] = useState<(RunResult | null)[]>(() =>
    Array<RunResult | null>(NUM_RUNS).fill(null)
  );
  const [runIdx, setRunIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [liveLoss, setLiveLoss] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  // ── Interaction / gate state ──
  const [gateExperiment, setGateExperiment] = useState(false);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [inspectedBudgets, setInspectedBudgets] = useState<Set<number>>(
    () => new Set()
  );
  const [quizPick, setQuizPick] = useState<QuizId | null>(null);
  const [quizSolved, setQuizSolved] = useState(false);

  const runRef = useRef<RunState | null>(null);
  const runIdxRef = useRef(0);
  const doneWorkRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const gateInspect = inspectedBudgets.size >= 2;
  const isComplete = gateExperiment && gateInspect && quizSolved;

  const doneResults = useMemo(
    () => (phase === "done" ? (results.filter(Boolean) as RunResult[]) : []),
    [phase, results]
  );

  /** Best width index per data budget, only meaningful once the run is done. */
  const bestPerBudget = useMemo(
    () =>
      phase === "done"
        ? DATA_SIZES.map((_, d) => bestWidthIdxForData(doneResults, d))
        : DATA_SIZES.map(() => -1),
    [phase, doneResults]
  );

  /** Correct quiz answer, derived from the actual finished runs. */
  const quizAnswer: QuizId = useMemo(() => {
    if (phase !== "done") return "bigger";
    const mid = bestWidthIdxForData(doneResults, 1);
    const large = bestWidthIdxForData(doneResults, 2);
    return large > mid ? "bigger" : large < mid ? "smaller" : "same";
  }, [phase, doneResults]);

  // ── Handlers ──
  const handleRun = useCallback(() => {
    if (phase === "running") return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setResults(Array<RunResult | null>(NUM_RUNS).fill(null));
    setSelectedCell(null);
    setElapsedMs(null);
    setLiveLoss(null);
    setProgress(0);
    setRunIdx(0);
    setPhase("running");
    runIdxRef.current = 0;
    doneWorkRef.current = 0;
    runRef.current = createRun(0, 0);
    startRef.current = performance.now();

    const tick = () => {
      const run = runRef.current;
      if (!run) return;
      const finished = trainChunk(run, chunkStepsFor(run.widthIdx, run.dataIdx));
      const work = runWork(run.widthIdx, run.dataIdx);
      setProgress(
        (doneWorkRef.current + (run.stepsDone / STEPS) * work) / TOTAL_WORK
      );
      setLiveLoss(run.trainLoss);
      if (!finished) {
        timerRef.current = window.setTimeout(tick, 0);
        return;
      }
      const res: RunResult = {
        widthIdx: run.widthIdx,
        dataIdx: run.dataIdx,
        train: run.trainLoss,
        val: valLoss(run),
      };
      const idx = runIdxRef.current;
      doneWorkRef.current += work;
      setResults((prev) => {
        const next = [...prev];
        next[idx] = res;
        return next;
      });
      if (idx + 1 < NUM_RUNS) {
        runIdxRef.current = idx + 1;
        setRunIdx(idx + 1);
        const spec = runSpec(idx + 1);
        runRef.current = createRun(spec.widthIdx, spec.dataIdx);
        timerRef.current = window.setTimeout(tick, 0);
      } else {
        runRef.current = null;
        setElapsedMs(performance.now() - startRef.current);
        setPhase("done");
        setGateExperiment(true);
      }
    };
    timerRef.current = window.setTimeout(tick, 0);
  }, [phase]);

  const handleSelectCell = useCallback(
    (i: number) => {
      if (results[i] === null) return;
      setSelectedCell(i);
      setInspectedBudgets((prev) => {
        const next = new Set(prev);
        next.add(i % NUM_SIZES);
        return next;
      });
    },
    [results]
  );

  const handleQuizPick = useCallback(
    (id: QuizId) => {
      if (phase !== "done") return;
      setQuizPick(id);
      if (id === quizAnswer) setQuizSolved(true);
    },
    [phase, quizAnswer]
  );

  function handleReset() {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    runRef.current = null;
    runIdxRef.current = 0;
    doneWorkRef.current = 0;
    setPhase("idle");
    setResults(Array<RunResult | null>(NUM_RUNS).fill(null));
    setRunIdx(0);
    setProgress(0);
    setLiveLoss(null);
    setElapsedMs(null);
    setGateExperiment(false);
    setSelectedCell(null);
    setInspectedBudgets(new Set());
    setQuizPick(null);
    setQuizSolved(false);
  }

  const progressItems = [
    { id: "run", label: "Run the 16-run grid", done: gateExperiment },
    {
      id: "inspect",
      label: `Inspect 2 data budgets (${Math.min(inspectedBudgets.size, 2)}/2)`,
      done: gateInspect,
    },
    { id: "quiz", label: "Answer the scaling question", done: quizSolved },
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
              Deep Learning
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Model Size <span className="text-[var(--color-accent)]">vs Data</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[640px]">
            Bigger models need more data. Train 16 real networks in your
            browser, four widths on four data budgets of the same task, and
            watch the best model size shift as the data grows.
          </p>
        </section>

        {/* Progress pills */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          {progressItems.map((item) => (
            <div key={item.id} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full transition-colors duration-300"
                style={{
                  background: item.done ? "var(--color-accent)" : "#1e293b",
                }}
              />
              <span
                className={`text-[11px] transition-colors ${item.done ? "text-white" : "text-[#475569]"}`}
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
        </div>

        <div className="space-y-6">
          {/* Section 1: the setup */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
            className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6"
          >
            <p className="text-[13px] font-semibold text-white mb-1">
              One task, sixteen networks
            </p>
            <p className="text-[12px] text-[#475569] leading-relaxed mb-4 max-w-[680px]">
              Every run is a tiny MLP (2 inputs, one tanh hidden layer, 1
              output) trained to regress the same 2D function from noisy
              samples. The grid crosses four hidden widths ({WIDTHS.join(", ")}
              , which is {WIDTHS.map((w) => paramCount(w)).join(", ")}{" "}
              parameters) with four training set sizes ({DATA_SIZES.join(", ")}
              ). Each width reuses the same Xavier initialization (Glorot &amp;
              Bengio, 2010) across budgets, so within a row the only thing
              that changes is the amount of data.
            </p>
            <TaskPreview />
          </motion.section>

          {/* Section 2: the experiment */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
          >
            <ExperimentPanel
              phase={phase}
              progress={progress}
              runIdx={runIdx}
              liveLoss={liveLoss}
              elapsedMs={elapsedMs}
              results={results}
              selectedCell={selectedCell}
              bestPerBudget={bestPerBudget}
              onRun={handleRun}
              onSelectCell={handleSelectCell}
            />
          </motion.section>

          {/* Section 3: the scaling curves */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
            className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6"
          >
            <p className="text-[13px] font-semibold text-white mb-1">
              Loss vs parameters, one line per data budget
            </p>
            <p className="text-[12px] text-[#475569] leading-relaxed mb-4 max-w-[680px]">
              This is the crossover picture. Follow any single line left to
              right: adding parameters helps until the gold-ringed sweet spot,
              then flattens or turns back up. Now compare lines: the sweet
              spot slides right as the budget grows, until it parks. In this
              grid the step from 128 to 512 points keeps width 32 on top. The
              right size is not a property of the model, it is a property of
              the model and the data together.
            </p>
            {phase === "done" ? (
              <>
                <LossChart results={doneResults} bestPerBudget={bestPerBudget} />
                <div className="mt-4 rounded-xl border border-[#334155] bg-[#162032] p-4">
                  <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-1.5">
                    Sweet spots in your run
                  </p>
                  <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                    {DATA_SIZES.map(
                      (n, d) =>
                        `${n} points: width ${WIDTHS[bestPerBudget[d]]}`
                    ).join(" · ")}
                    . With {DATA_SIZES[0]} points, width{" "}
                    {WIDTHS[WIDTHS.length - 1]} fit its training set to an MSE
                    of{" "}
                    {doneResults
                      .find((r) => r.widthIdx === WIDTHS.length - 1 && r.dataIdx === 0)!
                      .train.toFixed(4)}{" "}
                    yet scored{" "}
                    {doneResults
                      .find((r) => r.widthIdx === WIDTHS.length - 1 && r.dataIdx === 0)!
                      .val.toFixed(2)}{" "}
                    on validation, worse than predicting the mean. The same
                    architecture on {DATA_SIZES[NUM_SIZES - 1]} points reached{" "}
                    {doneResults
                      .find(
                        (r) =>
                          r.widthIdx === WIDTHS.length - 1 &&
                          r.dataIdx === NUM_SIZES - 1
                      )!
                      .val.toFixed(4)}
                    . Same parameters, opposite verdict: the data decided.
                  </p>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-[#334155] p-8 text-center">
                <p className="text-[12px] text-[#475569]">
                  Run the experiment above to draw this chart from your own 16
                  training runs.
                </p>
              </div>
            )}
          </motion.section>

          {/* Section 4: quiz */}
          {phase === "done" && (
            <motion.section
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={GUIDE_VIEWPORT}
              className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6"
            >
              <p className="text-[13px] font-semibold text-white mb-1">
                Read your own results
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
                The training budget grew from {DATA_SIZES[1]} to {DATA_SIZES[2]}{" "}
                points. What happened to the width that generalized best?
              </p>
              <div
                role="radiogroup"
                aria-label="What happened to the best width when the data grew"
                className="flex flex-wrap gap-2 mb-3"
              >
                {QUIZ_OPTIONS.map((opt) => {
                  const picked = quizPick === opt.id;
                  const correct = picked && opt.id === quizAnswer;
                  return (
                    <button
                      key={opt.id}
                      role="radio"
                      aria-checked={picked}
                      onClick={() => handleQuizPick(opt.id)}
                      className={`px-4 py-2.5 rounded-xl text-[12px] font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                        correct
                          ? "border-[var(--color-success)] text-[var(--color-success)]"
                          : picked
                            ? "border-[var(--color-warning)] text-[var(--color-warning)]"
                            : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155] hover:text-white"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {quizPick !== null && (
                <p
                  className={`text-[12px] leading-relaxed ${quizSolved ? "text-[var(--color-success)]" : "text-[var(--color-warning)]"}`}
                >
                  {quizSolved
                    ? `Correct. In your grid the best width moved from ${WIDTHS[bestWidthIdxForData(doneResults, 1)]} at ${DATA_SIZES[1]} points to ${WIDTHS[bestWidthIdxForData(doneResults, 2)]} at ${DATA_SIZES[2]} points. More data earned the right to more parameters.`
                    : "Not quite. Check the gold stars in the results table: compare which row wins the 32-point column against the 128-point column."}
                </p>
              )}
            </motion.section>
          )}

          {/* Section 5: scope + where to go next */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
            className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6"
          >
            <p className="text-[13px] font-semibold text-white mb-2">
              Where this toy stops
            </p>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed max-w-[720px] mb-3">
              This grid is practitioner intuition, not a law. Two-layer tanh
              networks on a 2D regression task will not tell you how a
              billion-parameter transformer behaves, and modern deep learning
              adds wrinkles this setup deliberately avoids (double descent,
              regularization schedules, early stopping, architectures whose
              inductive bias changes the picture). What does carry over is the
              shape of the tradeoff: parameters are a budget you spend against
              your data, and the affordable model size grows with the dataset.
            </p>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed max-w-[720px]">
              The quantitative version of this idea, power-law loss curves,
              compute-optimal frontiers, and the Chinchilla rule of thumb for
              LLMs, lives in the{" "}
              <Link
                href="/visual-guides/scaling-laws"
                className="underline underline-offset-2 text-[var(--color-accent)] hover:opacity-80"
              >
                Scaling Laws guide
              </Link>
              . This page gives you the instinct; that one gives you the
              formulas.
            </p>
          </motion.section>
        </div>

        {/* Completion card */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              variants={card}
              initial="hidden"
              animate="visible"
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
                  Scaling Intuition Earned
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You trained 16 real networks and read the size-vs-data
                  tradeoff straight off your own loss grid.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {[
                    {
                      label: "Training runs completed",
                      value: `${NUM_RUNS} / ${NUM_RUNS}`,
                      color: "#3bb4a4",
                    },
                    {
                      label: "Distinct sweet spots found",
                      value: `${new Set(bestPerBudget).size} widths`,
                      color: "var(--color-accent)",
                    },
                    {
                      label: "Budgets inspected",
                      value: `${inspectedBudgets.size} / ${NUM_SIZES}`,
                      color: "#a855f7",
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-[#1e293b] p-3">
                      <p className="text-[10px] text-[#475569] mb-1">{item.label}</p>
                      <p
                        className="text-[14px] font-mono font-bold"
                        style={{ color: item.color }}
                      >
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Model size is not a virtue on its own. Parameters are
                    a budget you spend against your data: too few and you miss
                    the signal, too many and you memorize the noise. Grow the
                    model as the data grows.&quot;
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
