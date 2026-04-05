"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

import { PoolingType, PoolingConfig } from "./types";
import PoolingTypeSelector from "./PoolingTypeSelector";
import PoolingControls from "./PoolingControls";
import PoolingVisualizer from "./PoolingVisualizer";
import SideBySideComparison from "./SideBySideComparison";
import WhyPoolingMatters from "./WhyPoolingMatters";

export default function PoolingLayersClient() {
  const { data: session } = useSession();
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
    <div className="min-h-screen bg-[#0f172a] text-white">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#94a3b8] mb-6 flex-wrap">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-[#a855f7]">Deep Learning</span>
          <span>/</span>
          <span className="text-white">Pooling Layers: Shrinking Without Losing</span>
        </nav>

        {/* Hero */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-[#a855f7]/20 border border-[#a855f7]/40 rounded-full px-3 py-1 mb-4">
            <span className="text-xs font-semibold text-[#a855f7] uppercase tracking-wider">
              Deep Learning
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Pooling Layers: Shrinking Without Losing
          </h1>
          <p className="text-[#94a3b8] text-base max-w-2xl leading-relaxed">
            Watch max, average, min, and L2-norm pooling slide across a pixel grid in real
            time. Understand how CNNs reduce spatial dimensions while preserving the features
            that matter.
          </p>
        </div>

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
              className="h-full bg-gradient-to-r from-[#a855f7] to-[#3bb4a4] rounded-full"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <AnimatePresence>
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-xs text-[#3bb4a4] font-semibold"
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
          <h3 className="text-sm font-semibold text-[#d4af37] mb-2">Key Insight</h3>
          <p className="text-sm text-[#94a3b8] leading-relaxed">
            In modern CNNs like{" "}
            <span className="text-white font-semibold">ResNet</span>, Global Average
            Pooling replaces fully-connected layers entirely &mdash; reducing a feature map
            to a{" "}
            <span className="text-white font-semibold">single value per channel</span>{" "}
            before classification. This dramatically reduces parameters and overfitting.
          </p>
        </div>

        {/* Completion summary */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#3bb4a4]/10 border border-[#3bb4a4]/30 rounded-xl p-5 mb-6"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#3bb4a4]/20 border border-[#3bb4a4]/40 flex items-center justify-center flex-shrink-0 mt-0.5">
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
                <div>
                  <h3 className="text-sm font-semibold text-[#3bb4a4] mb-2">
                    Guide Complete
                  </h3>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed mb-3">
                    You explored {exploredTypes.size} pooling types and saw how max vs
                    average pooling produce different results on the same input. These are
                    the building blocks of spatial downsampling in every major CNN.
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {[
                      "Max pooling keeps the strongest activation in each window",
                      "Stride controls how much the window moves — stride 2 halves dimensions",
                      "Global Average Pooling removes spatial dimensions entirely",
                      "Pooling adds translation invariance to the network",
                    ].map((point) => (
                      <div key={point} className="flex items-start gap-2">
                        <svg
                          className="w-3.5 h-3.5 text-[#3bb4a4] mt-0.5 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
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
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-[#1e293b]">
          <Link
            href="/visual-guides/cnns"
            className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white transition-colors"
          >
            <span>&larr;</span>
            <span>CNNs: See What Filters See</span>
          </Link>
          <Link
            href="/visual-guides"
            className="text-sm text-[#94a3b8] hover:text-white transition-colors"
          >
            All Guides
          </Link>
          <Link
            href="/visual-guides/rnns-lstms"
            className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white transition-colors"
          >
            <span>RNNs &amp; LSTMs</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
