"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  BASELINE_IDS,
  CORPUS,
  Choice,
  JUDGE_MODEL,
  OTHER_MODEL,
} from "./types";
import {
  DEFAULT_SETTINGS,
  JudgeSettings,
  agreementStats,
  baselineMatches,
  flippedItemIds,
  judgeCorpus,
  rubricWeights,
} from "./judge";
import HumanBaseline from "./HumanBaseline";
import JudgeLab from "./JudgeLab";
import BiasLab, { BiasKey } from "./BiasLab";

const GUIDE_TITLE = "LLM-as-Judge: When Models Grade Models";
const NEXT_GUIDE_SLUG = "eval-dataset-design";

export default function LLMJudgeClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // ── Interaction state (mount defaults; Try Again restores exactly these) ──
  const [picks, setPicks] = useState<Readonly<Record<number, Choice>>>({});
  const [settings, setSettings] = useState<JudgeSettings>(DEFAULT_SETTINGS);
  const [strictnessTouched, setStrictnessTouched] = useState(false);
  const [biasDialed, setBiasDialed] = useState(false);
  const [kappaMoved, setKappaMoved] = useState(false);

  // ── Derived data (all computed by the pure judge module) ──────────────────
  const baselineItems = useMemo(
    () =>
      BASELINE_IDS.map((id) => CORPUS.find((c) => c.id === id)).filter(
        (c): c is (typeof CORPUS)[number] => c !== undefined
      ),
    []
  );

  const strictness = settings.strictness;
  const verdicts = useMemo(() => judgeCorpus(CORPUS, settings), [settings]);
  const stats = useMemo(() => agreementStats(verdicts, CORPUS), [verdicts]);
  const unbiasedVerdicts = useMemo(
    () =>
      judgeCorpus(CORPUS, {
        strictness,
        positionBias: 0,
        verbosityBias: 0,
        selfPreference: 0,
      }),
    [strictness]
  );
  const unbiasedStats = useMemo(
    () => agreementStats(unbiasedVerdicts, CORPUS),
    [unbiasedVerdicts]
  );
  const flippedIds = useMemo(
    () => flippedItemIds(verdicts, unbiasedVerdicts),
    [verdicts, unbiasedVerdicts]
  );
  const weights = useMemo(() => rubricWeights(strictness), [strictness]);
  const matches = useMemo(
    () => baselineMatches(picks, baselineItems),
    [picks, baselineItems]
  );

  const biasesActive =
    settings.positionBias > 0 ||
    settings.verbosityBias > 0 ||
    settings.selfPreference > 0;

  // ── Completion gates ───────────────────────────────────────────────────────
  const gateBaseline = baselineItems.every((item) => picks[item.id] !== undefined);
  const gateStrictness = strictnessTouched;
  const gateBias = biasDialed && kappaMoved;
  const isComplete = gateBaseline && gateStrictness && gateBias;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handlePick = useCallback((id: number, choice: Choice) => {
    setPicks((prev) => (prev[id] !== undefined ? prev : { ...prev, [id]: choice }));
  }, []);

  function handleStrictnessChange(value: number) {
    setSettings((prev) => ({ ...prev, strictness: value }));
    setStrictnessTouched(true);
  }

  function handleBiasChange(key: BiasKey, value: number) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    if (value >= 50) setBiasDialed(true);
    const hasBias =
      next.positionBias > 0 || next.verbosityBias > 0 || next.selfPreference > 0;
    if (hasBias && !kappaMoved) {
      const biasedKappa = agreementStats(judgeCorpus(CORPUS, next), CORPUS).kappa;
      const cleanKappa = agreementStats(
        judgeCorpus(CORPUS, {
          ...next,
          positionBias: 0,
          verbosityBias: 0,
          selfPreference: 0,
        }),
        CORPUS
      ).kappa;
      if (Math.abs(biasedKappa - cleanKappa) > 1e-9) setKappaMoved(true);
    }
  }

  function handleReset() {
    setPicks({});
    setSettings(DEFAULT_SETTINGS);
    setStrictnessTouched(false);
    setBiasDialed(false);
    setKappaMoved(false);
  }

  const progressItems = [
    {
      id: "baseline",
      label: `Grade ${BASELINE_IDS.length} answers yourself (${Object.keys(picks).length}/${BASELINE_IDS.length})`,
      done: gateBaseline,
    },
    { id: "strictness", label: "Adjust judge strictness", done: gateStrictness },
    { id: "bias", label: "Dial a bias until kappa moves", done: gateBias },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="llm-as-judge" score={100} />
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
              Applied AI
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3"
          >
            LLM-as-Judge:{" "}
            <span className="text-[var(--color-accent)]">When Models Grade Models</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Grade a few answers yourself, then run a rubric judge over the same corpus and
            measure how well it agrees with a human panel. Then inject position,
            verbosity, and self-preference bias and watch the kappa collapse.
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

        {/* The setup */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-3">
            The setup: a judge you can x-ray
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Why use a model as judge
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Humans grading thousands of model outputs is slow and expensive. So teams
                hand a rubric to a strong model and let it grade instead: score this
                answer, or pick the better of these two. It scales beautifully, which is
                exactly why its failure modes matter.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Why calibrate it first
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                A judge is a measurement instrument, and instruments drift. Before
                trusting one, measure its agreement with human labels on a calibration
                set. Judges carry systematic biases that inflate or deflate scores while
                looking perfectly confident.
              </p>
            </div>
          </div>
          <p className="text-[11px] text-[#475569] leading-relaxed">
            The corpus below has {CORPUS.length} questions, each with two answers of
            genuinely different quality and a gold label from an expert panel. The judge
            is {JUDGE_MODEL}, a deterministic rubric scorer standing in for an LLM judge,
            so every score, agreement rate, and kappa on this page is exactly computed
            from the data you can see. The other model in the corpus is {OTHER_MODEL},
            and it matters that some answers were written by {JUDGE_MODEL} itself: that
            is what the last bias feeds on.
          </p>
        </motion.section>

        {/* Human baseline */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            First, you be the judge
          </p>
          <HumanBaseline
            items={baselineItems}
            picks={picks}
            onPick={handlePick}
            matches={matches}
          />
        </motion.section>

        {/* Rubric judge */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">The rubric judge</p>
          <JudgeLab
            strictness={strictness}
            onStrictnessChange={handleStrictnessChange}
            weights={weights}
            verdicts={verdicts}
            stats={stats}
            flippedIds={flippedIds}
            corpus={CORPUS}
            biasesActive={biasesActive}
          />
        </motion.section>

        {/* Bias lab */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Dial the biases, watch the kappa
          </p>
          <BiasLab
            settings={settings}
            onBiasChange={handleBiasChange}
            stats={stats}
            unbiasedStats={unbiasedStats}
            verdicts={verdicts}
            flippedIds={flippedIds}
            corpus={CORPUS}
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
                  Judge Calibrated!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You set a human baseline, measured a judge against the panel with
                  Cohen&apos;s kappa, and exposed the biases that corrupt scores silently.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">You vs the panel</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {matches} of {BASELINE_IDS.length}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Unbiased judge kappa
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {unbiasedStats.kappa.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      With your biases dialed
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {stats.kappa.toFixed(2)}, {flippedIds.length} flipped
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;An LLM judge is a measurement instrument, not an oracle.
                    Calibrate it against human labels, report kappa rather than raw
                    agreement, and audit it for position, verbosity, and self-preference
                    bias, because a biased judge fails with total confidence.&quot;
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
