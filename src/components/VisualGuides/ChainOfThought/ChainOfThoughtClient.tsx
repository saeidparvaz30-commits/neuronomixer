"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import type { EvalResults, ExperimentState } from "./cotMath";
import { evaluate, initExperiment, isTrained, trainChunk } from "./cotMath";
import CompoundingExplorer from "./CompoundingExplorer";
import ExperimentLab, { ExperimentPhase } from "./ExperimentLab";
import TracePanel from "./TracePanel";

const GUIDE_TITLE = "Why Thinking Out Loud Works";
const GUIDE_SLUG = "chain-of-thought";
const NEXT_GUIDE_SLUG = "multimodal-llms";

const DEFAULT_P_EASY = 0.99;
const DEFAULT_P_HARD = 0.85;
const DEFAULT_HORIZON = 12;
const CHUNK = 6000;

export default function ChainOfThoughtClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // Compounding explorer state
  const [pEasy, setPEasy] = useState(DEFAULT_P_EASY);
  const [pHard, setPHard] = useState(DEFAULT_P_HARD);
  const [horizon, setHorizon] = useState(DEFAULT_HORIZON);
  const [modelTouched, setModelTouched] = useState(false);

  // Experiment state
  const [phase, setPhase] = useState<ExperimentPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [liveLoss, setLiveLoss] = useState<{ step: number; direct: number } | null>(null);
  const [results, setResults] = useState<EvalResults | null>(null);
  const expRef = useRef<ExperimentState | null>(null);
  const timerRef = useRef<number | null>(null);

  // Trace panel gate
  const [traceRevealed, setTraceRevealed] = useState(false);

  const isComplete = modelTouched && results !== null && traceRevealed;

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handlePEasy = useCallback((v: number) => {
    setPEasy(v);
    setModelTouched(true);
  }, []);
  const handlePHard = useCallback((v: number) => {
    setPHard(v);
    setModelTouched(true);
  }, []);
  const handleHorizon = useCallback((v: number) => {
    setHorizon(v);
    setModelTouched(true);
  }, []);

  const handleRun = useCallback(() => {
    if (phase === "training") return;
    setResults(null);
    setPhase("training");
    setProgress(0);
    setLiveLoss(null);
    expRef.current = initExperiment();

    const tick = () => {
      const st = expRef.current;
      if (!st) return;
      trainChunk(st, CHUNK);
      setProgress(st.done / st.total);
      setLiveLoss({ step: st.stepLoss, direct: st.directLoss });
      if (isTrained(st)) {
        setResults(evaluate(st));
        setPhase("done");
      } else {
        timerRef.current = window.setTimeout(tick, 0);
      }
    };
    timerRef.current = window.setTimeout(tick, 0);
  }, [phase]);

  const handleReset = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    expRef.current = null;
    setPEasy(DEFAULT_P_EASY);
    setPHard(DEFAULT_P_HARD);
    setHorizon(DEFAULT_HORIZON);
    setModelTouched(false);
    setPhase("idle");
    setProgress(0);
    setLiveLoss(null);
    setResults(null);
    setTraceRevealed(false);
  }, []);

  const progressItems = [
    { id: "model", label: "Steer the error model", done: modelTouched },
    { id: "experiment", label: "Train both models", done: results !== null },
    { id: "trace", label: "Inspect a worked trace", done: traceRevealed },
  ];

  const lastLen = results?.perLength[results.perLength.length - 1];

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
            Why Thinking Out Loud{" "}
            <span className="text-[var(--color-accent)]">Works</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            A chain of thought trades tokens for accuracy: instead of forcing
            one hard prediction, the model writes intermediate steps so that
            every prediction it makes is easy. Compute exactly why that wins,
            then train two tiny networks in your browser and watch it happen
            for real.
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

        {/* Concept cards */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
        >
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
            <p className="text-[11px] font-semibold text-[#ef4444] uppercase tracking-wide mb-2">
              One hard prediction
            </p>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              Asked for 3642 + 4858 in one shot, a model must resolve every
              digit and every carry inside a single forward pass. The leading
              digit of the answer already depends on the entire carry chain,
              so the difficulty of that one prediction grows with the problem.
            </p>
          </div>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
            <p className="text-[11px] font-semibold text-[#3bb4a4] uppercase tracking-wide mb-2">
              Many easy predictions
            </p>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              Writing the steps out moves the intermediate state into the
              context window. Each next token then needs only one tiny local
              computation: two digits and a carry. The per-step difficulty
              stays constant no matter how long the problem gets.
            </p>
          </div>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
            <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-2">
              The price
            </p>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              Steps cost tokens, and tokens cost compute and latency. Chain of
              thought is a trade: linearly more output tokens in exchange for a
              per-step success rate near 1. Whether the trade pays off is
              arithmetic, and you can do that arithmetic below.
            </p>
          </div>
        </motion.section>

        {/* Section 1: compounding explorer */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The compounding arithmetic, live
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-5 max-w-[720px]">
            A whole answer is only right if every one of its parts is right, so
            success probabilities multiply. Steer the per-step success rates
            and the problem length; every number and both curves are recomputed
            from p^n and q^n as you drag.
          </p>
          <CompoundingExplorer
            pEasy={pEasy}
            pHard={pHard}
            horizon={horizon}
            onPEasy={handlePEasy}
            onPHard={handlePHard}
            onHorizon={handleHorizon}
          />
        </motion.section>

        {/* Section 2: the experiment */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The experiment: scratchpad against one-shot, trained in your browser
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-5 max-w-[720px]">
            This is the classic scratchpad result in miniature: two networks,
            the same multi-digit addition task, the only difference being
            whether intermediate steps are written down. This is the research
            ideal scaled to what a browser tab can honestly train in about a
            second; the full-scale version fine-tunes a transformer, but the
            mechanism is the same.
          </p>
          <ExperimentLab
            phase={phase}
            progress={progress}
            liveLoss={liveLoss}
            results={results}
            onRun={handleRun}
          />
        </motion.section>

        {/* Section 3: trace panel */}
        {results !== null && expRef.current !== null && (
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
            className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
          >
            <p className="text-[13px] font-semibold text-white mb-2">
              Step decomposition: watch the probabilities compound
            </p>
            <TracePanel
              exp={expRef.current}
              results={results}
              revealed={traceRevealed}
              onReveal={() => setTraceRevealed(true)}
            />
          </motion.section>
        )}

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
                  Thought, Decomposed
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You did the compounding arithmetic, trained both solvers, and
                  read the divergence off your own measurements.
                </p>
              </div>

              <div className="px-6 py-5">
                {lastLen && results && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    <div className="rounded-xl border border-[#1e293b] p-3">
                      <p className="text-[10px] text-[#475569] mb-1">
                        One-shot model at {lastLen.len} digits (measured)
                      </p>
                      <p className="text-[14px] font-mono font-bold text-[#ef4444]">
                        {(100 * lastLen.directAcc).toFixed(1)}% exact match
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#1e293b] p-3">
                      <p className="text-[10px] text-[#475569] mb-1">
                        Scratchpad model at {lastLen.len} digits (measured)
                      </p>
                      <p className="text-[14px] font-mono font-bold text-[#3bb4a4]">
                        {(100 * lastLen.scratchAcc).toFixed(1)}% exact match
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#1e293b] p-3">
                      <p className="text-[10px] text-[#475569] mb-1">
                        Mean per-step probability (measured)
                      </p>
                      <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                        {(100 * results.meanStepProbOverall).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;A chain of thought does not make any single token
                    smarter. It restructures the computation so that no single
                    token has to be hard: many near-certain steps, multiplied
                    together, beat one guess the model was never equipped to
                    make.&quot;
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
