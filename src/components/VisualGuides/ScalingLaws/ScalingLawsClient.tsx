"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  CHINCHILLA,
  HISTORICAL_MODELS,
  chinchillaLoss,
  optimalAllocation,
  formatCount,
  formatFlops,
  type Allocation,
} from "./scalingMath";
import IsoFlopExplorer from "./IsoFlopExplorer";
import FrontierMap from "./FrontierMap";

const GUIDE_TITLE = "Scaling Laws";
const NEXT_GUIDE_SLUG = "post-training";
const DEFAULT_LOGC = 23;
const DEFAULT_OFFSET = 0;

export default function ScalingLawsClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  const [logC, setLogC] = useState(DEFAULT_LOGC);
  const [offset, setOffset] = useState(DEFAULT_OFFSET);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [modelsViewed, setModelsViewed] = useState<Set<string>>(new Set());

  // Gates: each flips ONLY inside the handler for its real interaction.
  const [budgetChanged, setBudgetChanged] = useState(false);
  const [allocationChanged, setAllocationChanged] = useState(false);
  const modelInspected = modelsViewed.size > 0;

  const isComplete = budgetChanged && allocationChanged && modelInspected;

  // Derived, all recomputed live from the fitted law.
  const c = useMemo(() => Math.pow(10, logC), [logC]);
  const opt = useMemo(() => optimalAllocation(c), [c]);
  const user = useMemo<Allocation>(() => {
    const n = opt.n * Math.pow(10, offset);
    const d = c / (6 * n);
    return { n, d, loss: chinchillaLoss(n, d) };
  }, [opt, offset, c]);

  const handleLogCChange = useCallback(
    (v: number) => {
      if (v !== logC) setBudgetChanged(true);
      setLogC(v);
    },
    [logC]
  );

  const handleOffsetChange = useCallback(
    (v: number) => {
      if (v !== offset) setAllocationChanged(true);
      setOffset(v);
    },
    [offset]
  );

  const handleSelectModel = useCallback((id: string) => {
    setSelectedModel(id);
    setModelsViewed((prev) => new Set([...prev, id]));
  }, []);

  function handleReset() {
    setLogC(DEFAULT_LOGC);
    setOffset(DEFAULT_OFFSET);
    setSelectedModel(null);
    setModelsViewed(new Set());
    setBudgetChanged(false);
    setAllocationChanged(false);
  }

  const progressItems = [
    { id: "budget", label: "Change the compute budget", done: budgetChanged },
    { id: "alloc", label: "Move the N vs D allocation", done: allocationChanged },
    { id: "model", label: "Inspect a historical model", done: modelInspected },
  ];

  const overhead = user.loss - opt.loss;

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="scaling-laws" score={100} />
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
            Scaling <span className="text-[var(--color-accent)]">Laws</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Loss falls predictably with parameters, data, and compute, which is
            why frontier labs can plan a model before training it. Here you
            drive the actual fitted Chinchilla law: pick a FLOPs budget, split
            it between model size and tokens, and read the predicted loss live.
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

        {/* The law */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The law, with its published constants
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Kaplan et al. 2020 (arXiv:2001.08361) showed language model loss
            follows smooth power laws in model size, data, and compute.
            Hoffmann et al. 2022 (arXiv:2203.15556, the Chinchilla paper)
            fitted a two-term parametric form to hundreds of training runs.
            Every number in this guide is computed from that fit:
          </p>
          <pre className="bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[11px] leading-relaxed rounded-xl p-4 overflow-x-auto mb-4">
{`L(N, D) = E + A / N^alpha + B / D^beta

E = ${CHINCHILLA.E}      A = ${CHINCHILLA.A}     B = ${CHINCHILLA.B}
alpha = ${CHINCHILLA.alpha}          beta = ${CHINCHILLA.beta}

constants: Hoffmann et al. 2022, arXiv:2203.15556 (Approach 3 fit)
compute:   C = 6 * N * D FLOPs (Kaplan et al. 2020 approximation)`}
          </pre>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                E: the floor
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                The irreducible loss. Even an infinite model on infinite data
                cannot beat the intrinsic entropy of natural text. No amount of
                scale buys past it.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                A / N^alpha: model term
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                The penalty for a finite parameter count. It shrinks as a power
                law in N, so every extra decade of parameters buys a
                predictable, and shrinking, slice of loss.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                B / D^beta: data term
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                The penalty for finite training data. Because both terms decay
                as power laws, a fixed compute budget has a best split between
                the two: the compute-optimal allocation.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Iso-FLOP explorer */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Spend a budget: the iso-FLOP valley
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Fix a compute budget C and every choice of N drags D = C / 6N with
            it: a bigger model must train on fewer tokens. The curve below is
            the predicted loss along that constraint. Its valley is the
            compute-optimal point. Slide the budget and the whole valley
            shifts; slide the allocation and watch how much loss a lopsided
            split costs you.
          </p>
          <IsoFlopExplorer
            logC={logC}
            offset={offset}
            c={c}
            user={user}
            opt={opt}
            onLogCChange={handleLogCChange}
            onOffsetChange={handleOffsetChange}
          />
        </motion.section>

        {/* Frontier map */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The frontier, and where real models landed
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Sweeping the budget traces the compute-optimal frontier through the
            (N, D) plane. The purple dots are real published models, plotted at
            their published parameter and token counts. GPT-3-era models sit
            far to the parameter-heavy side of the frontier; Chinchilla was the
            correction. Llama-generation models are famously trained far past
            the 20-tokens-per-parameter rule of thumb because inference cost
            rewards small models, yet against the more data-heavy Approach 3
            frontier drawn here even they land on the parameter-heavy side, a
            tension the fine print below unpacks.
          </p>
          <FrontierMap
            user={user}
            selectedId={selectedModel}
            onSelect={handleSelectModel}
          />
        </motion.section>

        {/* Honesty caveats */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[var(--color-warning)]/25 bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[11px] font-semibold text-[var(--color-warning)] mb-2 uppercase tracking-wide">
            Read the fine print
          </p>
          <ul className="space-y-2 text-[12px] text-[#94a3b8] leading-relaxed max-w-[760px]">
            <li>
              <span className="text-white font-semibold">
                Constants are dataset-specific.
              </span>{" "}
              The fit was calibrated on DeepMind&apos;s MassiveText with their
              tokenizer. Predicted losses for other models show the shape of
              the tradeoff, not those models&apos; actual reported losses.
            </li>
            <li>
              <span className="text-white font-semibold">
                The published fit is contested.
              </span>{" "}
              These Approach 3 constants imply a frontier of roughly 30 to 150
              tokens per parameter across this guide&apos;s budget range
              (computed live above), which is more data-heavy than the famous
              20-tokens-per-parameter headline from the same paper&apos;s
              Approaches 1 and 2. Besiroglu et al. 2024 (arXiv:2404.10102)
              document the inconsistency and refit the constants.
            </li>
            <li>
              <span className="text-white font-semibold">
                C = 6ND is an approximation.
              </span>{" "}
              It counts dense forward and backward FLOPs per token and ignores
              attention overhead, embedding parameters, and architecture
              details.
            </li>
            <li>
              <span className="text-white font-semibold">
                Compute-optimal is not deployment-optimal.
              </span>{" "}
              The law prices training only. A model served billions of times
              is often trained far past the frontier on purpose: extra
              training FLOPs buy a smaller model with cheaper inference
              forever.
            </li>
          </ul>
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
                  You Can Plan a Model Now
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You traded parameters against tokens under a fixed budget and
                  measured what a bad split costs, straight from the fitted law.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Your final budget</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {formatFlops(c)} FLOPs
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Your allocation ({formatCount(user.n)} params, {formatCount(user.d)} tokens)
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[#3bb4a4]">
                      loss {user.loss.toFixed(3)} (+{overhead.toFixed(3)} vs optimal)
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Models inspected</p>
                    <p className="text-[14px] font-mono font-bold text-[#a855f7]">
                      {modelsViewed.size} / {HISTORICAL_MODELS.length}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Scaling laws turn model design from alchemy into
                    budgeting: loss is a smooth, fitted function of parameters
                    and tokens, so the expensive question is not whether a
                    bigger run will help, but how to split the compute you
                    have.&quot;
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
