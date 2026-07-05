"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  ScoreView,
  generateSamples,
  modelScores,
  computeReliability,
  computeAuc,
  MISCALIBRATED_ECE,
  TARGET_ECE_MARGIN,
  SAMPLE_COUNT,
  SEED,
} from "./types";
import ReliabilityDiagram from "./ReliabilityDiagram";
import ConfidenceHistogram from "./ConfidenceHistogram";
import CalibrationControls from "./CalibrationControls";
import ProsePanels from "./ProsePanels";

// Deterministic dataset: identical on server and client (seeded LCG, no Math.random).
const SAMPLES = generateSamples();
const LABELS: ReadonlyArray<0 | 1> = SAMPLES.map((s) => s.label);

const GUIDE_TITLE = "Model Calibration";
const NEXT_GUIDE_SLUG = "confusion-matrix";

export default function ModelCalibrationClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  const [trueT, setTrueT] = useState(1.0);
  const [userT, setUserT] = useState(1.0);
  const [view, setView] = useState<ScoreView>("raw");

  // Gate snapshots (null until the gate has been achieved at least once)
  const [miscalSnapshot, setMiscalSnapshot] = useState<number | null>(null);
  const [fixedSnapshot, setFixedSnapshot] = useState<{ t: number; ece: number } | null>(null);
  const [whenItMattersRead, setWhenItMattersRead] = useState(false);

  // Best T the user has found for the CURRENT distortion (reset when trueT moves)
  const [bestFound, setBestFound] = useState<{ t: number; ece: number } | null>(null);

  // ── Live computation from the on-screen data ───────────────────────────────
  const rawScores = useMemo(() => modelScores(SAMPLES, trueT, 1), [trueT]);
  const calScores = useMemo(() => modelScores(SAMPLES, trueT, userT), [trueT, userT]);
  const rawRel = useMemo(() => computeReliability(rawScores, LABELS), [rawScores]);
  const calRel = useMemo(() => computeReliability(calScores, LABELS), [calScores]);

  // Sampling-noise floor: ECE of the PERFECTLY calibrated scores on this sample
  const floorEce = useMemo(
    () => computeReliability(modelScores(SAMPLES, 1, 1), LABELS).ece,
    []
  );
  const targetEce = floorEce + TARGET_ECE_MARGIN;

  const aucRaw = useMemo(() => computeAuc(rawScores, LABELS), [rawScores]);
  const aucCal = useMemo(() => computeAuc(calScores, LABELS), [calScores]);

  const isMiscalibrated = rawRel.ece >= MISCALIBRATED_ECE;
  const isFixedNow = isMiscalibrated && calRel.ece <= targetEce;

  // ── Gates ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isMiscalibrated) {
      setMiscalSnapshot((prev) => (prev === null ? rawRel.ece : Math.max(prev, rawRel.ece)));
    }
  }, [isMiscalibrated, rawRel.ece]);

  useEffect(() => {
    if (isFixedNow) {
      setFixedSnapshot((prev) =>
        prev === null || calRel.ece < prev.ece ? { t: userT, ece: calRel.ece } : prev
      );
    }
  }, [isFixedNow, calRel.ece, userT]);

  useEffect(() => {
    if (isMiscalibrated && calRel.ece < rawRel.ece) {
      setBestFound((prev) =>
        prev === null || calRel.ece < prev.ece ? { t: userT, ece: calRel.ece } : prev
      );
    }
  }, [isMiscalibrated, calRel.ece, rawRel.ece, userT]);

  const gateMiscal = miscalSnapshot !== null;
  const gateFixed = fixedSnapshot !== null;
  const isComplete = gateMiscal && gateFixed && whenItMattersRead;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleTrueTChange = useCallback((v: number) => {
    setTrueT(v);
    setBestFound(null); // best T is only meaningful for one fixed distortion
  }, []);

  const handleUserTChange = useCallback((v: number) => {
    setUserT(v);
    setView("calibrated"); // show the effect of the fix as it is being applied
  }, []);

  const handleWhenItMattersOpened = useCallback(() => setWhenItMattersRead(true), []);

  function handleReset() {
    setTrueT(1.0);
    setUserT(1.0);
    setView("raw");
    setMiscalSnapshot(null);
    setFixedSnapshot(null);
    setWhenItMattersRead(false);
    setBestFound(null);
  }

  const shownRel = view === "raw" ? rawRel : calRel;
  const shownLabel = view === "raw" ? "raw model" : "temperature-scaled";

  const tTimesTrueT = userT * trueT;
  const bestMatches =
    bestFound !== null && Math.abs(1 / bestFound.t - trueT) <= 0.1 * trueT;

  const progressItems = [
    { id: "miscal", label: "Create a miscalibrated model", done: gateMiscal },
    { id: "fixed", label: "Fix it with temperature", done: gateFixed },
    { id: "matters", label: "Read when it matters", done: whenItMattersRead },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="model-calibration" score={4} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#475569] mb-6">
          <Link href="/visual-guides" className="hover:text-[var(--color-accent)] transition-colors">
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
            Model <span className="text-[var(--color-accent)]">Calibration</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            A calibrated model&apos;s confidence matches reality: among its 80 percent
            predictions, about 80 percent should come true. Break a model&apos;s calibration
            with one slider, then repair it with temperature scaling.
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
              <span className={`text-[11px] ${item.done ? "text-white" : "text-[#475569]"}`}>
                {item.label}
              </span>
            </div>
          ))}
          {!session?.user && (
            <p className="text-[11px] text-[#475569] ml-auto">
              <Link href="/auth/sign-in" className="underline underline-offset-2 hover:text-[#94a3b8]">
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
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Definition */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">Confidence is not accuracy</p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
            Accuracy asks how often the model is right. Calibration asks whether the model
            knows how often it is right. A weather model that says &quot;70 percent chance of
            rain&quot; is calibrated if it rains on about 70 percent of the days it says that,
            regardless of how sharp its forecasts are. The probabilities here come from a{" "}
            <Link
              href="/visual-guides/logistic-regression"
              className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              sigmoid over logits
            </Link>
            , and the distortion you will create bends that sigmoid without touching the
            underlying ranking.
          </p>
          <p className="text-[11px] text-[#475569] leading-relaxed">
            How this playground stays honest: {SAMPLE_COUNT.toLocaleString()} (logit, label)
            pairs are generated once with a seeded generator (seed {SEED}), and each label is
            drawn from the known true probability sigmoid(logit). The model&apos;s reported
            score is sigmoid(logit / trueT). Because the label process is known, every chart
            and every number below is computed live from these {SAMPLE_COUNT.toLocaleString()}{" "}
            predictions. Nothing is faked.
          </p>
        </motion.section>

        {/* Lab */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
          {/* Charts */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={GUIDE_VIEWPORT}
              className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-semibold text-white">Reliability Diagram</p>
                <span className="text-[11px] text-[#475569]">
                  {shownLabel} scores · 10 bins · n = {shownRel.n.toLocaleString()}
                </span>
              </div>
              <ReliabilityDiagram
                bins={shownRel.bins}
                ece={shownRel.ece}
                n={shownRel.n}
                viewLabel={shownLabel}
              />
            </motion.div>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={GUIDE_VIEWPORT}
              className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-semibold text-white">Confidence Histogram</p>
                <span className="text-[11px] text-[#475569]">{shownLabel} scores</span>
              </div>
              <ConfidenceHistogram bins={shownRel.bins} n={shownRel.n} viewLabel={shownLabel} />
            </motion.div>
          </div>

          {/* Controls + readouts */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={GUIDE_VIEWPORT}
              className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-4">
                Your Mission
              </p>
              <ol className="list-decimal list-inside text-[11px] text-[#94a3b8] leading-relaxed mb-5 space-y-1">
                <li>
                  Drag trueT away from 1.00 until raw ECE reaches at least{" "}
                  {MISCALIBRATED_ECE.toFixed(3)}
                </li>
                <li>Drag T until the scaled ECE drops to {targetEce.toFixed(3)} or below</li>
                <li>Open the &quot;when calibration matters&quot; panel below</li>
              </ol>
              <CalibrationControls
                trueT={trueT}
                userT={userT}
                onTrueTChange={handleTrueTChange}
                onUserTChange={handleUserTChange}
                view={view}
                onViewChange={setView}
              />
            </motion.div>

            {/* ECE stat cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
                <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                  Raw model ECE
                </p>
                <p
                  className="text-2xl font-black font-mono"
                  style={{
                    color: isMiscalibrated ? "var(--color-warning)" : "#f1f5f9",
                  }}
                >
                  {rawRel.ece.toFixed(3)}
                </p>
                <p className="text-[10px] text-[#475569] mt-1">
                  {isMiscalibrated
                    ? "clearly miscalibrated"
                    : `goal: reach ${MISCALIBRATED_ECE.toFixed(3)}`}
                </p>
              </div>
              <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
                <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                  ECE after your T
                </p>
                <p
                  className="text-2xl font-black font-mono"
                  style={{
                    color: calRel.ece <= targetEce ? "var(--color-success)" : "#f1f5f9",
                  }}
                >
                  {calRel.ece.toFixed(3)}
                </p>
                <p className="text-[10px] text-[#475569] mt-1">
                  target: {targetEce.toFixed(3)} or below
                </p>
              </div>
              <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
                <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                  Noise floor
                </p>
                <p className="text-2xl font-black font-mono text-[#94a3b8]">
                  {floorEce.toFixed(3)}
                </p>
                <p className="text-[10px] text-[#475569] mt-1">
                  ECE of perfectly calibrated scores on this finite sample; target = floor +{" "}
                  {TARGET_ECE_MARGIN.toFixed(3)}
                </p>
              </div>
              <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
                <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                  Best T found
                </p>
                <p className="text-2xl font-black font-mono text-[var(--color-accent)]">
                  {bestFound ? bestFound.t.toFixed(2) : "?"}
                </p>
                <p className="text-[10px] text-[#475569] mt-1">
                  {bestFound
                    ? `lowest ECE so far: ${bestFound.ece.toFixed(3)}`
                    : "move T while the model is miscalibrated"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Temperature scaling explainer */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Why the best T recovers the known distortion
          </p>
          <pre className="bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[11px] leading-relaxed rounded-xl p-4 overflow-x-auto mb-3">
{`labels follow     P(y = 1 | z) = sigmoid(z)
model reports     p = sigmoid(z / trueT)          <- the distortion you dialed in
your fix          q = sigmoid((z / trueT) / T)    <- temperature scaling
exact inversion   trueT * T = 1  =>  q = sigmoid(z)  (perfectly calibrated)`}
          </pre>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
            Temperature scaling exactly inverts this family of miscalibration. Dividing the
            logits by trueT and then by T composes into a single scale factor trueT times T.
            When that product hits 1, the distortion cancels and the reported probability
            equals the true label rate. That is why the ECE-minimizing T sits at 1 / trueT (up
            to the sampling noise of {SAMPLE_COUNT.toLocaleString()} labels), so 1 / T
            recovers the distortion you dialed in.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-[#1e293b] p-3">
              <p className="text-[10px] text-[#475569] mb-1">Your T × trueT</p>
              <p
                className="text-[15px] font-mono font-bold"
                style={{
                  color:
                    Math.abs(tTimesTrueT - 1) <= 0.1 ? "var(--color-success)" : "#f1f5f9",
                }}
              >
                {tTimesTrueT.toFixed(2)}
              </p>
              <p className="text-[10px] text-[#475569] mt-0.5">target: 1.00</p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-3">
              <p className="text-[10px] text-[#475569] mb-1">trueT (the knob)</p>
              <p className="text-[15px] font-mono font-bold text-[var(--color-warning)]">
                {trueT.toFixed(2)}
              </p>
              <p className="text-[10px] text-[#475569] mt-0.5">known distortion</p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-3">
              <p className="text-[10px] text-[#475569] mb-1">1 / (best T)</p>
              <p className="text-[15px] font-mono font-bold text-[var(--color-accent)]">
                {bestFound ? (1 / bestFound.t).toFixed(2) : "?"}
              </p>
              <p className="text-[10px] text-[#475569] mt-0.5">recovered distortion</p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-3">
              <p className="text-[10px] text-[#475569] mb-1">Recovery check</p>
              {bestFound ? (
                <p
                  className="text-[13px] font-bold flex items-center gap-1"
                  style={{
                    color: bestMatches ? "var(--color-success)" : "#94a3b8",
                  }}
                >
                  {bestMatches ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Match
                    </>
                  ) : (
                    "keep tuning"
                  )}
                </p>
              ) : (
                <p className="text-[13px] font-bold text-[#475569]">?</p>
              )}
              <p className="text-[10px] text-[#475569] mt-0.5">
                1 / (best T) vs trueT, within 10 percent
              </p>
            </div>
          </div>
        </motion.section>

        {/* Prose panels */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-3">Going Deeper</p>
          <ProsePanels
            aucRaw={aucRaw}
            aucCalibrated={aucCal}
            onWhenItMattersOpened={handleWhenItMattersOpened}
            whenItMattersRead={whenItMattersRead}
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
                  Calibration Repaired!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You broke a model&apos;s confidence, measured the damage with a reliability
                  diagram, and undid it with a single temperature parameter.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Worst ECE you created</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {miscalSnapshot !== null ? miscalSnapshot.toFixed(3) : "?"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Best fixed ECE</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {fixedSnapshot !== null ? fixedSnapshot.ece.toFixed(3) : "?"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">T that fixed it</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {fixedSnapshot !== null ? fixedSnapshot.t.toFixed(2) : "?"}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;A probability is a promise. Calibration checks whether your model
                    keeps it, and temperature scaling is the one-parameter apology that
                    fixes the confidence without touching the ranking.&quot;
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
