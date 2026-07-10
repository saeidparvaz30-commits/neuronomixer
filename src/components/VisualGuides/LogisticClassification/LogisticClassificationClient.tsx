"use client";

import React, { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  LabeledPoint,
  LogisticParams,
  makeDefaultPoints,
  initParams,
  trainSteps,
  crossEntropy,
  confusionCounts,
  accuracy,
  MIN_TRAIN_STEPS,
  MAX_TRAIN_STEPS,
  REFIT_STEPS,
  DEFAULT_THRESHOLD,
} from "./logisticMath";
import ClassifierPlot from "./ClassifierPlot";
import TrainControls from "./TrainControls";
import ThresholdPanel from "./ThresholdPanel";

const GUIDE_TITLE = "Logistic Classification";
const NEXT_GUIDE_SLUG = "naive-bayes";

/** Deterministic (fixed seed and zero init), so SSR and client agree byte-for-byte. */
const INITIAL_LOSS = crossEntropy(initParams(), makeDefaultPoints());

type QuizOption = {
  id: string;
  text: string;
  correct: boolean;
};

const QUIZ_OPTIONS: readonly QuizOption[] = [
  {
    id: "raise",
    text: "Raise it toward 1, so mail is deleted only when the model is very confident it is spam",
    correct: true,
  },
  {
    id: "lower",
    text: "Lower it toward 0, so more mail gets flagged as spam",
    correct: false,
  },
  {
    id: "keep",
    text: "Keep it at 0.5, the threshold does not change which kind of errors happen",
    correct: false,
  },
  {
    id: "retrain",
    text: "Only more training can reduce false positives, the threshold cannot",
    correct: false,
  },
];

