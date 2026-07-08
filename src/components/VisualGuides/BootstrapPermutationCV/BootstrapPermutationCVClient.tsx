"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";
import BootstrapSection from "./BootstrapSection";
import PermutationTestSection from "./PermutationTestSection";
import CVSection from "./CVSection";
import LearningCurve from "./LearningCurve";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

export default function BootstrapPermutationCVClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();
  const completionFired = useRef(false);
  const [bootstrapDone, setBootstrapDone] = useState(false);
  const [permutationDone, setPermutationDone] = useState(false);
  const [cvDone, setCvDone] = useState(false);
  const [runKey, setRunKey] = useState(0);

  const isComplete = bootstrapDone && permutationDone && cvDone;

  const handleBootstrapDone = useCallback(() => setBootstrapDone(true), []);
  const handlePermutationDone = useCallback(() => setPermutationDone(true), []);
  const handleCvDone = useCallback(() => setCvDone(true), []);

  const handleReset = useCallback(() => {
    setBootstrapDone(false);
    setPermutationDone(false);
    setCvDone(false);
    setRunKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (isComplete && !completionFired.current) {
      completionFired.current = true;
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "bootstrap-permutation-cv", score: 100 }),
        }).catch(() => {});
      }
    }
  }, [isComplete, session?.user]);

  const progressItems = [
    { label: "Bootstrap CI", done: bootstrapDone },
    { label: "Permutation Test", done: permutationDone },
    { label: "Cross-Validation", done: cvDone },
  ];

  const doneCount = progressItems.filter((p) => p.done).length;
  const progressPct = (doneCount / 3) * 100;

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="bootstrap-permutation-cv" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#475569] mb-6">
          <Link href="/visual-guides" className="hover:text-[var(--color-accent)] transition-colors">
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-[#94a3b8]">Bootstrap, Permutation Tests &amp; Cross-Validation</span>
        </nav>

        {/* Hero */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              Unit 15 · Resampling &amp; Modern Methods
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Bootstrap, Permutation Tests{" "}
            <span className="text-[var(--color-accent)]">&amp; Cross-Validation</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-2xl">
            Master modern resampling methods: build confidence intervals without assuming a
            particular distribution, test significance by shuffling data, and evaluate models
            with K-fold cross-validation.
            Each demo animates live, so you can watch the distributions emerge.
          </p>
        </motion.div>

        {/* Progress tracker */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-8 rounded-2xl border border-[#1e293b] bg-[#0a0e1a] p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white">Guide Progress</span>
            <span className="text-sm text-[#94a3b8]">{doneCount} / 3 sections complete</span>
          </div>

          <div className="h-2 bg-[#1e293b] rounded-full overflow-hidden mb-4">
            <motion.div
              className="h-full bg-gradient-to-r from-[#1e5d8a] via-[#3bb4a4] to-[var(--color-accent)] rounded-full"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          <div className="flex flex-wrap gap-4">
            {progressItems.map(({ label, done }) => (
              <div key={label} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full transition-all duration-300"
                  style={{ background: done ? "#3bb4a4" : "#1e293b", border: done ? "none" : "1px solid #334155" }}
                />
                <span className={`text-xs ${done ? "text-white font-semibold" : "text-[#475569]"}`}>
                  {label}
                </span>
                {done && (
                  <svg className="w-3.5 h-3.5 text-[#3bb4a4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            ))}
          </div>

          {!session?.user && (
            <p className="mt-3 text-xs text-[#475569]">
              <Link href="/auth/sign-in" className="text-[var(--color-accent)] hover:underline">
                Sign in
              </Link>{" "}
              to save your progress.
            </p>
          )}
        </motion.div>

        {/* Sections */}
        <div key={runKey} className="flex flex-col gap-8">
          <BootstrapSection onBootstrapDone={handleBootstrapDone} />
          <PermutationTestSection onPermutationDone={handlePermutationDone} />
          <CVSection onCvDone={handleCvDone} />
          <LearningCurve />
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
                <h2 className="text-2xl font-extrabold tracking-tight text-white">Resampling Mastered!</h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You ran all three resampling techniques from start to finish.
                </p>
              </div>

              <div className="px-6 py-5">
                <p className="text-[13px] text-[#94a3b8] leading-relaxed mb-4">
                  You built a bootstrap confidence interval without distributional assumptions,
                  tested significance by shuffling group labels, and estimated generalization
                  error with K-fold cross-validation.
                </p>
                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">Key Takeaway</p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;When you cannot trust a formula&apos;s assumptions, let the data
                    resample itself: the computer does the distribution theory for you.&quot;
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-3">
                <Link href="/visual-guides"
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors">
                  ← All Guides
                </Link>
                <div className="flex items-center gap-3">
                  <button onClick={handleReset}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors">
                    Try Again
                  </button>
                  <Link href="/visual-guides/cross-validation"
                    className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
                    Next Guide →
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer nav */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link
            href="/visual-guides"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            ← All Guides
          </Link>
          <Link
            href="/visual-guides/cross-validation"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            Next Guide →
          </Link>
        </div>
      </div>
    </div>
  );
}
