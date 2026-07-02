"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

import { FilterId, SampleImageId } from "./types";
import { FILTERS } from "./filterData";
import { SAMPLE_IMAGES } from "./sampleImages";
import FilterSelector from "./FilterSelector";
import KernelDisplay from "./KernelDisplay";
import ConvolutionVisualizer from "./ConvolutionVisualizer";
import FeatureMapDisplay from "./FeatureMapDisplay";
import LayerHierarchy from "./LayerHierarchy";
import SampleImageSelector from "./SampleImageSelector";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

export default function CNNsClient() {
  const { data: session } = useSession();
  const completionFired = useRef(false);

  const [selectedFilterId, setSelectedFilterId] = useState<FilterId>("edge-h");
  const [selectedImageId, setSelectedImageId] = useState<SampleImageId>("checkerboard");
  const [exploredFilters, setExploredFilters] = useState<Set<FilterId>>(new Set(["edge-h"]));
  const [hasViewedHierarchy, setHasViewedHierarchy] = useState(false);
  const [outputGrid, setOutputGrid] = useState<number[][]>([]);

  const selectedFilter = FILTERS.find((f) => f.id === selectedFilterId)!;
  const selectedImage = SAMPLE_IMAGES.find((img) => img.id === selectedImageId)!;

  function handleFilterSelect(id: FilterId) {
    setSelectedFilterId(id);
    setExploredFilters((prev) => new Set([...prev, id]));
  }

  const handleOutputReady = useCallback((grid: number[][]) => {
    setOutputGrid(grid);
  }, []);

  const progressPct = Math.round(
    (Math.min(exploredFilters.size, 3) / 3) * 50 +
      (hasViewedHierarchy ? 50 : 0)
  );

  const isComplete = exploredFilters.size >= 3 && hasViewedHierarchy;

  useEffect(() => {
    if (isComplete && !completionFired.current) {
      completionFired.current = true;
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "cnns", score: 100 }),
        }).catch(() => {});
      }
    }
  }, [isComplete, session?.user]);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <GuideCompletion isComplete={isComplete} guideSlug="cnns" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#94a3b8] mb-6 flex-wrap">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-[#a855f7]">Deep Learning</span>
          <span>/</span>
          <span className="text-white">CNNs: See What Filters See</span>
        </nav>

        {/* Hero */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-[#a855f7]/20 border border-[#a855f7]/40 rounded-full px-3 py-1 mb-4">
            <span className="text-xs font-semibold text-[#a855f7] uppercase tracking-wider">
              Deep Learning
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            CNNs: See What Filters See
          </h1>
          <p className="text-[#94a3b8] text-base max-w-2xl leading-relaxed">
            Watch convolutional filters slide across images and produce feature maps. Explore
            edge detection, sharpening, and blur kernels — the same operations that power
            image recognition models.
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8 bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <span className="text-sm text-[#94a3b8]">Exploration Progress</span>
            <span className="text-sm font-semibold text-white">
              {Math.min(exploredFilters.size, 3)}/3 filters explored
              &nbsp;·&nbsp;
              {hasViewedHierarchy ? "1/1" : "0/1"} hierarchy viewed
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
                Guide complete! You understand how CNN filters work.
              </motion.div>
            )}
          </AnimatePresence>
          {!session?.user && (
            <p className="text-[11px] text-[#475569] mt-2">
              Sign in to save progress
            </p>
          )}
        </div>

        {/* Section: Select Image */}
        <section className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-6 h-6 rounded-md bg-[#a855f7]/20 border border-[#a855f7]/30 flex items-center justify-center text-xs font-bold text-[#a855f7]">
              1
            </div>
            <h2 className="text-base font-semibold text-white">Select a Sample Image</h2>
          </div>
          <div className="bg-[#1e293b]/40 border border-white/[0.06] rounded-xl p-4">
            <SampleImageSelector
              selected={selectedImageId}
              onSelect={setSelectedImageId}
            />
          </div>
        </section>

        {/* Section: Choose Filter */}
        <section className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-6 h-6 rounded-md bg-[#a855f7]/20 border border-[#a855f7]/30 flex items-center justify-center text-xs font-bold text-[#a855f7]">
              2
            </div>
            <h2 className="text-base font-semibold text-white">Choose a Filter</h2>
            <span className="text-[11px] text-[#475569]">
              {exploredFilters.size}/6 explored
            </span>
          </div>
          <div className="bg-[#1e293b]/40 border border-white/[0.06] rounded-xl p-4 flex flex-col gap-4">
            <FilterSelector selected={selectedFilterId} onSelect={handleFilterSelect} />
            <KernelDisplay filter={selectedFilter} />
          </div>
        </section>

        {/* Section: Convolution + Feature Map */}
        <section className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-6 h-6 rounded-md bg-[#a855f7]/20 border border-[#a855f7]/30 flex items-center justify-center text-xs font-bold text-[#a855f7]">
              3
            </div>
            <h2 className="text-base font-semibold text-white">Watch the Convolution</h2>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
            <ConvolutionVisualizer
              filter={selectedFilter}
              image={selectedImage}
              onOutputReady={handleOutputReady}
            />
            <FeatureMapDisplay outputGrid={outputGrid} filter={selectedFilter} />
          </div>
        </section>

        {/* Section: Layer Hierarchy */}
        <section className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-6 h-6 rounded-md bg-[#a855f7]/20 border border-[#a855f7]/30 flex items-center justify-center text-xs font-bold text-[#a855f7]">
              4
            </div>
            <h2 className="text-base font-semibold text-white">How Layers Stack</h2>
          </div>
          <LayerHierarchy onView={() => setHasViewedHierarchy(true)} />
        </section>

        {/* Insight card */}
        <div className="bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-[#d4af37] mb-2">Key Insight</h3>
          <p className="text-sm text-[#94a3b8] leading-relaxed">
            Real CNNs stack{" "}
            <span className="text-white font-semibold">10–100+ of these layers</span>. Early
            layers detect edges, middle layers detect shapes, and deep layers detect complex
            features like faces or cars. Each layer&apos;s output becomes the next layer&apos;s input —
            building from simple to abstract.
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
                  <svg className="w-4 h-4 text-[#3bb4a4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#3bb4a4] mb-1">
                    Guide Complete
                  </h3>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed">
                    You explored {exploredFilters.size} filters and saw how CNNs stack layers
                    to build from simple edges to complex concepts. This is the foundation of
                    modern computer vision.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-[#1e293b]">
          <Link
            href="/visual-guides/neural-network"
            className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white transition-colors"
          >
            <span>←</span>
            <span>What Is a Neural Network?</span>
          </Link>
          <Link
            href="/visual-guides"
            className="text-sm text-[#94a3b8] hover:text-white transition-colors"
          >
            All Guides
          </Link>
          <Link
            href="/visual-guides/pooling-layers"
            className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white transition-colors"
          >
            <span>Next: Pooling Layers: Shrinking Without Losing</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
