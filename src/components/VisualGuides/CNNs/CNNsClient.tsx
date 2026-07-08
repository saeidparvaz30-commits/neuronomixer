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
import { useGuideMotion } from "@/lib/guideMotion";

const GUIDE_TITLE = "CNNs: See What Filters See";
const NEXT_GUIDE_SLUG = "pooling-layers";
const PREV_GUIDE_SLUG = "neural-network";

export default function CNNsClient() {
  const { data: session } = useSession();
  const { fadeUp, fadeIn, card } = useGuideMotion();
  const completionFired = useRef(false);

  const [selectedFilterId, setSelectedFilterId] = useState<FilterId>("edge-h");
  const [selectedImageId, setSelectedImageId] = useState<SampleImageId>("checkerboard");
  const [exploredFilters, setExploredFilters] = useState<Set<FilterId>>(new Set(["edge-h"]));
  const [hasViewedHierarchy, setHasViewedHierarchy] = useState(false);
  const [outputGrid, setOutputGrid] = useState<number[][]>([]);
  const [rawOutputGrid, setRawOutputGrid] = useState<number[][]>([]);

  const selectedFilter = FILTERS.find((f) => f.id === selectedFilterId)!;
  const selectedImage = SAMPLE_IMAGES.find((img) => img.id === selectedImageId)!;

  function handleFilterSelect(id: FilterId) {
    setSelectedFilterId(id);
    setExploredFilters((prev) => new Set([...prev, id]));
  }

  const handleOutputReady = useCallback((display: number[][], raw: number[][]) => {
    setOutputGrid(display);
    setRawOutputGrid(raw);
  }, []);

  function handleReset() {
    setSelectedFilterId("edge-h");
    setSelectedImageId("checkerboard");
    setExploredFilters(new Set(["edge-h"]));
    setHasViewedHierarchy(false);
    completionFired.current = false;
  }

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
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="cnns" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#475569] mb-6">
          <Link href="/visual-guides" className="hover:text-[var(--color-accent)] transition-colors">
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
            CNNs: <span className="text-[var(--color-accent)]">See What Filters See</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Watch convolutional filters slide across images and produce feature maps. Explore
            edge detection, sharpening, and blur kernels: the same operations that power
            image recognition models.
          </motion.p>
        </section>

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
                variants={fadeIn}
                initial="hidden"
                animate="visible"
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
            <FeatureMapDisplay
              outputGrid={outputGrid}
              rawGrid={rawOutputGrid}
              filter={selectedFilter}
            />
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
          <h3 className="text-sm font-semibold text-[var(--color-accent)] mb-2">Key Insight</h3>
          <p className="text-sm text-[#94a3b8] leading-relaxed">
            Real CNNs stack{" "}
            <span className="text-white font-semibold">10–100+ of these layers</span>. Early
            layers detect edges, middle layers detect shapes, and deep layers detect complex
            features like faces or cars. Each layer&apos;s output becomes the next layer&apos;s
            input, building from simple to abstract.
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
              <div className="px-6 pt-6 pb-4 border-b border-white/[0.07]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-px bg-[var(--color-accent)]" />
                  <span className="text-[10px] font-semibold uppercase tracking-[2px] text-[var(--color-accent)]">
                    Guide Complete
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">
                  Filters Decoded!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You watched convolution kernels slide across images and turn raw pixels into feature maps.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Filters explored", value: `${exploredFilters.size} / 6`, color: "#3bb4a4" },
                    { label: "Layer hierarchy", value: "Viewed", color: "#a855f7" },
                    { label: "Core operation", value: "Convolution", color: "var(--color-accent)" },
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
                    &quot;A CNN never sees a face or a car. It sees edges that become shapes that become concepts, one stacked filter at a time.&quot;
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
              href={`/visual-guides/${PREV_GUIDE_SLUG}`}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
            >
              ← Previous Guide
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
