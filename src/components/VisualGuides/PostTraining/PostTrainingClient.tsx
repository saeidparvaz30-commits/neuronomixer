"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  VOCAB,
  BASE_COUNTS,
  DEMO_COUNTS,
  REWARDS,
  PROMPT_CONTEXTS,
  ContextId,
  StageId,
  SERIES_COLORS,
  LAMBDA_MIN,
  LAMBDA_MAX,
  LAMBDA_STEP,
  LAMBDA_DEFAULT,
  BETA_MIN,
  BETA_MAX,
  BETA_STEP,
  BETA_DEFAULT,
  SAMPLE_COUNT,
  INITIAL_SEED,
  nextTokenDist,
  sftBlend,
  preferenceOptimum,
  entropyBits,
  effectiveVocab,
  klBits,
  argmax,
  buildChartRows,
  drawSamples,
} from "./postTrainingMath";
import CorpusPanel from "./CorpusPanel";
import DistributionChart from "./DistributionChart";
import SamplingLab from "./SamplingLab";

const GUIDE_TITLE = "From Base Model to Assistant";
const NEXT_GUIDE_SLUG = "prompt-engineering";

export default function PostTrainingClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // ── Interaction state (mount defaults; Try Again restores exactly these) ──
  const [contextId, setContextId] = useState<ContextId>("is");
  const [lambda, setLambda] = useState(LAMBDA_DEFAULT);
  const [beta, setBeta] = useState(BETA_DEFAULT);
  const [sftAdjusted, setSftAdjusted] = useState(false);
  const [klAdjusted, setKlAdjusted] = useState(false);
  const [sampleStage, setSampleStage] = useState<StageId>("base");
  const [samples, setSamples] = useState<string[]>([]);
  const [sampledFrom, setSampledFrom] = useState<StageId | null>(null);
  const [sampledStages, setSampledStages] = useState<Set<StageId>>(new Set());
  const [seed, setSeed] = useState(INITIAL_SEED);

  const isComplete = sftAdjusted && klAdjusted && sampledStages.size >= 2;

  // ── All displayed numbers derive from these computed distributions ────────
  const promptContext = PROMPT_CONTEXTS.find((c) => c.id === contextId) ?? PROMPT_CONTEXTS[0];

  const pBase = useMemo(
    () => nextTokenDist(BASE_COUNTS, promptContext.context, VOCAB),
    [promptContext.context]
  );
  const pDemo = useMemo(
    () => nextTokenDist(DEMO_COUNTS, promptContext.context, VOCAB),
    [promptContext.context]
  );
  const pSft = useMemo(() => sftBlend(pBase, pDemo, lambda), [pBase, pDemo, lambda]);
  const pRl = useMemo(() => preferenceOptimum(pSft, REWARDS, beta), [pSft, beta]);

  const chartRows = useMemo(
    () => buildChartRows(VOCAB, pBase, pSft, pRl),
    [pBase, pSft, pRl]
  );

  const stats = useMemo(() => {
    const stage = (p: readonly number[]) => ({
      entropy: entropyBits(p),
      effVocab: effectiveVocab(p),
      top: VOCAB[argmax(p)],
      topP: p[argmax(p)],
    });
    return {
      base: { ...stage(pBase), kl: 0 },
      sft: { ...stage(pSft), kl: klBits(pSft, pBase) },
      rl: { ...stage(pRl), kl: klBits(pRl, pSft) },
    };
  }, [pBase, pSft, pRl]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleLambda = useCallback(
    (v: number) => {
      if (v !== lambda) setSftAdjusted(true);
      setLambda(v);
    },
    [lambda]
  );

  const handleBeta = useCallback(
    (v: number) => {
      if (v !== beta) setKlAdjusted(true);
      setBeta(v);
    },
    [beta]
  );

  const handleDraw = useCallback(() => {
    const dist = sampleStage === "base" ? pBase : sampleStage === "sft" ? pSft : pRl;
    const result = drawSamples(dist, VOCAB, SAMPLE_COUNT, seed);
    setSamples(result.words);
    setSeed(result.seed);
    setSampledFrom(sampleStage);
    setSampledStages((prev) => new Set([...prev, sampleStage]));
  }, [sampleStage, pBase, pSft, pRl, seed]);

  function handleReset() {
    setContextId("is");
    setLambda(LAMBDA_DEFAULT);
    setBeta(BETA_DEFAULT);
    setSftAdjusted(false);
    setKlAdjusted(false);
    setSampleStage("base");
    setSamples([]);
    setSampledFrom(null);
    setSampledStages(new Set());
    setSeed(INITIAL_SEED);
  }

  const progressItems = [
    { id: "sft", label: "Move the SFT blend slider", done: sftAdjusted },
    { id: "kl", label: "Move the KL penalty slider", done: klAdjusted },
    {
      id: "samples",
      label: `Sample from two stages (${Math.min(sampledStages.size, 2)}/2)`,
      done: sampledStages.size >= 2,
    },
  ];

  const betaDescriptor =
    beta < 0.5
      ? "loose tether: reward dominates"
      : beta < 1.5
        ? "moderate tether"
        : "tight tether: stays near the SFT model";

  const statTiles = [
    {
      id: "base" as StageId,
      title: "Base model",
      color: SERIES_COLORS.base,
      data: stats.base,
      klLabel: null as string | null,
    },
    {
      id: "sft" as StageId,
      title: "After SFT blend",
      color: SERIES_COLORS.sft,
      data: stats.sft,
      klLabel: "KL from base",
    },
    {
      id: "assistant" as StageId,
      title: "After preference stage",
      color: SERIES_COLORS.assistant,
      data: stats.rl,
      klLabel: "KL from SFT",
    },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="post-training" score={100} />
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
            From Base Model{" "}
            <span className="text-[var(--color-accent)]">to Assistant</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            A pretrained model only continues text. Here you train two real
            bigram models in your browser, blend demonstrations into the base
            distribution, add preference pressure with a KL tether, and watch
            token probabilities shift and diversity collapse as the tether
            loosens. Every number is computed live.
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

        {/* The data */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            All the training data, on one screen
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            A base model is a mirror of its corpus: it learns what word tends to
            follow what word, and nothing about being useful. Below is the entire
            training signal for this guide: a raw web-style corpus, a set of
            assistant demonstrations, and six preference judgments. The two
            bigram models are trained on these lines in your browser, so every
            probability in the sandbox traces back to text you can read.
          </p>
          <CorpusPanel />
        </motion.section>

        {/* The math */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The shaping pipeline, exactly as the sandbox runs it
          </p>
          <pre className="bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[11px] leading-relaxed rounded-xl p-4 overflow-x-auto mb-4">
{`SFT blend      p_sft(w|c)  =  (1 - lambda) * p_base(w|c)  +  lambda * p_demo(w|c)

preference     p_rl(w|c)   proportional to  p_sft(w|c) * exp( r(w) / beta )
               the exact optimum of   max_p  E_p[r]  -  beta * KL(p || p_sft)

reward         r(w) = wins(w) - losses(w)    counted from the preference pairs`}
          </pre>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Continuation, not conversation
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                The base model assigns probability to whatever tends to come
                next in its corpus. Ask it for an answer and it gives you the
                statistics of forum posts: wrong, whatever, spam. Nothing is
                broken. It is doing exactly what pretraining trained it to do.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                SFT moves the mass
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Instruction tuning trains on demonstrations, pulling probability
                toward assistant-style continuations. Real SFT is gradient
                descent on demonstration tokens; the lambda slider here is a
                transparent stand-in, a mixture of the two trained models, with
                the same qualitative effect: mass moves to the demonstrations.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                The KL tether
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Preference optimization maximizes reward minus beta times the KL
                divergence from the SFT model. The formula above is that
                objective&apos;s exact solution: beta is the tether. Tight, and
                the model barely moves. Loose, and reward swallows the
                distribution whole.
              </p>
            </div>
          </div>
        </motion.section>

        {/* The sandbox */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The distribution-shaping sandbox
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Pick a prompt context, then shape the next-word distribution with
            the two sliders. The gray bars are the trained base model, the teal
            bars the SFT blend, the gold bars the preference-tuned assistant.
            All three are recomputed from the corpora and the pairs on every
            change.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
            {/* Context picker */}
            <div>
              <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide mb-2">
                Prompt context
              </p>
              <div role="radiogroup" aria-label="Prompt context" className="flex flex-col gap-2">
                {PROMPT_CONTEXTS.map((c) => {
                  const active = contextId === c.id;
                  return (
                    <button
                      key={c.id}
                      role="radio"
                      aria-checked={active}
                      onClick={() => setContextId(c.id)}
                      className={`px-3.5 py-2 rounded-xl text-[12px] font-mono text-left border transition-colors ${
                        active
                          ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[#d4af37]/5"
                          : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155] hover:text-white"
                      }`}
                    >
                      {c.display}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SFT slider */}
            <div>
              <label
                htmlFor="sft-lambda"
                className="block text-[11px] font-semibold text-[#475569] uppercase tracking-wide mb-2"
              >
                SFT blend strength{" "}
                <span className="text-[#3bb4a4] font-mono normal-case">
                  lambda = {lambda.toFixed(2)}
                </span>
              </label>
              <input
                id="sft-lambda"
                type="range"
                min={LAMBDA_MIN}
                max={LAMBDA_MAX}
                step={LAMBDA_STEP}
                value={lambda}
                onChange={(e) => handleLambda(parseFloat(e.target.value))}
                className="w-full accent-[#3bb4a4]"
              />
              <div className="flex justify-between text-[10px] text-[#475569] mt-1">
                <span>0: pure base model</span>
                <span>1: pure demonstrations</span>
              </div>
              <p className="text-[11px] text-[#94a3b8] mt-2 leading-relaxed">
                How far instruction tuning pulls the distribution toward the
                demonstration data.
              </p>
            </div>

            {/* Beta slider */}
            <div>
              <label
                htmlFor="kl-beta"
                className="block text-[11px] font-semibold text-[#475569] uppercase tracking-wide mb-2"
              >
                KL penalty{" "}
                <span className="text-[var(--color-accent)] font-mono normal-case">
                  beta = {beta.toFixed(2)}
                </span>
              </label>
              <input
                id="kl-beta"
                type="range"
                min={BETA_MIN}
                max={BETA_MAX}
                step={BETA_STEP}
                value={beta}
                onChange={(e) => handleBeta(parseFloat(e.target.value))}
                className="w-full accent-[#d4af37]"
              />
              <div className="flex justify-between text-[10px] text-[#475569] mt-1">
                <span>{BETA_MIN}: loose</span>
                <span>{BETA_MAX}: tight</span>
              </div>
              <p className="text-[11px] text-[#94a3b8] mt-2 leading-relaxed">
                Currently: {betaDescriptor}. Slide left and watch the gold bars
                pile onto the highest-reward words.
              </p>
            </div>
          </div>

          <DistributionChart rows={chartRows} contextDisplay={`"${promptContext.display}"`} />

          {/* Stat tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            {statTiles.map((tile) => (
              <div key={tile.id} className="rounded-xl border border-[#1e293b] p-4">
                <p
                  className="text-[11px] font-semibold uppercase tracking-wide mb-2"
                  style={{ color: tile.color }}
                >
                  {tile.title}
                </p>
                <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                  Entropy{" "}
                  <span className="font-mono font-bold" style={{ color: tile.color }}>
                    {tile.data.entropy.toFixed(2)} bits
                  </span>
                  , spread over{" "}
                  <span className="font-mono font-bold" style={{ color: tile.color }}>
                    {tile.data.effVocab.toFixed(1)}
                  </span>{" "}
                  effective words. Top:{" "}
                  <span className="font-mono font-bold text-[#f1f5f9]">
                    {tile.data.top}
                  </span>{" "}
                  at{" "}
                  <span className="font-mono font-bold text-[#f1f5f9]">
                    {(tile.data.topP * 100).toFixed(1)}%
                  </span>
                  {tile.klLabel && (
                    <>
                      . {tile.klLabel}:{" "}
                      <span className="font-mono font-bold" style={{ color: tile.color }}>
                        {tile.data.kl.toFixed(2)} bits
                      </span>
                    </>
                  )}
                  .
                </p>
              </div>
            ))}
          </div>

          {/* Over-optimization callout */}
          <div className="mt-5 rounded-xl border-l-4 border-[var(--color-warning)] bg-[#1e293b]/40 border border-[#334155] p-4">
            <p className="text-[12px] font-semibold text-[var(--color-warning)] mb-1.5 uppercase tracking-wide">
              Try to break it
            </p>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              Switch the context to &quot;... and the ___&quot; and drop beta to{" "}
              {BETA_MIN}. The gold bars flood onto reward-bearing words like
              &quot;helpful&quot; even though they never follow &quot;the&quot;
              in either corpus. That is over-optimization: reward pressure
              overwhelming the language prior until the output stops being
              language. The KL penalty exists to prevent exactly this.
            </p>
          </div>
        </motion.section>

        {/* Sampling */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Feel the diversity collapse
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Entropy numbers are abstract; samples are not. Draw from the base
            model, then draw from the assistant at your current slider settings,
            and compare how many distinct words come back. Sampling from at
            least two different stages completes the third goal above.
          </p>
          <SamplingLab
            stage={sampleStage}
            onStageChange={setSampleStage}
            samples={samples}
            sampledFrom={sampledFrom}
            sampledStages={sampledStages}
            onDraw={handleDraw}
            contextDisplay={`"${promptContext.display}"`}
          />
        </motion.section>

        {/* Scope note */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[11px] font-semibold text-[var(--color-warning)] mb-1.5 uppercase tracking-wide">
            Scope note
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed max-w-[720px]">
            This guide covers the conceptual internals only: how post-training
            reshapes a base model&apos;s output distribution. The practice of
            running these methods on real models lives in the Applied AI
            category:{" "}
            <Link
              href="/visual-guides/rlhf"
              className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              RLHF
            </Link>{" "}
            walks the full reward-model pipeline,{" "}
            <Link
              href="/visual-guides/dpo-preference-tuning"
              className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              DPO
            </Link>{" "}
            trains a policy with the actual preference loss, and{" "}
            <Link
              href="/visual-guides/lora-adapters"
              className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              LoRA
            </Link>{" "}
            covers how fine-tuning is made cheap in practice.
          </p>
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
                  Distribution Reshaped
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You turned a corpus mirror into an assistant and read the cost
                  off your own entropy numbers.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Base entropy, context &quot;{promptContext.context}&quot;
                    </p>
                    <p className="text-[14px] font-mono font-bold" style={{ color: SERIES_COLORS.base }}>
                      {stats.base.entropy.toFixed(2)} bits, {stats.base.effVocab.toFixed(1)} eff. words
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Assistant entropy at lambda {lambda.toFixed(2)}, beta {beta.toFixed(2)}
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {stats.rl.entropy.toFixed(2)} bits, {stats.rl.effVocab.toFixed(1)} eff. words
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Assistant top word right now
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {stats.rl.top} at {(stats.rl.topP * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Post-training does not add knowledge, it reshapes the
                    output distribution: demonstrations pull probability toward
                    assistant style, preference pressure sharpens it, and the KL
                    tether decides how much of the original model survives. Cut
                    the tether and you do not get a better assistant, you get a
                    reward maximizer that has stopped speaking the language.&quot;
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
