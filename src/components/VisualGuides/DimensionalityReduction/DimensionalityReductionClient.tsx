"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";
import { MethodType } from "./data";
import { DIGIT_PIXELS, DIGIT_LABELS, N_POINTS, TSNE_EMBEDDINGS, UMAP_EMBEDDINGS } from "./digitsDataset";
import { computePca, addGaussianNoise } from "./pca";
import Scatter2D, { ScatterPoint } from "./Scatter2D";
import MethodSelector from "./MethodSelector";
import ParameterSliders, { PcaParams, PC_PAIRS } from "./ParameterSliders";
import ExplanationPanel from "./ExplanationPanel";
import DimensionInfo from "./DimensionInfo";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

const NOISE_SEED = 42;

export default function DimensionalityReductionClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();
  const [method, setMethod] = useState<MethodType>("pca");
  const [hoveredDigit, setHoveredDigit] = useState<number | null>(null);
  const [pcaParams, setPcaParams] = useState<PcaParams>({ nPoints: N_POINTS, noiseSigma: 0, pairIndex: 0 });
  const [tsnePerplexity, setTsnePerplexity] = useState(30);
  const [umapNeighbors, setUmapNeighbors] = useState(15);
  const [explored, setExplored] = useState<Set<MethodType>>(new Set(["pca"]));
  const [adjustedParams, setAdjustedParams] = useState(false);
  const completionFired = useRef(false);

  // Real PCA, recomputed in the browser whenever the inputs change.
  // The dataset is interleaved round-robin by class, so a prefix slice stays balanced.
  const pcaResult = useMemo(() => {
    const rows = DIGIT_PIXELS.slice(0, pcaParams.nPoints);
    const inputs = addGaussianNoise(rows, pcaParams.noiseSigma, NOISE_SEED);
    return computePca(inputs, 3);
  }, [pcaParams.nPoints, pcaParams.noiseSigma]);

  const { points, xLabel, yLabel } = useMemo((): {
    points: ScatterPoint[]; xLabel: string; yLabel: string;
  } => {
    if (method === "pca") {
      const [a, b] = PC_PAIRS[pcaParams.pairIndex];
      const pct = (i: number) => (pcaResult.explainedRatio[i] * 100).toFixed(1);
      return {
        points: pcaResult.projection.map((p, i) => ({ x: p[a], y: p[b], digit: DIGIT_LABELS[i] })),
        xLabel: `PC${a + 1} (${pct(a)}% of variance)`,
        yLabel: `PC${b + 1} (${pct(b)}% of variance)`,
      };
    }
    if (method === "tsne") {
      return {
        points: TSNE_EMBEDDINGS[tsnePerplexity].map(([x, y], i) => ({ x, y, digit: DIGIT_LABELS[i] })),
        xLabel: "t-SNE dimension 1 (arbitrary units)",
        yLabel: "t-SNE dimension 2 (arbitrary units)",
      };
    }
    return {
      points: UMAP_EMBEDDINGS[umapNeighbors].map(([x, y], i) => ({ x, y, digit: DIGIT_LABELS[i] })),
      xLabel: "UMAP dimension 1 (arbitrary units)",
      yLabel: "UMAP dimension 2 (arbitrary units)",
    };
  }, [method, pcaParams.pairIndex, pcaResult, tsnePerplexity, umapNeighbors]);

  const allComplete = explored.size >= 3 && adjustedParams;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "dimensionality-reduction", score: 100 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  function handleMethodChange(m: MethodType) {
    setMethod(m);
    setExplored(prev => new Set([...prev, m]));
  }

  function handlePcaParams(patch: Partial<PcaParams>) {
    setPcaParams(prev => ({ ...prev, ...patch }));
    setAdjustedParams(true);
  }

  function handleTsnePerplexity(v: number) {
    setTsnePerplexity(v);
    setAdjustedParams(true);
  }

  function handleUmapNeighbors(v: number) {
    setUmapNeighbors(v);
    setAdjustedParams(true);
  }

  function handleReset() {
    setMethod("pca");
    setHoveredDigit(null);
    setPcaParams({ nPoints: N_POINTS, noiseSigma: 0, pairIndex: 0 });
    setTsnePerplexity(30);
    setUmapNeighbors(15);
    setExplored(new Set(["pca"]));
    setAdjustedParams(false);
  }

  const progress = [
    { label: "PCA explored",  done: explored.has("pca") },
    { label: "t-SNE explored", done: explored.has("tsne") },
    { label: "UMAP explored",  done: explored.has("umap") },
    { label: "Parameters adjusted", done: adjustedParams },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={allComplete} guideSlug="dimensionality-reduction" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Dimensionality Reduction</span>
        </nav>

        {/* Hero */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              Machine Learning
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Dimensionality Reduction:{" "}
            <span className="text-[var(--color-accent)]">PCA, t-SNE & UMAP</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[620px]">
            Every point below is a real handwritten digit from scikit-learn&apos;s 8×8 digits
            dataset: 64 pixel values, so a point in 64-dimensional space. The PCA view is
            computed live in your browser; the t-SNE and UMAP views are real embeddings of the
            same digits, precomputed offline. See which digits cluster together, and why the
            three methods disagree.
          </p>
        </section>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {progress.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full transition-colors ${done ? "bg-[#3bb4a4]" : "bg-[#1e293b]"}`} />
              <span className={`text-[11px] ${done ? "text-white" : "text-[#475569]"}`}>{label}</span>
            </div>
          ))}
          {!session?.user && (
            <p className="text-[11px] text-[#475569] ml-auto">
              <Link href="/auth/sign-in" className="underline underline-offset-2 hover:text-[#94a3b8]">Sign in</Link>{" "}to track progress
            </p>
          )}
          <AnimatePresence>
            {allComplete && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="ml-auto text-[11px] font-semibold text-[#3bb4a4] flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

          {/* Left: scatter + method selector */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <MethodSelector method={method} onChange={handleMethodChange} />
                <span className="text-[11px] text-[#475569]">Tap or hover points to highlight a digit class</span>
              </div>
              <Scatter2D
                points={points}
                xLabel={xLabel}
                yLabel={yLabel}
                hoveredDigit={hoveredDigit}
                onHoverDigit={setHoveredDigit}
              />
            </div>

            {/* Explanation panel */}
            <ExplanationPanel method={method} />
          </div>

          {/* Right: sliders + info */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <ParameterSliders
                method={method}
                pcaParams={pcaParams}
                onPcaParams={handlePcaParams}
                tsnePerplexity={tsnePerplexity}
                onTsnePerplexity={handleTsnePerplexity}
                umapNeighbors={umapNeighbors}
                onUmapNeighbors={handleUmapNeighbors}
                explainedRatio={pcaResult.explainedRatio}
              />
            </div>
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <DimensionInfo method={method} explainedRatio={pcaResult.explainedRatio} pairIndex={pcaParams.pairIndex} />
            </div>
          </div>
        </div>

        {/* Completion card */}
        <AnimatePresence>
          {allComplete && (
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
                  You Flattened 64 Dimensions
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You projected real handwritten digits through PCA, t-SNE, and
                  UMAP, tuned their parameters, and watched the same data tell
                  three different stories.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Methods explored</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {explored.size} of 3
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">PCA, t-SNE, UMAP</p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Digits projected</p>
                    <p className="text-[14px] font-mono font-bold text-[#3bb4a4]">
                      {pcaParams.nPoints}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      each a 64-dimensional point
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">PC1 + PC2 variance</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {((pcaResult.explainedRatio[0] + pcaResult.explainedRatio[1]) * 100).toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">in your final PCA run</p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Every 2D picture of high-dimensional data throws
                    information away; PCA preserves global variance while t-SNE
                    and UMAP preserve neighborhoods, so pick the method that
                    keeps what your question needs.&quot;
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
                    href="/visual-guides/data-pipeline"
                    className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
                  >
                    Next Guide →
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer nav */}
        {!allComplete && (
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
            <Link
              href="/visual-guides/correlation-causation"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
            >
              ← Previous Guide
            </Link>
            <Link
              href="/visual-guides/data-pipeline"
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
            >
              Next: Data Pipeline →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
