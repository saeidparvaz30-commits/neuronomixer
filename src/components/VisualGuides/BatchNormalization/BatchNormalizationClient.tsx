"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";

import ComparisonToggle from "./ComparisonToggle";
import DistributionDisplay from "./DistributionDisplay";
import FormulaWalkthrough from "./FormulaWalkthrough";
import TrainingRaceChart from "./TrainingRaceChart";
import LayerNormNote from "./LayerNormNote";
import { generateDistributions } from "./batchNormLogic";
import type { BNStep } from "./types";

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

  // Progress percentage
  const progress =
    (hasViewedBoth ? 34 : 0) +
    (hasCompletedFormula ? 33 : 0) +
    (hasViewedRace ? 33 : 0);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span>/</span>
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Deep Learning
          </Link>
          <span>/</span>
          <span className="text-white">Batch Normalization Explained</span>
        </nav>

        {/* Hero */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 bg-[#a855f7]/20 border border-[#a855f7]/40 rounded-full px-3 py-1 mb-4">
            <span className="text-xs font-semibold text-[#a855f7] uppercase tracking-wider">
              Deep Learning
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Batch Normalization Explained
          </h1>
          <p className="text-[#94a3b8] text-base max-w-2xl leading-relaxed">
            See how batch normalization stabilizes activation distributions and speeds up training.
            Watch two neural networks race — with and without BatchNorm.
          </p>
        </div>

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
              <Link href="/auth/sign-in" className="text-[#d4af37] hover:underline">
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
            <h2 className="text-xl font-bold text-white">The Problem: Internal Covariate Shift</h2>
          </div>

          <p className="text-[#94a3b8] text-sm leading-relaxed mb-5 max-w-2xl">
            Without normalization, activation distributions shift layer by layer. This forces each
            layer to constantly adapt to its input distribution — slowing training and causing
            instability.
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
            Two identical networks, same architecture, same data. The only difference: one uses
            Batch Normalization. Watch what happens to convergence.
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
                className="w-4 h-4 text-[#d4af37]"
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
              <div className="text-sm font-bold text-[#d4af37] mb-1">
                Before or After Activation?
              </div>
              <p className="text-sm text-[#94a3b8] leading-relaxed">
                BatchNorm is applied{" "}
                <span className="text-white font-semibold">BEFORE the activation function</span> in
                the original 2015 paper by Ioffe &amp; Szegedy. But many practitioners now apply it{" "}
                <span className="text-white font-semibold">AFTER</span> — both approaches are used
                in production. The &quot;pre-activation&quot; variant (BatchNorm → Activation) is
                argued to have better gradient flow.
              </p>
            </div>
          </div>
        </div>

        {/* Summary card when complete */}
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-6 bg-gradient-to-br from-[#a855f7]/10 to-[#3bb4a4]/10 border border-[#a855f7]/30 rounded-2xl"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#3bb4a4]/20 border border-[#3bb4a4]/40 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-[#3bb4a4]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="font-bold text-white">Guide Complete!</span>
            </div>
            <p className="text-sm text-[#94a3b8] leading-relaxed mb-5">
              You now understand how BatchNorm reduces internal covariate shift, allows higher
              learning rates, and acts as implicit regularization. Next, see how transfer learning
              lets you reuse pretrained network knowledge.
            </p>
            <Link
              href="/visual-guides/transfer-learning"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#a855f7] hover:bg-[#9333ea] text-white font-semibold text-sm rounded-xl transition-colors"
            >
              Next: Transfer Learning
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
