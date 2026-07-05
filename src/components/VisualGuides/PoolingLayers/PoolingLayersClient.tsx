"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";

import { PoolingType, PoolingConfig } from "./types";
import PoolingTypeSelector from "./PoolingTypeSelector";
import PoolingControls from "./PoolingControls";
import PoolingVisualizer from "./PoolingVisualizer";
import SideBySideComparison from "./SideBySideComparison";
import WhyPoolingMatters from "./WhyPoolingMatters";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

export default function PoolingLayersClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();
  const completionFired = useRef(false);

  const [poolingType, setPoolingType] = useState<PoolingType>("max");
  const [kernelSize, setKernelSize] = useState<2 | 3>(2);
  const [stride, setStride] = useState<1 | 2>(2);
  const [exploredTypes, setExploredTypes] = useState<Set<PoolingType>>(new Set(["max"]));
  const [hasViewedComparison, setHasViewedComparison] = useState(false);

  const config: PoolingConfig = { type: poolingType, kernelSize, stride };

  function handleTypeSelect(type: PoolingType) {
    setPoolingType(type);
    setExploredTypes((prev) => new Set([...prev, type]));
  }

  const isComplete = exploredTypes.size >= 3 && hasViewedComparison;

  function handleReset() {
    setPoolingType("max");
    setKernelSize(2);
    setStride(2);
    setExploredTypes(new Set(["max"]));
  }

  const progressPct = Math.round(
    (Math.min(exploredTypes.size, 3) / 3) * 50 + (hasViewedComparison ? 50 : 0)
  );

  useEffect(() => {
    if (isComplete && !completionFired.current) {
      completionFired.current = true;
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "pooling-layers", score: 100 }),
        }).catch(() => {});
      }
    }
  }, [isComplete, session?.user]);

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="pooling-layers" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#475569] mb-6">
          <Link href="/visual-guides" className="hover:text-[var(--color-accent)] transition-colors">
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-[#94a3b8]">Pooling Layers: Shrinking Without Losing</span>
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
            Pooling Layers:{" "}
            <span className="text-[var(--color-accent)]">Shrinking Without Losing</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Watch max, average, min, and RMS pooling slide across a pixel grid in real
            time. Understand how CNNs reduce spatial dimensions while preserving the features
            that matter.
          </motion.p>
        </section>

        {/* Progress bar */}
        <div className="mb-8 bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <span className="text-sm text-[#94a3b8]">Exploration Progress</span>
            <span className="text-sm font-semibold text-white">
              {Math.min(exploredTypes.size, 3)}/3 pooling types explored
              &nbsp;&middot;&nbsp;
              {hasViewedComparison ? "1/1" : "0/1"} comparison viewed
            </span>
          </div>
          <div className="h-2 bg-[#0f172a] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[var(--color-accent)] rounded-full"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <AnimatePresence>
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-xs text-[var(--color-success)] font-semibold"
              >
                Guide complete! You understand how pooling layers work.
              </motion.div>
            )}
          </AnimatePresence>
          {!session?.user && (
            <p className="text-[11px] text-[#475569] mt-2">Sign in to save progress</p>
          )}
        </div>

        {/* Section 1: Choose Pooling Type */}
        <section className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-6 h-6 rounded-md bg-[#a855f7]/20 border border-[#a855f7]/30 flex items-center justify-center text-xs font-bold text-[#a855f7]">
              1
            </div>
            <h2 className="text-base font-semibold text-white">Choose Pooling Type</h2>
            <span className="text-[11px] text-[#475569]">
              {exploredTypes.size}/4 explored
            </span>
          </div>
          <div className="bg-[#1e293b]/40 border border-white/[0.06] rounded-xl p-4">
            <PoolingTypeSelector selected={poolingType} onSelect={handleTypeSelect} />
          </div>
        </section>

        {/* Section 2: Configure Window */}
        <section className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-6 h-6 rounded-md bg-[#a855f7]/20 border border-[#a855f7]/30 flex items-center justify-center text-xs font-bold text-[#a855f7]">
              2
            </div>
            <h2 className="text-base font-semibold text-white">Configure Window</h2>
          </div>
          <div className="bg-[#1e293b]/40 border border-white/[0.06] rounded-xl p-4">
            <PoolingControls
              config={config}
              onKernelChange={setKernelSize}
              onStrideChange={setStride}
              inputSize={8}
            />
          </div>
        </section>

        {/* Section 3: Visualizer */}
        <section className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-6 h-6 rounded-md bg-[#a855f7]/20 border border-[#a855f7]/30 flex items-center justify-center text-xs font-bold text-[#a855f7]">
              3
            </div>
            <h2 className="text-base font-semibold text-white">Watch the Pooling</h2>
          </div>
          <div className="bg-[#1e293b]/40 border border-white/[0.06] rounded-xl p-5 overflow-x-auto">
            <PoolingVisualizer config={config} />
          </div>
        </section>

        {/* Section 4: Side-by-side comparison */}
        <section className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-6 h-6 rounded-md bg-[#a855f7]/20 border border-[#a855f7]/30 flex items-center justify-center text-xs font-bold text-[#a855f7]">
              4
            </div>
            <h2 className="text-base font-semibold text-white">
              Max vs Average: Side by Side
            </h2>
          </div>
          <div className="bg-[#1e293b]/40 border border-white/[0.06] rounded-xl p-5 overflow-x-auto">
            <SideBySideComparison onVisible={() => setHasViewedComparison(true)} />
          </div>
        </section>

        {/* Section 5: Why pooling matters */}
        <section className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-6 h-6 rounded-md bg-[#a855f7]/20 border border-[#a855f7]/30 flex items-center justify-center text-xs font-bold text-[#a855f7]">
              5
            </div>
            <h2 className="text-base font-semibold text-white">Why Pooling Matters</h2>
          </div>
          <WhyPoolingMatters />
        </section>

        {/* Insight card */}
        <div className="bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-[var(--color-accent)] mb-2">Key Insight</h3>
          <p className="text-sm text-[#94a3b8] leading-relaxed">
            In modern CNNs like{" "}
            <span className="text-white font-semibold">ResNet</span>, Global Average
            Pooling collapses each feature map to a{" "}
            <span className="text-white font-semibold">single value per channel</span>,
            replacing the huge flattened fully-connected stacks of older architectures
            like VGG; only one small final classifier layer remains. This dramatically
            reduces parameters and overfitting.
          </p>
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
              {/* Header */}
              <div className="px-6 pt-6 pb-4 border-b border-white/[0.07]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-px bg-[var(--color-accent)]" />
                  <span className="text-[10px] font-semibold uppercase tracking-[2px] text-[var(--color-accent)]">
                    Guide Complete
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">
                  Pooling Mastered!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You explored {exploredTypes.size} pooling types and saw how max vs
                  average pooling produce different results on the same input.
                </p>
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                <p className="text-[13px] text-[#94a3b8] leading-relaxed mb-3">
                  These are the building blocks of spatial downsampling in every major CNN.
                </p>
                <div className="flex flex-col gap-1.5 mb-4">
                  {[
                    "Max pooling keeps the strongest activation in each window",
                    "Stride controls how much the window moves: stride 2 halves dimensions",
                    "Global Average Pooling removes spatial dimensions entirely",
                    "Pooling adds translation invariance to the network",
                  ].map((point) => (
                    <div key={point} className="flex items-start gap-2">
                      <svg
                        className="w-3.5 h-3.5 text-[var(--color-success)] mt-0.5 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-[12px] text-[#94a3b8]">{point}</span>
                    </div>
                  ))}
                </div>

                {/* Key Takeaway */}
                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Pooling shrinks feature maps while keeping the signals that
                    matter: max pooling keeps the strongest activation in each window,
                    and stride 2 halves the spatial dimensions.&quot;
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-3">
                <Link
                  href="/visual-guides"
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
                >
                  &larr; All Guides
                </Link>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
                  >
                    Try Again
                  </button>
                  <Link
                    href="/visual-guides/rnns-lstms"
                    className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
                  >
                    Next Guide &rarr;
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link
            href="/visual-guides/cnns"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            &larr; CNNs: See What Filters See
          </Link>
          <Link
            href="/visual-guides/rnns-lstms"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            Next Guide &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
