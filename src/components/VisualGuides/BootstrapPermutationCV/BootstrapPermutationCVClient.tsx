"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import BootstrapSection from "./BootstrapSection";
import PermutationTestSection from "./PermutationTestSection";
import CVSection from "./CVSection";
import LearningCurve from "./LearningCurve";

export default function BootstrapPermutationCVClient() {
  const { data: session } = useSession();
  const completionFired = useRef(false);
  const [bootstrapDone, setBootstrapDone] = useState(false);
  const [permutationDone, setPermutationDone] = useState(false);
  const [cvDone, setCvDone] = useState(false);

  const isComplete = bootstrapDone && permutationDone && cvDone;

  const handleBootstrapDone = useCallback(() => setBootstrapDone(true), []);
  const handlePermutationDone = useCallback(() => setPermutationDone(true), []);
  const handleCvDone = useCallback(() => setCvDone(true), []);

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
    <div className="min-h-screen bg-[#0f172a] text-white">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-white">Bootstrap, Permutation Tests &amp; Cross-Validation</span>
        </nav>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[#d4af37]" />
            <span className="text-xs font-semibold uppercase tracking-[2.5px] text-[#d4af37]">
              Unit 15 · Resampling &amp; Modern Methods
            </span>
            <span className="w-6 h-px bg-[#d4af37]" />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mb-3">
            Bootstrap, Permutation Tests{" "}
            <span className="text-[#3bb4a4]">&amp; Cross-Validation</span>
          </h1>
          <p className="text-[#94a3b8] text-base max-w-2xl leading-relaxed">
            Master modern resampling methods: build confidence intervals without distributional assumptions,
            test significance by shuffling data, and evaluate models with K-fold cross-validation.
            Each demo animates live — watch the distributions emerge.
          </p>
        </motion.div>

        {/* Progress tracker */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-8 rounded-2xl border border-[#1e293b] bg-[#0a0e1a] p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white">Guide Progress</span>
            <span className="text-sm text-[#94a3b8]">{doneCount} / 3 sections complete</span>
          </div>

          <div className="h-2 bg-[#1e293b] rounded-full overflow-hidden mb-4">
            <motion.div
              className="h-full bg-gradient-to-r from-[#1e5d8a] via-[#3bb4a4] to-[#d4af37] rounded-full"
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
              <Link href="/auth/sign-in" className="text-[#d4af37] hover:underline">
                Sign in
              </Link>{" "}
              to save your progress.
            </p>
          )}
        </motion.div>

        {/* Sections */}
        <div className="flex flex-col gap-8">
          <BootstrapSection onBootstrapDone={handleBootstrapDone} />
          <PermutationTestSection onPermutationDone={handlePermutationDone} />
          <CVSection onCvDone={handleCvDone} />
          <LearningCurve />
        </div>

        {/* Completion message */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
              className="mt-8 rounded-2xl border border-[#d4af37]/40 bg-gradient-to-br from-[#d4af37]/10 to-[#3bb4a4]/10 p-8 text-center"
            >
              <div className="text-4xl mb-3">🎉</div>
              <h2 className="text-2xl font-black text-white mb-2">Statistics Mastered!</h2>
              <p className="text-[#94a3b8] text-base max-w-lg mx-auto">
                You&apos;ve completed all three resampling techniques. You&apos;re now ready for
                Machine Learning — you understand how to estimate uncertainty, test hypotheses without
                assumptions, and evaluate models robustly.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <svg className="w-5 h-5 text-[#d4af37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[#d4af37] font-semibold">Progress saved!</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-[#1e293b]">
          <Link
            href="/visual-guides/bias-variance"
            className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white transition-colors px-4 py-2 rounded-xl border border-[#1e293b] hover:border-[#334155]"
          >
            <span>←</span>
            <span>Bias-Variance</span>
          </Link>
          <Link
            href="/visual-guides"
            className="text-sm text-[#94a3b8] hover:text-white transition-colors"
          >
            All Guides
          </Link>
          <Link
            href="/visual-guides/cross-validation"
            className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white transition-colors px-4 py-2 rounded-xl border border-[#1e293b] hover:border-[#334155]"
          >
            <span>Cross-Validation</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
