"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { MethodType } from "./data";
import Scatter2D from "./Scatter2D";
import MethodSelector from "./MethodSelector";
import ParameterSliders from "./ParameterSliders";
import ExplanationPanel from "./ExplanationPanel";
import DimensionInfo from "./DimensionInfo";

const DEFAULT_PARAMS: Record<MethodType, Record<string, number>> = {
  pca:  { components: 2 },
  tsne: { perplexity: 30, lr: 200 },
  umap: { neighbors: 15, min_dist: 0.1 },
};

export default function DimensionalityReductionClient() {
  const { data: session } = useSession();
  const [method, setMethod]         = useState<MethodType>("pca");
  const [hoveredDigit, setHoveredDigit] = useState<number | null>(null);
  const [params, setParams]         = useState(DEFAULT_PARAMS);
  const [explored, setExplored]     = useState<Set<MethodType>>(new Set(["pca"]));
  const [adjustedParams, setAdjustedParams] = useState(false);
  const completionFired = useRef(false);

  const allComplete = explored.size >= 3 && adjustedParams;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "dimensionality-reduction", score: 6 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  function handleMethodChange(m: MethodType) {
    setMethod(m);
    setExplored(prev => new Set([...prev, m]));
  }

  function handleParamChange(key: string, value: number) {
    setParams(prev => ({
      ...prev,
      [method]: { ...prev[method], [key]: value },
    }));
    setAdjustedParams(true);
  }

  const progress = [
    { label: "PCA explored",  done: explored.has("pca") },
    { label: "t-SNE explored", done: explored.has("tsne") },
    { label: "UMAP explored",  done: explored.has("umap") },
    { label: "Parameters adjusted", done: adjustedParams },
  ];

  return (
    <div className="min-h-screen pb-20">
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
            MNIST digits live in 784-dimensional space — one dimension per pixel.
            Watch how three algorithms compress that into 2D, and see which digits cluster together (and why).
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
                <span className="text-[11px] text-[#475569]">Hover points to highlight a digit class</span>
              </div>
              <Scatter2D
                method={method}
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
                values={params[method]}
                onChange={handleParamChange}
              />
            </div>
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <DimensionInfo method={method} />
            </div>
          </div>
        </div>

        {/* Footer nav */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link
            href="/visual-guides/correlation-causation"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            ← Previous Guide
          </Link>
          <Link
            href="/visual-guides"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            All Guides →
          </Link>
        </div>
      </div>
    </div>
  );
}
