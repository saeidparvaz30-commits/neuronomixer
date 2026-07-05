"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import CurseOfDimensionality from "./CurseOfDimensionality";
import PCAVisualizer from "./PCAVisualizer";
import FeatureScalingDemo from "./FeatureScalingDemo";
import DistanceMeasures from "./DistanceMeasures";
import ClusteringPreview from "./ClusteringPreview";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

export default function MultivariateThinkingClient() {
  const { data: session } = useSession();
  const completionFired = useRef(false);

  const [exploredHighDim, setExploredHighDim] = useState(false);
  const [pcaViewed, setPcaViewed] = useState(false);
  const [scalingExplored, setScalingExplored] = useState(false);

  const isComplete = exploredHighDim && pcaViewed && scalingExplored;

  useEffect(() => {
    if (isComplete && !completionFired.current) {
      completionFired.current = true;
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "multivariate-thinking", score: 100 }),
        }).catch(() => {});
      }
    }
  }, [isComplete, session?.user]);

  const handleHighDimExplored = useCallback(() => {
    setExploredHighDim(true);
  }, []);

  const handlePcaViewed = useCallback(() => {
    setPcaViewed(true);
  }, []);

  const handleScalingExplored = useCallback(() => {
    setScalingExplored(true);
  }, []);

  function handleReset() {
    setExploredHighDim(false);
    setPcaViewed(false);
    setScalingExplored(false);
    completionFired.current = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const progress = [
    { label: "High-dim explored", done: exploredHighDim, color: "#ef4444" },
    { label: "PCA viewed", done: pcaViewed, color: "#d4af37" },
    { label: "Scaling compared", done: scalingExplored, color: "#3bb4a4" },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="multivariate-thinking" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Hero */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              Machine Learning
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Multivariate Thinking &amp;{" "}
            <span className="text-[var(--color-accent)]">the Curse of Dimensionality</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[620px]">
            Understand why high-dimensional data is fundamentally different. Explore how distances lose
            meaning, how PCA reveals structure, and why feature scaling matters for ML algorithms.
          </p>
        </section>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {progress.map(({ label, done, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full transition-colors"
                style={{ background: done ? color : "#1e293b" }}
              />
              <span className={`text-[11px] ${done ? "text-white" : "text-[#475569]"}`}>
                {label}
              </span>
            </div>
          ))}
          {!session?.user && (
            <p className="text-[11px] text-[#475569] ml-auto">
              <Link href="/auth/sign-in" className="underline underline-offset-2 hover:text-[#94a3b8]">
                Sign in
              </Link>{" "}
              to track progress
            </p>
          )}
          <AnimatePresence>
            {isComplete && (
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

        {/* Intro card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6 mb-6"
        >
          <h2 className="text-lg font-bold text-white mb-3">Why High Dimensions Are Different</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="rounded-xl bg-[#1e293b]/50 border border-[#1e293b] p-4">
              <div className="w-8 h-8 rounded-lg bg-[#ef4444]/15 border border-[#ef4444]/25 flex items-center justify-center mb-2">
                <svg className="w-4 h-4 text-[#ef4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-white mb-1">Space Grows Exponentially</p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Split each axis into just 10 bins and a d-dimensional grid has 10ᵈ cells to fill,
                while the ball inscribed in the unit cube shrinks toward zero volume. Data becomes
                exponentially sparse.
              </p>
            </div>
            <div className="rounded-xl bg-[#1e293b]/50 border border-[#1e293b] p-4">
              <div className="w-8 h-8 rounded-lg bg-[#d4af37]/15 border border-[#d4af37]/25 flex items-center justify-center mb-2">
                <svg className="w-4 h-4 text-[#d4af37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-white mb-1">Distances Lose Meaning</p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                As dimensions grow, the ratio of max-to-min pairwise distance approaches 1.
                All points become &ldquo;equidistant&rdquo; — KNN breaks down.
              </p>
            </div>
            <div className="rounded-xl bg-[#1e293b]/50 border border-[#1e293b] p-4">
              <div className="w-8 h-8 rounded-lg bg-[#3bb4a4]/15 border border-[#3bb4a4]/25 flex items-center justify-center mb-2">
                <svg className="w-4 h-4 text-[#3bb4a4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-white mb-1">Data Requirements Explode</p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                To maintain the same density, you need exponentially more samples.
                100 points in 2D becomes meaningless in 20D — you&apos;d need 10²⁰ samples.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-[#1e5d8a]/30 bg-[#1e5d8a]/10 p-3">
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              <span className="font-semibold text-white">The solution toolkit:</span>{" "}
              Dimensionality reduction (PCA, t-SNE, UMAP), feature selection, regularization, and
              understanding which algorithms are robust to high dimensions.
            </p>
          </div>
        </motion.div>

        {/* Guide sections */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <CurseOfDimensionality onHighDimExplored={handleHighDimExplored} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <PCAVisualizer onPcaViewed={handlePcaViewed} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <FeatureScalingDemo onScalingExplored={handleScalingExplored} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            <DistanceMeasures />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <ClusteringPreview />
          </motion.div>
        </div>

        {/* Completion card */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.65 }}
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
                  You&apos;ve mastered multivariate thinking!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You explored the curse of dimensionality, understood PCA, and learned when scaling matters.
                </p>
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#ef4444]/25 bg-[#ef4444]/5 p-3">
                    <p className="text-[11px] font-semibold text-[#ef4444] mb-1">Curse of Dimensionality</p>
                    <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                      Unit ball volume shrinks to 0. Distances become meaningless. Exponential data requirements.
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#d4af37]/25 bg-[#d4af37]/5 p-3">
                    <p className="text-[11px] font-semibold text-[#d4af37] mb-1">PCA</p>
                    <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                      Eigendecomposition of the covariance matrix reveals directions of maximum variance.
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#3bb4a4]/25 bg-[#3bb4a4]/5 p-3">
                    <p className="text-[11px] font-semibold text-[#3bb4a4] mb-1">Feature Scaling</p>
                    <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                      Z-score standardization ensures no single feature dominates distance calculations.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[#d4af37] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[#d4af37] mb-1.5 uppercase tracking-wide">Key Takeaway</p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;In high dimensions, our intuition from 2D and 3D space completely fails.
                    The geometry of data changes — distances concentrate, volumes vanish, and sparsity dominates.
                    Every ML practitioner must understand these effects to choose the right algorithms and preprocessing.&quot;
                  </p>
                </div>
              </div>

              {/* Footer */}
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
                    href="/visual-guides/regression-to-mean"
                    className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
                  >
                    Next Guide →
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
