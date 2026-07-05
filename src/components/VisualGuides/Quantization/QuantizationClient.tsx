"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import MemoryExplorer from "./MemoryExplorer";
import QuantizerLab from "./QuantizerLab";
import {
  PRECISION_OPTIONS,
  formatGB,
  generateWeightSample,
  quantizeSymmetric,
  weightsMemoryGB,
  type BitWidth,
  type PrecisionId,
  type QuantizationResult,
} from "./types";

const GUIDE_TITLE = "Model Quantization";
const NEXT_GUIDE_SLUG = "lora-adapters";

const proseLink =
  "text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80 transition-opacity";

export default function QuantizationClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // Interactive A state
  const [paramsB, setParamsB] = useState(8);
  const [precision, setPrecision] = useState<PrecisionId>("fp16");
  const [fit70Done, setFit70Done] = useState(false);

  // Interactive B state
  const [bits, setBits] = useState<BitWidth>(8);
  const [exploredBits, setExploredBits] = useState<Set<BitWidth>>(new Set([8]));

  const weights = useMemo(() => generateWeightSample(), []);
  const resultsByBits = useMemo<Record<BitWidth, QuantizationResult>>(
    () => ({
      8: quantizeSymmetric(weights, 8),
      4: quantizeSymmetric(weights, 4),
      3: quantizeSymmetric(weights, 3),
      2: quantizeSymmetric(weights, 2),
    }),
    [weights]
  );

  const activePrecision =
    PRECISION_OPTIONS.find((p) => p.id === precision) ?? PRECISION_OPTIONS[0];
  const memGB = weightsMemoryGB(paramsB, activePrecision.bytesPerParam);

  useEffect(() => {
    if (paramsB >= 70 && memGB <= 24) setFit70Done(true);
  }, [paramsB, memGB]);

  const bitsCompared = exploredBits.size >= 2;
  const isComplete = fit70Done && bitsCompared;

  function handleBitsChange(b: BitWidth) {
    setBits(b);
    setExploredBits((prev) => {
      const next = new Set(prev);
      next.add(b);
      return next;
    });
  }

  function handleReset() {
    setParamsB(8);
    setPrecision("fp16");
    setFit70Done(false);
    setBits(8);
    setExploredBits(new Set([8]));
  }

  const errorRatio2v8 = resultsByBits[2].rmsError / resultsByBits[8].rmsError;

  const progressItems = [
    { id: "fit", label: "Fit a 70B model in 24 GB", done: fit70Done },
    {
      id: "bits",
      label: `Compare bit widths (${Math.min(exploredBits.size, 2)}/2)`,
      done: bitsCompared,
    },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="quantization" score={4} />
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
        <motion.section variants={fadeUp} initial="hidden" animate="visible" className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              LLMs
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Model <span className="text-[var(--color-accent)]">Quantization</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]">
            Big models are big because every parameter costs bytes. Quantization stores those
            parameters in fewer bits. Squeeze a 70B model onto a gaming GPU, then measure exactly
            what the compression does to the weights.
          </p>
        </motion.section>

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
                className="ml-auto text-[11px] font-semibold flex items-center gap-1"
                style={{ color: "var(--color-success)" }}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-8">
          {/* Section 1: memory footprint */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
          >
            <h2 className="text-xl font-extrabold tracking-tight text-white mb-2">
              1. Why models are huge
            </h2>
            <p className="text-[13px] text-[#94a3b8] leading-relaxed max-w-[720px] mb-4">
              An LLM&apos;s memory footprint is dominated by its weights: memory = parameter count
              × bytes per parameter. A 70B model at full 32-bit precision needs{" "}
              {formatGB(weightsMemoryGB(70, 4))} GB before it computes a single token. Store each
              weight in fewer bits and the same model shrinks proportionally. (Parameters are
              learned weights, not vocabulary entries; see{" "}
              <Link href="/visual-guides/tokenization" className={proseLink}>
                Tokenization
              </Link>{" "}
              for what tokens are, or start with{" "}
              <Link href="/visual-guides/what-is-llm" className={proseLink}>
                What is an LLM
              </Link>{" "}
              if this is new territory.)
            </p>
            <MemoryExplorer
              paramsB={paramsB}
              precision={precision}
              challengeDone={fit70Done}
              onParamsChange={setParamsB}
              onPrecisionChange={setPrecision}
            />
          </motion.section>

          {/* Section 2: quantization lab */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
          >
            <h2 className="text-xl font-extrabold tracking-tight text-white mb-2">
              2. What quantization actually does
            </h2>
            <p className="text-[13px] text-[#94a3b8] leading-relaxed max-w-[720px] mb-3">
              Quantization maps continuous weights onto a small grid of integer levels. This lab
              runs real symmetric uniform quantization on a deterministic sample of 2,000
              bell-shaped weights. Every number below is computed from that sample:
            </p>
            <pre className="rounded-xl bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[12px] p-4 mb-4 overflow-x-auto">
              {`scale = max|w| / (2^(b-1) - 1)
q     = clamp(round(w / scale), -(2^(b-1) - 1), +(2^(b-1) - 1))
w_hat = q × scale        (error = w - w_hat)`}
            </pre>
            <QuantizerLab
              weights={weights}
              bits={bits}
              exploredBits={exploredBits}
              resultsByBits={resultsByBits}
              onBitsChange={handleBitsChange}
            />
          </motion.section>

          {/* Section 3: the landscape */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
          >
            <h2 className="text-xl font-extrabold tracking-tight text-white mb-4">
              3. The quantization landscape
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-[#1e293b] p-4">
                <p className="text-[12px] font-semibold text-[#3bb4a4] mb-2">PTQ vs QAT</p>
                <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                  Post-training quantization (PTQ) compresses a model after training, often using a
                  small calibration set, with no gradient updates. Quantization-aware training
                  (QAT) simulates the low-precision grid during training so the weights learn to
                  live on it. PTQ is cheap and is the usual route for LLM deployment; QAT costs
                  training compute but tends to hold up better at very low bit widths.
                </p>
              </div>
              <div className="rounded-xl border border-[#1e293b] p-4">
                <p
                  className="text-[12px] font-semibold mb-2"
                  style={{ color: "var(--color-warning)" }}
                >
                  The outlier problem
                </p>
                <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                  Naive int8 quantization worked for smaller models but struggled as LLMs scaled,
                  because activations (not the weights themselves) develop rare, large-magnitude
                  outlier features. A single shared scale must stretch to cover those outliers,
                  which crushes the resolution left for everything else. Mixed-precision schemes
                  such as LLM.int8() route the outlier dimensions through higher precision while
                  the bulk of the computation runs in int8.
                </p>
              </div>
              <div className="rounded-xl border border-[#1e293b] p-4">
                <p className="text-[12px] font-semibold text-[#a855f7] mb-2">QLoRA</p>
                <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                  QLoRA (Dettmers et al., 2023) fine-tunes on top of a frozen base model stored in
                  4-bit NF4, a data type designed for normally distributed weights. Gradients flow
                  through the frozen 4-bit weights into small trainable LoRA adapters kept in
                  higher precision, which makes fine-tuning very large models feasible on a single
                  GPU. See{" "}
                  <Link href="/visual-guides/lora-adapters" className={proseLink}>
                    LoRA &amp; Adapters
                  </Link>{" "}
                  for the adapter math, and{" "}
                  <Link href="/visual-guides/fine-tuning-vs-prompting" className={proseLink}>
                    Fine-tuning vs Prompting
                  </Link>{" "}
                  for when to fine-tune at all.
                </p>
              </div>
              <div className="rounded-xl border border-[#1e293b] p-4">
                <p className="text-[12px] font-semibold text-[#3bb4a4] mb-2">
                  GGUF and llama.cpp
                </p>
                <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                  GGUF is the model file format of the llama.cpp ecosystem: a single file carrying
                  quantized weights at many bit widths plus metadata, built for running LLMs on
                  ordinary CPUs and consumer GPUs.
                </p>
              </div>
              <div className="rounded-xl border border-[#1e293b] p-4 sm:col-span-2">
                <p
                  className="text-[12px] font-semibold mb-2"
                  style={{ color: "var(--color-accent)" }}
                >
                  How much quality do you lose?
                </p>
                <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                  It depends on the model, the task, the bit width, and the method, and the answer
                  shifts with every generation of techniques. As a rough pattern reported across
                  the literature: 8-bit weight quantization is usually close to lossless, 4-bit is
                  often acceptable, and below 4 bits degradation grows quickly, exactly the shape
                  the error lab above shows. There is no universal percentage; measure on your own
                  task before you ship.
                </p>
              </div>
            </div>
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
                  Quantization Understood!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You squeezed a 70B-class model into 24 GB and measured what low bit widths do to
                  the weights.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {[
                    {
                      label: "70B weights at 2-bit",
                      value: `${formatGB(weightsMemoryGB(70, 0.25))} GB`,
                      color: "#3bb4a4",
                    },
                    {
                      label: "Bit widths compared",
                      value: `${exploredBits.size} / 4`,
                      color: "var(--color-accent)",
                    },
                    {
                      label: "2-bit vs 8-bit RMS error",
                      value: `${errorRatio2v8 >= 10 ? errorRatio2v8.toFixed(0) : errorRatio2v8.toFixed(1)}× larger`,
                      color: "#a855f7",
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-[#1e293b] p-3">
                      <p className="text-[10px] text-[#475569] mb-1">{item.label}</p>
                      <p className="text-[14px] font-mono font-bold" style={{ color: item.color }}>
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
                    &quot;Quantization is a straight trade: bits for memory. The error histogram
                    shows the price. At 8 bits the error is a rounding whisper; at 2 bits it eats
                    the signal.&quot;
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
