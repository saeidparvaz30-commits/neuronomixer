"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  N_SAMPLES,
  NOISE_SD,
  DEFAULT_B1,
  DEFAULT_B2,
  DEFAULT_DEGREE,
  DEGREES,
  computeResults,
  splitDataset,
  clampB1,
  clampB2,
  bestBy,
} from "./splitMath";
import SplitStrip from "./SplitStrip";
import FitChart from "./FitChart";
import ModelSelector from "./ModelSelector";

const GUIDE_TITLE = "Train, Validation, and Test Sets";
const NEXT_GUIDE_SLUG = "cross-validation";
const DEGREES_TO_EXPLORE = 3;

export default function TrainValidationTestClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // ── Interaction state (Try Again restores exactly these) ─────────────────
  const [b1, setB1] = useState(DEFAULT_B1);
  const [b2, setB2] = useState(DEFAULT_B2);
  const [degree, setDegree] = useState(DEFAULT_DEGREE);
  const [visitedDegrees, setVisitedDegrees] = useState<Set<number>>(
    () => new Set([DEFAULT_DEGREE])
  );
  const [peek, setPeek] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [gateSplit, setGateSplit] = useState(false);
  const [gatePeek, setGatePeek] = useState(false);

  // ── Real math, recomputed live ────────────────────────────────────────────
  const results = useMemo(() => computeResults(b1, b2), [b1, b2]);
  const split = useMemo(() => splitDataset(b1, b2), [b1, b2]);
  const current = results.find((r) => r.degree === degree) ?? results[0];
  const byVal = bestBy(results, "valRmse");
  const byTest = bestBy(results, "testRmse");

  // ── Gates ─────────────────────────────────────────────────────────────────
  const gateDegrees = visitedDegrees.size >= DEGREES_TO_EXPLORE;
  const isComplete = gateSplit && gateDegrees && gatePeek;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSplitChange = useCallback(
    (nb1: number, nb2: number) => {
      const cb2 = clampB2(nb2, Math.min(nb1, nb2 - 1));
      const cb1 = clampB1(nb1, cb2);
      if (cb1 === b1 && cb2 === b2) return;
      setB1(cb1);
      setB2(cb2);
      setGateSplit(true);
    },
    [b1, b2]
  );

  const handleDegreeChange = useCallback(
    (d: number) => {
      if (d === degree || !DEGREES.includes(d)) return;
      setDegree(d);
      setVisitedDegrees((prev) => {
        const next = new Set(prev);
        next.add(d);
        return next;
      });
    },
    [degree]
  );

  const handleTogglePeek = useCallback(() => {
    setPeek((p) => !p);
  }, []);

  const handleReveal = useCallback(() => {
    if (!peek) return;
    setRevealed(true);
    setGatePeek(true);
  }, [peek]);

  function handleReset() {
    setB1(DEFAULT_B1);
    setB2(DEFAULT_B2);
    setDegree(DEFAULT_DEGREE);
    setVisitedDegrees(new Set([DEFAULT_DEGREE]));
    setPeek(false);
    setRevealed(false);
    setGateSplit(false);
    setGatePeek(false);
  }

  const progressItems = [
    { id: "split", label: "Reshape the split", done: gateSplit },
    {
      id: "degrees",
      label: `Compare ${DEGREES_TO_EXPLORE} polynomial degrees`,
      done: gateDegrees,
    },
    { id: "peek", label: "Peek at test, face the penalty", done: gatePeek },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion
        isComplete={isComplete}
        guideSlug="train-validation-test"
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
            Train, Validation, and{" "}
            <span className="text-[var(--color-accent)]">Test Sets</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Drag the split boundaries of a real dataset, fit polynomials on
            the train block only, and watch what each split is allowed to
            decide. Then peek at the test set and measure exactly what that
            shortcut costs you.
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

        {/* Concept: three jobs, three datasets */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Three jobs, three datasets
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Every decision in a modeling pipeline consumes data. Fitting
            parameters consumes the train set. Comparing candidate models
            consumes the validation set: whichever model wins has, in a small
            way, fit the validation data too. That is why a third set exists.
            The test set answers exactly one question, once, at the very end:
            how well does the chosen model generalize?
          </p>
          <div className="rounded-xl border border-[#1e293b] overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[#1e293b] text-left">
                    <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                      split
                    </th>
                    <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                      fits parameters
                    </th>
                    <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                      chooses the model
                    </th>
                    <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                      final report
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: "#0f172a" }}>
                    <td className="px-3 py-2 text-[#f1f5f9] font-semibold">Train</td>
                    <td className="px-3 py-2 text-[var(--color-success)]">yes</td>
                    <td className="px-3 py-2 text-[#475569]">no</td>
                    <td className="px-3 py-2 text-[#475569]">no</td>
                  </tr>
                  <tr style={{ background: "#162032" }}>
                    <td className="px-3 py-2 text-[#f1f5f9] font-semibold">
                      Validation
                    </td>
                    <td className="px-3 py-2 text-[#475569]">no</td>
                    <td className="px-3 py-2 text-[var(--color-success)]">yes</td>
                    <td className="px-3 py-2 text-[#475569]">no</td>
                  </tr>
                  <tr style={{ background: "#0f172a" }}>
                    <td className="px-3 py-2 text-[#f1f5f9] font-semibold">Test</td>
                    <td className="px-3 py-2 text-[#475569]">no</td>
                    <td className="px-3 py-2 text-[#475569]">no</td>
                    <td className="px-3 py-2 text-[var(--color-success)]">
                      once, at the end
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-[11px] text-[#475569] leading-relaxed max-w-[720px]">
            Two close relatives are worth knowing. When a single validation
            split feels too noisy,{" "}
            <Link
              href="/visual-guides/cross-validation"
              className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              k-fold cross-validation
            </Link>{" "}
            rotates the validation role so every point gets held out once. And
            when information from validation or test leaks into training
            through preprocessing or feature engineering, you get{" "}
            <Link
              href="/visual-guides/data-leakage"
              className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              data leakage
            </Link>
            , the silent version of the peeking you will do on purpose below.
          </p>
        </motion.section>

        {/* Step 1: the split strip */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Step 1: carve up the dataset
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Below are {N_SAMPLES} samples drawn from y = sin(2 pi x) plus
            Gaussian noise (sd {NOISE_SD}), shown in already-shuffled order,
            one cell per sample. Shuffling before splitting matters: if the
            data were sorted, each block would see a different slice of the
            world. Drag the two handles to reshape the split and watch every
            number on this page recompute.
          </p>
          <SplitStrip b1={b1} b2={b2} onChange={handleSplitChange} />
        </motion.section>

        {/* Step 2: fit on train only */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Step 2: fit on train, only on train
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Each degree is a real least-squares fit computed on the{" "}
            {split.train.length} train points and nothing else. Sweep the
            degree: low degrees underfit everything, high degrees chase the
            train noise, and the gap between the train bar and the other two
            bars is the overfit. Try squeezing the train block small with the
            strip above and then pushing the degree up: with almost as many
            parameters as points, the fit goes through the noise and the
            validation error explodes.
          </p>
          <FitChart
            train={split.train}
            val={split.val}
            test={split.test}
            result={current}
            degree={degree}
            onDegreeChange={handleDegreeChange}
          />
        </motion.section>

        {/* Step 3: selection and the peek */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Step 3: choose a model, then break the rule
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            The proper workflow: pick the degree with the lowest validation
            RMSE (marked in gold), then report its test RMSE as your final
            number. The tempting shortcut: peek at the test errors and pick
            whatever scores best there. The toggle below lets you do exactly
            that, and then a fresh sample from the same generator, never used
            for fitting or choosing, shows what your reported number was
            hiding. This is selection overfitting: the minimum of many noisy
            scores is a biased estimate of the winner&apos;s true error.
          </p>
          <ModelSelector
            results={results}
            b1={b1}
            b2={b2}
            degree={degree}
            peek={peek}
            revealed={revealed}
            onAdoptDegree={handleDegreeChange}
            onTogglePeek={handleTogglePeek}
            onReveal={handleReveal}
          />
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
                  Splits Understood
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You reshaped a real split, watched least-squares fits chase
                  train noise, and measured the price of peeking at test.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Your split at completion
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {b1} / {b2 - b1} / {N_SAMPLES - b2}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Honest pick (by validation)
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      degree {byVal.degree}, test {byVal.testRmse.toFixed(3)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Peeked pick: reported vs fresh
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {byTest.testRmse.toFixed(3)} vs{" "}
                      {byTest.freshRmse.toFixed(3)}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Train fits the parameters, validation chooses the
                    model, and test gets one read at the very end. The moment
                    test error influences any choice, it stops measuring
                    generalization and starts flattering it.&quot;
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