export default function LogisticClassificationClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // ── Model + interaction state (Try Again restores exactly these) ─────────
  const [points, setPoints] = useState<LabeledPoint[]>(() =>
    makeDefaultPoints()
  );
  const [params, setParams] = useState<LogisticParams>(() => initParams());
  const [stepCount, setStepCount] = useState(0);
  const [refitSteps, setRefitSteps] = useState(0);
  const [lossHistory, setLossHistory] = useState<number[]>(() => [
    INITIAL_LOSS,
  ]);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [gateMove, setGateMove] = useState(false);
  const [gateThreshold, setGateThreshold] = useState(false);
  const [quizPick, setQuizPick] = useState<string | null>(null);
  const [quizSolved, setQuizSolved] = useState(false);

  // Window-level drag listeners can fire faster than React re-renders, so the
  // refit path reads and writes these refs synchronously; every 30-step refit
  // then genuinely continues from the weights the previous move produced.
  const pointsRef = useRef(points);
  const paramsRef = useRef(params);

  // ── Gates ─────────────────────────────────────────────────────────────────
  const gateTrain = stepCount >= MIN_TRAIN_STEPS;
  const isComplete = gateTrain && gateMove && gateThreshold && quizSolved;

  const currentLoss = crossEntropy(params, points);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleTrain = useCallback(
    (n: number) => {
      const capped = Math.min(n, MAX_TRAIN_STEPS - stepCount);
      if (capped <= 0) return;
      const result = trainSteps(params, points, capped);
      paramsRef.current = result.params;
      setParams(result.params);
      setStepCount(stepCount + capped);
      setLossHistory((prev) => [...prev, ...result.lossHistory]);
    },
    [params, points, stepCount]
  );

  const handleResetWeights = useCallback(() => {
    paramsRef.current = initParams();
    setParams(paramsRef.current);
    setStepCount(0);
    setRefitSteps(0);
    setLossHistory([crossEntropy(initParams(), points)]);
  }, [points]);

  const handleMovePoint = useCallback(
    (id: number, x1: number, x2: number) => {
      const prevPoints = pointsRef.current;
      const pt = prevPoints.find((p) => p.id === id);
      if (!pt || (pt.x1 === x1 && pt.x2 === x2)) return;
      const nextPoints = prevPoints.map((p) =>
        p.id === id ? { ...p, x1, x2 } : p
      );
      pointsRef.current = nextPoints;
      setPoints(nextPoints);
      if (gateTrain) {
        const result = trainSteps(paramsRef.current, nextPoints, REFIT_STEPS);
        paramsRef.current = result.params;
        setParams(result.params);
        setRefitSteps((prev) => prev + REFIT_STEPS);
        setGateMove(true);
      }
    },
    [gateTrain]
  );

  const handleThreshold = useCallback((t: number) => {
    setThreshold(t);
    if (t !== DEFAULT_THRESHOLD) setGateThreshold(true);
  }, []);

  const handleQuizPick = useCallback((option: QuizOption) => {
    setQuizPick(option.id);
    if (option.correct) setQuizSolved(true);
  }, []);

  function handleReset() {
    pointsRef.current = makeDefaultPoints();
    paramsRef.current = initParams();
    setPoints(pointsRef.current);
    setParams(paramsRef.current);
    setStepCount(0);
    setRefitSteps(0);
    setLossHistory([INITIAL_LOSS]);
    setThreshold(DEFAULT_THRESHOLD);
    setGateMove(false);
    setGateThreshold(false);
    setQuizPick(null);
    setQuizSolved(false);
  }

  const progressItems = [
    { id: "train", label: `Train ${MIN_TRAIN_STEPS}+ steps`, done: gateTrain },
    { id: "move", label: "Move a point (after training)", done: gateMove },
    { id: "threshold", label: "Slide the threshold", done: gateThreshold },
    { id: "quiz", label: "Answer the cost question", done: quizSolved },
  ];

  // Numbers for the quiz explanation, computed from the actual current model.
  const cLow = confusionCounts(params, points, 0.2);
  const cHigh = confusionCounts(params, points, 0.8);
  const cNow = confusionCounts(params, points, threshold);

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion
        isComplete={isComplete}
        guideSlug="logistic-classification"
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
            Logistic{" "}
            <span className="text-[var(--color-accent)]">Classification</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            A linear score, squashed by the sigmoid into a probability, cut by
            a threshold into a decision. Train a real classifier on draggable
            points, watch gradient descent chase the data, then trade false
            positives against false negatives with one slider.
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
            Three moves: score, squash, cut
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Logistic classification is the smallest useful classifier and the
            template for the output layer of far bigger ones. It never predicts
            a class directly. It predicts a probability, and a separate
            threshold turns that probability into a decision.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                1. Score linearly
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                z = w1 x1 + w2 x2 + b is just a weighted sum. Its sign says
                which side of a line the point is on; its size says how far
                from that line.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                2. Squash with the sigmoid
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                p = 1 / (1 + e^-z) maps any score into (0, 1). Score 0 becomes
                p = 0.5, large positive scores approach 1, large negative
                scores approach 0. Distance from the line becomes confidence.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                3. Cut with a threshold
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Predict class 1 when p is at least t. The set of points where p
                = t is a straight line: the decision boundary. Training aims
                the line; the threshold slides it.
              </p>
            </div>
          </div>
          <pre className="rounded-xl bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[12px] p-4 overflow-x-auto mb-3">
            {`z = w1 * x1 + w2 * x2 + b          linear score
p = 1 / (1 + exp(-z))              sigmoid: probability of class 1
predict class 1 when p >= t        the threshold t is YOUR choice, not the model's`}
          </pre>
          <p className="text-[11px] text-[#475569] leading-relaxed">
            This guide is the machine-learning view: fit by gradient descent,
            predict, decide. The same model has a statistics life as a GLM,
            where the interesting questions are about the coefficients
            themselves: log-odds interpretation, standard errors, significance.
            That view lives in the{" "}
            <Link
              href="/visual-guides/logistic-regression"
              className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              Logistic Regression guide
            </Link>
            . No coefficient inference here, only decisions.
          </p>
        </motion.section>

        {/* Step 1: train */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Step 1: train it, for real, in your browser
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            The weights start at zero, where the model says p = 0.5 for
            everything and the loss is ln 2, about 0.6931. Each training step
            computes the true cross-entropy gradient over all visible points
            and walks downhill. Watch the loss fall and the score function take
            shape.
          </p>
          <TrainControls
            stepCount={stepCount}
            refitSteps={refitSteps}
            lossHistory={lossHistory}
            currentLoss={currentLoss}
            params={params}
            onTrain={handleTrain}
            onResetWeights={handleResetWeights}
          />
        </motion.section>

        {/* Step 2: the decision surface */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Step 2: move the data, slide the threshold
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            The map shows the model&apos;s probability at every location: blue
            where it bets on class 0, pink where it bets on class 1, dark where
            it is unsure. Drag a point across the boundary and gradient descent
            refits live. Then slide the threshold and watch the boundary
            translate while the confusion counts rebalance.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] gap-6">
            <ClassifierPlot
              points={points}
              params={params}
              threshold={threshold}
              trained={gateTrain}
              onMovePoint={handleMovePoint}
            />
            <ThresholdPanel
              params={params}
              points={points}
              threshold={threshold}
              trained={gateTrain}
              onThresholdChange={handleThreshold}
            />
          </div>
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
            Step 3: the cost question
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            You deploy this classifier as a spam filter: class 1 means spam and
            the message is deleted. A false positive (real mail deleted) is far
            more costly than a false negative (spam that slips through). Which
            way do you move the threshold?
          </p>
          <div
            role="radiogroup"
            aria-label="Cost question options"
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
                  onClick={() => handleQuizPick(opt)}
                  disabled={quizSolved}
                  className={`rounded-xl border p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                    showState
                      ? opt.correct
                        ? "border-[var(--color-success)]"
                        : "border-[#ef4444]"
                      : "border-[#1e293b] hover:border-[#334155]"
                  } ${quizSolved && !opt.correct ? "opacity-50" : ""}`}
                >
                  <p className="text-[12px] text-[#f1f5f9] leading-relaxed">
                    {opt.text}
                  </p>
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
              Think about what the threshold does to the region predicted as
              class 1: raising t makes the classifier flag less, lowering it
              makes it flag more. Try again.
            </p>
          )}
          {quizSolved && (
            <p className="text-[11px] text-[var(--color-success)] leading-relaxed">
              Right: raising t shrinks the predicted-spam region, so fewer real
              messages get deleted. On your current points and weights, t =
              0.80 gives {cHigh.fp} false positives and {cHigh.fn} false
              negatives, while t = 0.20 gives {cLow.fp} and {cLow.fn}. Fewer
              false positives are paid for with more false negatives. The
              threshold is where that business decision lives, and no retraining
              is needed to change it.
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
                  Boundary Drawn
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You trained a real logistic classifier, dragged its data out
                  from under it, and set its threshold like an engineer.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Your training run
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {stepCount} steps
                      {refitSteps > 0 ? ` + ${refitSteps} refit` : ""}, loss{" "}
                      {currentLoss.toFixed(4)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Your decision rule
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      predict 1 when p ≥ {threshold.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Confusion at that rule
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {(100 * accuracy(cNow)).toFixed(1)}% acc, {cNow.fp} FP,{" "}
                      {cNow.fn} FN
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;A logistic classifier is three moves: score linearly,
                    squash with the sigmoid, cut with a threshold. Training
                    aims the boundary; the threshold slides it to match the
                    cost of your mistakes, and choosing it is your job, not the
                    model&apos;s.&quot;
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
