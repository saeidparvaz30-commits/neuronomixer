"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";

import ComparisonToggle from "./ComparisonToggle";
import DistributionDisplay from "./DistributionDisplay";
import FormulaWalkthrough from "./FormulaWalkthrough";
import TrainingRaceChart from "./TrainingRaceChart";
import LayerNormNote from "./LayerNormNote";
import { generateDistributions } from "./batchNormLogic";
import type { BNStep } from "./types";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

function useIntersectionOnce(threshold = 0.3) {
  const ref = useRef<HTMLDivElement>(null);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || triggered) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTriggered(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [triggered, threshold]);

  return { ref, triggered };
}

export default function BatchNormalizationClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();
  const completionFired = useRef(false);

  // Core state
  const [withBN, setWithBN] = useState(false);
  const [currentStep, setCurrentStep] = useState<BNStep>(1);

  // Completion tracking
  const [hasViewedBoth, setHasViewedBoth] = useState(false);
  const [hasCompletedFormula, setHasCompletedFormula] = useState(false);
  const viewedModesRef = useRef<Set<boolean>>(new Set([false]));

  const { ref: raceRef, triggered: hasViewedRace } = useIntersectionOnce(0.3);

  // Distributions (memoized per mode)
  const distributions = useMemo(() => generateDistributions(withBN), [withBN]);

  // Completion condition
  const isComplete = hasViewedBoth && hasCompletedFormula && hasViewedRace;

  useEffect(() => {
    if (isComplete && !completionFired.current) {
      completionFired.current = true;
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "batch-normalization", score: 100 }),
        }).catch(() => {});
      }
    }
  }, [isComplete, session?.user]);

  function handleToggle(value: boolean) {
    setWithBN(value);
    viewedModesRef.current.add(value);
    if (viewedModesRef.current.size >= 2) setHasViewedBoth(true);
  }

  function handleReset() {
    setWithBN(false);
    setCurrentStep(1);
    setHasViewedBoth(false);
    setHasCompletedFormula(false);
    viewedModesRef.current = new Set([false]);
  }

  // Progress percentage
  const progress =
    (hasViewedBoth ? 34 : 0) +
    (hasCompletedFormula ? 33 : 0) +
    (hasViewedRace ? 33 : 0);

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="batch-normalization" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#475569] mb-6">
          <Link href="/visual-guides" className="hover:text-[var(--color-accent)] transition-colors">
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-[#94a3b8]">Batch Normalization Explained</span>
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
            Batch <span className="text-[var(--color-accent)]">Normalization</span> Explained
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]">
            See how batch normalization stabilizes activation distributions and speeds up training.
            Watch two neural networks race, with and without BatchNorm.
          </p>
        </section>

        {/* Progress bar */}
        <div className="mb-8 bg-[#1e293b]/60 border border-white/[0.07] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#94a3b8]">Exploration Progress</span>
            <span className="text-sm font-semibold text-white">{progress}%</span>
          </div>
          <div className="h-2 bg-[#0f172a] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#a855f7] to-[#3bb4a4]"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="flex gap-4 mt-2 flex-wrap">
            <span
              className="text-[11px]"
              style={{ color: hasViewedBoth ? "#3bb4a4" : "#475569" }}
            >
              {hasViewedBoth ? "✓" : "○"} Toggle both modes
            </span>
            <span
              className="text-[11px]"
              style={{ color: hasCompletedFormula ? "#3bb4a4" : "#475569" }}
            >
              {hasCompletedFormula ? "✓" : "○"} Complete formula
            </span>
            <span
              className="text-[11px]"
              style={{ color: hasViewedRace ? "#3bb4a4" : "#475569" }}
            >
              {hasViewedRace ? "✓" : "○"} View training race
            </span>
          </div>
          {/* Sign-in nudge */}
          {!session?.user && (
            <p className="text-[11px] text-[#475569] mt-2">
              <Link href="/auth/sign-in" className="text-[var(--color-accent)] hover:underline">
                Sign in
              </Link>{" "}
              to save your progress
            </p>
          )}
        </div>

        {/* Section 1: The Problem */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 rounded-lg bg-[#a855f7]/20 border border-[#a855f7]/30 flex items-center justify-center text-xs font-bold text-[#a855f7]">
              1
            </div>
            <h2 className="text-xl font-bold text-white">The Problem: Shifting Activation Distributions</h2>
          </div>

          <p className="text-[#94a3b8] text-sm leading-relaxed mb-5 max-w-2xl">
            Without normalization, activation distributions shift layer by layer as earlier layers
            update. The original 2015 paper (Ioffe &amp; Szegedy) called this &quot;internal
            covariate shift&quot; and proposed BatchNorm as the cure. Why BatchNorm actually helps
            is still debated: later work (Santurkar et al., 2018) found it speeds up training even
            when covariate shift is artificially re-injected, and attributes the benefit mainly to
            a smoother optimization landscape. The shifting distributions below illustrate the
            original motivation.
          </p>

          <div className="space-y-4">
            <ComparisonToggle withBN={withBN} onChange={handleToggle} />
            <DistributionDisplay distributions={distributions} withBN={withBN} />
          </div>
        </section>

        {/* Section 2: The Math */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 rounded-lg bg-[#a855f7]/20 border border-[#a855f7]/30 flex items-center justify-center text-xs font-bold text-[#a855f7]">
              2
            </div>
            <h2 className="text-xl font-bold text-white">The Math: Four Steps</h2>
          </div>

          <p className="text-[#94a3b8] text-sm leading-relaxed mb-4 max-w-2xl">
            BatchNorm operates on a mini-batch of activations. Step through each computation to see
            exactly how normalization is applied.
          </p>

          <FormulaWalkthrough
            currentStep={currentStep}
            onStepChange={setCurrentStep}
            onComplete={() => setHasCompletedFormula(true)}
          />

          <div className="mt-4 p-4 bg-[#1e293b]/60 border border-white/[0.07] rounded-xl max-w-2xl">
            <p className="text-sm text-[#94a3b8] leading-relaxed">
              <span className="text-white font-semibold">Training vs. inference:</span>{" "}
              the four steps above use the current mini-batch&apos;s own mean and variance. At
              inference time there may be no batch at all, so BatchNorm instead uses running
              averages of the mean and variance accumulated during training, while γ and β stay
              fixed at their learned values. Forgetting to switch modes (e.g.{" "}
              <code className="text-[#3bb4a4]">model.eval()</code> in PyTorch) is a classic source
              of inference bugs.
            </p>
          </div>
        </section>

        {/* Section 3: Training Race */}
        <section className="mb-8" ref={raceRef}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 rounded-lg bg-[#a855f7]/20 border border-[#a855f7]/30 flex items-center justify-center text-xs font-bold text-[#a855f7]">
              3
            </div>
            <h2 className="text-xl font-bold text-white">Does It Speed Up Training?</h2>
          </div>

          <p className="text-[#94a3b8] text-sm leading-relaxed mb-4 max-w-2xl">
            The stylized curves below illustrate what typically happens when two otherwise
            identical networks train with and without Batch Normalization. They are constructed
            for teaching, not recorded from a live run.
          </p>

          <TrainingRaceChart />
        </section>

        {/* Section 4: BatchNorm vs LayerNorm */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 rounded-lg bg-[#a855f7]/20 border border-[#a855f7]/30 flex items-center justify-center text-xs font-bold text-[#a855f7]">
              4
            </div>
            <h2 className="text-xl font-bold text-white">BatchNorm vs LayerNorm</h2>
          </div>

          <LayerNormNote />
        </section>

        {/* Gold insight box */}
        <div className="mb-8 p-5 bg-[#d4af37]/08 border border-[#d4af37]/25 rounded-2xl">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#d4af37]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg
                className="w-4 h-4 text-[var(--color-accent)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold text-[var(--color-accent)] mb-1">
                Before or After Activation?
              </div>
              <p className="text-sm text-[#94a3b8] leading-relaxed">
                In the original 2015 paper by Ioffe &amp; Szegedy, BatchNorm normalizes the{" "}
                <span className="text-white font-semibold">pre-activation values</span>: the order
                is Linear → BatchNorm → Activation. Some practitioners instead place it after the
                activation (Linear → Activation → BatchNorm); both orderings appear in production
                code. Separately, ResNet-v2&apos;s &quot;pre-activation&quot; blocks (BN → ReLU →
                weight layer) showed that normalizing before the weight layer improves gradient
                flow in very deep residual networks.
              </p>
            </div>
          </div>
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
                  BatchNorm Understood!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You explored shifting activations, stepped through the four BatchNorm
                  computations, and watched the training race.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Distributions</p>
                    <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                      Compared activation distributions with and without BatchNorm.
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">The Math</p>
                    <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                      Stepped through mean, variance, normalize, then scale and shift.
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Training Speed</p>
                    <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                      Saw why smoother optimization lets you raise the learning rate.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;BatchNorm normalizes each mini-batch to zero mean and unit
                    variance, then lets the learnable γ and β scale it back: the payoff
                    is a smoother loss landscape and faster, more stable training.&quot;
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
                    href="/visual-guides/transfer-learning"
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
              href="/visual-guides/transfer-learning"
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
