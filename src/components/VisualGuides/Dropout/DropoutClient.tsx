"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";

import DropoutRateSlider from "./DropoutRateSlider";
import NetworkVisualizer from "./NetworkVisualizer";
import ModeToggle from "./ModeToggle";
import RegularizationEffect from "./RegularizationEffect";
import EnsembleIntuition from "./EnsembleIntuition";
import { generateNetwork } from "./networkLogic";
import type { NetworkConfig } from "./types";
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

export default function DropoutClient() {
  const { data: session } = useSession();
  const completionFired = useRef(false);

  // Core state
  const [dropoutRate, setDropoutRate] = useState(0.5);
  const [mode, setMode] = useState<"training" | "inference">("training");
  const [seed, setSeed] = useState(42);

  // Completion tracking
  const [hasChangedRate, setHasChangedRate] = useState(false);
  const [hasToggledMode, setHasToggledMode] = useState(false);
  const modesTriedRef = useRef<Set<string>>(new Set(["training"]));

  const { ref: comparisonRef, triggered: hasViewedComparison } = useIntersectionOnce(0.3);

  // Network config memo
  const networkConfig: NetworkConfig = useMemo(
    () => ({ dropoutRate, seed, mode }),
    [dropoutRate, seed, mode]
  );

  // Live stats
  const { neurons } = useMemo(() => generateNetwork(networkConfig), [networkConfig]);
  const totalActive = neurons.filter((n) => n.active).length;
  const totalNeurons = neurons.length;

  // Completion condition
  const isComplete = hasViewedComparison && hasChangedRate && hasToggledMode;

  useEffect(() => {
    if (isComplete && !completionFired.current) {
      completionFired.current = true;
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "dropout", score: 100 }),
        }).catch(() => {});
      }
    }
  }, [isComplete, session?.user]);

  function handleRateChange(v: number) {
    setDropoutRate(v);
    if (!hasChangedRate) setHasChangedRate(true);
  }

  function handleModeChange(v: "training" | "inference") {
    setMode(v);
    modesTriedRef.current.add(v);
    if (modesTriedRef.current.size >= 2) setHasToggledMode(true);
  }

  // Progress percentage
  const progress =
    (hasChangedRate ? 34 : 0) +
    (hasToggledMode ? 33 : 0) +
    (hasViewedComparison ? 33 : 0);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <GuideCompletion isComplete={isComplete} guideSlug="dropout" score={100} />
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
          <span className="text-white">Dropout: Training with Missing Neurons</span>
        </nav>

        {/* Hero */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 bg-[#a855f7]/20 border border-[#a855f7]/40 rounded-full px-3 py-1 mb-4">
            <span className="text-xs font-semibold text-[#a855f7] uppercase tracking-wider">
              Deep Learning
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Dropout: Training with Missing Neurons
          </h1>
          <p className="text-[#94a3b8] text-base max-w-2xl leading-relaxed">
            Slide the dropout probability and watch neurons randomly deactivate. Understand how
            dropout prevents overfitting by training an ensemble of thinned networks simultaneously.
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
              style={{ color: hasChangedRate ? "#3bb4a4" : "#475569" }}
            >
              {hasChangedRate ? "✓" : "○"} Adjust rate
            </span>
            <span
              className="text-[11px]"
              style={{ color: hasToggledMode ? "#3bb4a4" : "#475569" }}
            >
              {hasToggledMode ? "✓" : "○"} Try both modes
            </span>
            <span
              className="text-[11px]"
              style={{ color: hasViewedComparison ? "#3bb4a4" : "#475569" }}
            >
              {hasViewedComparison ? "✓" : "○"} View comparison
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

        {/* Section 1: Dropout Rate */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 rounded-lg bg-[#a855f7]/20 border border-[#a855f7]/30 flex items-center justify-center text-xs font-bold text-[#a855f7]">
              1
            </div>
            <h2 className="text-xl font-bold text-white">Dropout Rate</h2>
          </div>
          <DropoutRateSlider value={dropoutRate} onChange={handleRateChange} />
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={() => setSeed((s) => s + 1)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1e293b] border border-white/[0.07] rounded-xl text-sm text-[#94a3b8] hover:text-white hover:border-white/20 transition-all"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Re-randomize pattern
            </button>
            <span className="text-xs text-[#475569]">
              Each forward pass uses a different random mask
            </span>
          </div>
        </section>

        {/* Section 2: Network Visualization */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 rounded-lg bg-[#a855f7]/20 border border-[#a855f7]/30 flex items-center justify-center text-xs font-bold text-[#a855f7]">
              2
            </div>
            <h2 className="text-xl font-bold text-white">Network Visualization</h2>
          </div>

          <div className="flex flex-col gap-4">
            <ModeToggle value={mode} onChange={handleModeChange} />
            <NetworkVisualizer config={networkConfig} />

            {/* Live stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "Active Neurons",
                  value: `${totalActive}/${totalNeurons}`,
                  color: "#3bb4a4",
                },
                {
                  label: "Dropout Rate",
                  value: `${Math.round(dropoutRate * 100)}%`,
                  color: dropoutRate < 0.3 ? "#22c55e" : dropoutRate < 0.6 ? "#eab308" : "#ef4444",
                },
                {
                  label: "Mode",
                  value: mode === "training" ? "Training" : "Inference",
                  color: mode === "training" ? "#a855f7" : "#3bb4a4",
                },
                {
                  label: "Seed",
                  value: `#${seed}`,
                  color: "#94a3b8",
                },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="bg-[#1e293b]/60 border border-white/[0.07] rounded-xl p-3 text-center"
                >
                  <div className="text-xl font-bold" style={{ color }}>
                    {value}
                  </div>
                  <div className="text-[11px] text-[#475569] mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* Inverted dropout note */}
            <div className="p-4 bg-[#1e5d8a]/15 border border-[#1e5d8a]/30 rounded-xl">
              <p className="text-sm text-[#94a3b8] leading-relaxed">
                <span className="font-semibold text-white">Inference mode: </span>
                All neurons are active but activations are scaled by{" "}
                <code className="text-[#3bb4a4] bg-[#0f172a] px-1.5 py-0.5 rounded text-xs">
                  (1 − p)
                </code>{" "}
                to compensate for the extra neurons present compared to training. Try toggling
                between modes to see the difference.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Regularization Comparison */}
        <section className="mb-8" ref={comparisonRef}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 rounded-lg bg-[#a855f7]/20 border border-[#a855f7]/30 flex items-center justify-center text-xs font-bold text-[#a855f7]">
              3
            </div>
            <h2 className="text-xl font-bold text-white">Does It Actually Help?</h2>
          </div>
          <RegularizationEffect />
        </section>

        {/* Section 4: Ensemble Intuition */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 rounded-lg bg-[#a855f7]/20 border border-[#a855f7]/30 flex items-center justify-center text-xs font-bold text-[#a855f7]">
              4
            </div>
            <h2 className="text-xl font-bold text-white">Why This Works: Ensemble Intuition</h2>
          </div>
          <EnsembleIntuition />
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
              <div className="text-sm font-bold text-[#d4af37] mb-1">Modern Implementation: Inverted Dropout</div>
              <p className="text-sm text-[#94a3b8] leading-relaxed">
                Modern frameworks use{" "}
                <span className="text-white font-semibold">inverted dropout</span>: multiply
                activations by{" "}
                <code className="text-[#3bb4a4] bg-[#0f172a] px-1.5 py-0.5 rounded text-xs">
                  1/(1−p)
                </code>{" "}
                during training so no rescaling is needed at inference time. This means the same
                network weights work unchanged at test time — cleaner and faster.
              </p>
            </div>
          </div>
        </div>

        {/* Summary card (shown when complete) */}
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
              You understand how dropout works — from the probabilistic deactivation of neurons to
              its role as an implicit ensemble method. Next, see how Batch Normalization stabilizes
              training from a different angle.
            </p>
            <Link
              href="/visual-guides/batch-normalization"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#a855f7] hover:bg-[#9333ea] text-white font-semibold text-sm rounded-xl transition-colors"
            >
              Next: Batch Normalization
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
