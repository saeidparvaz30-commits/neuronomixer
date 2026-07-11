"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  Activation,
  RaceState,
  RunnerResult,
  Scheme,
  SCHEME_META,
  analyzeSignal,
  initRace,
  raceChunk,
  raceFinished,
  raceResults,
  raceWinner,
  CHUNK_STEPS,
  RACE_STEPS,
  DEPTH,
  WIDTH,
  INPUT_DIM,
  DATA_N,
  fmtStat,
} from "./initMath";
import SignalFlowLab from "./SignalFlowLab";
import RacePanel, { CurveSnapshot, RacePhase } from "./RacePanel";

const GUIDE_TITLE = "Weight Initialization";
const GUIDE_SLUG = "weight-initialization";
const NEXT_GUIDE_SLUG = "learning-rate-schedules";

const DEFAULT_SCHEME: Scheme = "tiny";
const DEFAULT_ACTIVATION: Activation = "tanh";
const SCHEMES_REQUIRED = 3;

export default function WeightInitializationClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // ── Signal-flow lab state ──────────────────────────────────────────────────
  const [scheme, setScheme] = useState<Scheme>(DEFAULT_SCHEME);
  const [activation, setActivation] = useState<Activation>(DEFAULT_ACTIVATION);
  const [exploredSchemes, setExploredSchemes] = useState<Set<Scheme>>(
    () => new Set([DEFAULT_SCHEME])
  );
  const [activationTouched, setActivationTouched] = useState(false);

  // ── Race state ─────────────────────────────────────────────────────────────
  const [racePhase, setRacePhase] = useState<RacePhase>("idle");
  const [raceProgress, setRaceProgress] = useState(0);
  const [curves, setCurves] = useState<CurveSnapshot[] | null>(null);
  const [results, setResults] = useState<RunnerResult[] | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [raceCompleted, setRaceCompleted] = useState(false);
  const raceRef = useRef<RaceState | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  // Deterministic real forward + backward pass; identical on server and client.
  const analysis = useMemo(
    () => analyzeSignal(scheme, activation),
    [scheme, activation]
  );

  // ── Gates ──────────────────────────────────────────────────────────────────
  const gateSchemes = exploredSchemes.size >= SCHEMES_REQUIRED;
  const gateActivation = activationTouched;
  const gateRace = raceCompleted;
  const isComplete = gateSchemes && gateActivation && gateRace;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const clearRaceDisplay = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    raceRef.current = null;
    setRacePhase("idle");
    setRaceProgress(0);
    setCurves(null);
    setResults(null);
    setDurationMs(null);
  }, []);

  const handleSchemeChange = useCallback(
    (s: Scheme) => {
      if (s === scheme) return; // re-clicking the selected scheme earns nothing
      setScheme(s);
      setExploredSchemes((old) => {
        const next = new Set(old);
        next.add(s);
        return next;
      });
    },
    [scheme]
  );

  const handleActivationChange = useCallback(
    (a: Activation) => {
      if (a === activation) return; // same-value change earns nothing
      setActivation(a);
      setActivationTouched(true);
      // The race compares nets under one activation; a new activation
      // invalidates the displayed run (the earned gate stays earned).
      clearRaceDisplay();
    },
    [activation, clearRaceDisplay]
  );

  const snapshotCurves = useCallback((state: RaceState): CurveSnapshot[] => {
    return state.runners.map((r) => ({
      scheme: r.scheme,
      losses: [...r.losses],
      diverged: r.diverged,
      divergedAtStep: r.divergedAtStep,
    }));
  }, []);

  const handleRun = useCallback(() => {
    if (racePhase === "running") return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    const state = initRace(activation);
    raceRef.current = state;
    setResults(null);
    setDurationMs(null);
    setRaceProgress(0);
    setCurves(snapshotCurves(state));
    setRacePhase("running");
    startedAtRef.current = performance.now();

    const tick = () => {
      const st = raceRef.current;
      if (!st) return;
      raceChunk(st, CHUNK_STEPS);
      setRaceProgress(st.step / RACE_STEPS);
      setCurves(snapshotCurves(st));
      if (raceFinished(st)) {
        setResults(raceResults(st));
        setDurationMs(performance.now() - startedAtRef.current);
        setRacePhase("done");
        setRaceCompleted(true); // gate earns on run completion only
      } else {
        timerRef.current = window.setTimeout(tick, 0);
      }
    };
    timerRef.current = window.setTimeout(tick, 0);
  }, [activation, racePhase, snapshotCurves]);

  const handleReset = useCallback(() => {
    clearRaceDisplay();
    setScheme(DEFAULT_SCHEME);
    setActivation(DEFAULT_ACTIVATION);
    setExploredSchemes(new Set([DEFAULT_SCHEME]));
    setActivationTouched(false);
    setRaceCompleted(false);
  }, [clearRaceDisplay]);

  const progressItems = [
    {
      id: "schemes",
      label: `Compare ${SCHEMES_REQUIRED} init schemes (${Math.min(
        exploredSchemes.size,
        SCHEMES_REQUIRED
      )}/${SCHEMES_REQUIRED})`,
      done: gateSchemes,
    },
    { id: "activation", label: "Switch the activation", done: gateActivation },
    { id: "race", label: "Run the convergence race", done: gateRace },
  ];

  const winner = results ? raceWinner(results) : null;
  const winnerResult = winner
    ? results?.find((r) => r.scheme === winner) ?? null
    : null;

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
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3"
          >
            Weight <span className="text-[var(--color-accent)]">Initialization</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Where weights start determines whether signal and gradients survive depth.
            Initialize a real {DEPTH}-layer network five different ways, watch its
            activations and gradients collapse or explode layer by layer, then race all
            five schemes in a live training run.
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Concept intro */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The first answer to the vanishing gradient problem
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3 max-w-[720px]">
            The{" "}
            <Link
              href="/visual-guides/vanishing-exploding-gradients"
              className="underline underline-offset-2 text-[#94a3b8] hover:text-white"
            >
              vanishing and exploding gradients
            </Link>{" "}
            guide shows the disease: stack enough layers and the learning signal either
            fades to nothing or blows up on its way back. This guide is the first cure,
            and historically it came first too: pick the starting scale of the weights so
            that each layer preserves the variance of what flows through it. The second
            cure, changing the architecture so gradients get a shortcut around the layers,
            is covered in{" "}
            <Link
              href="/visual-guides/residual-connections"
              className="underline underline-offset-2 text-[#94a3b8] hover:text-white"
            >
              residual connections
            </Link>
            .
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed max-w-[720px]">
            The network below is real: {DEPTH} hidden layers of {WIDTH} units plus a
            linear readout, classifying {DATA_N} two-dimensional points arranged in two
            rings. Every histogram and every loss curve on this page comes from actual
            forward passes, backward passes, and gradient updates running in your browser.
          </p>
        </motion.section>

        {/* Step 1: signal flow lab */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Step 1: watch signal and gradient flow at initialization
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Pick an init scheme and an activation. The network ({INPUT_DIM} input features,{" "}
            {DEPTH} hidden layers of {WIDTH} units) runs one real forward pass on the full
            batch, then one real backward pass, and histograms every activation and every
            gradient per layer. Compare tiny random against Xavier, then switch the
            activation to ReLU and see why He initialization exists.
          </p>
          <SignalFlowLab
            scheme={scheme}
            activation={activation}
            analysis={analysis}
            onSchemeChange={handleSchemeChange}
            onActivationChange={handleActivationChange}
          />
        </motion.section>

        {/* Step 2: race */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Step 2: race the five schemes on real training
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Statistics at initialization are a prediction; training is the verdict. This
            races five identical networks under the currently selected activation (
            {activation === "tanh" ? "tanh" : "ReLU"}), differing only in their starting
            weights. Try it under both activations: the ranking changes, and that change
            is the whole point.
          </p>
          <RacePanel
            activation={activation}
            phase={racePhase}
            progress={raceProgress}
            curves={curves}
            results={results}
            durationMs={durationMs}
            onRun={handleRun}
          />
        </motion.section>

        {/* Concept cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            {
              title: "Symmetry breaking",
              body: "With all-zero (or all-equal) weights, every unit in a layer computes the same output and receives the same gradient, so they can never differentiate. Random initialization is not optional noise; it is what makes units distinct.",
              color: "#3bb4a4",
            },
            {
              title: "Variance bookkeeping",
              body: "Xavier (Glorot & Bengio 2010) sets Var(W) = 2/(fan_in + fan_out) to keep both activations and gradients at a stable scale under tanh-like units. He et al. 2015 doubled the fan-in term to 2/fan_in because ReLU zeroes half its inputs, halving the variance at every layer.",
              color: "var(--color-accent)",
            },
            {
              title: "When init is not enough",
              body: "Good initialization only controls the starting point. At extreme depth, training needs structural help too: residual connections give gradients a shortcut path, and batch normalization re-standardizes activations at every layer, every step.",
              color: "#a855f7",
            },
          ].map(({ title, body, color }) => (
            <div key={title} className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold mb-2" style={{ color }}>
                {title}
              </p>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

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
                  Started Right
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You watched initialization decide whether signal survives {DEPTH} layers,
                  and proved it with a live training race.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Schemes compared</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {exploredSchemes.size} of 5
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Your race winner ({activation === "tanh" ? "tanh" : "ReLU"})
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {winner && winnerResult
                        ? `${SCHEME_META[winner].label}, loss ${fmtStat(winnerResult.finalLoss)}`
                        : "run again to see"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Trained in your browser</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {durationMs !== null
                        ? `5 nets x ${RACE_STEPS} steps, ${Math.round(durationMs)} ms`
                        : `5 nets x ${RACE_STEPS} steps`}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Initialization is variance bookkeeping. Set the weight scale so
                    each layer neither shrinks nor amplifies what passes through, and
                    gradients arrive at layer 1 about the size they left layer 6. Xavier
                    balances the books for tanh; He rebalances them for ReLU.&quot;
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
