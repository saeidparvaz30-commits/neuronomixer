"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";
import type { BiasType } from "./types";
import { CASE_STUDIES } from "./types";
import CaseStudyNavigation from "./CaseStudyNavigation";
import CaseStudyCard from "./CaseStudyCard";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

const NEXT_GUIDE_SLUG = "math-for-statistics";

export default function SourcesOfBiasClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();
  const completionFired = useRef(false);

  const [currentCase, setCurrentCase] = useState<BiasType>("survivorship");
  const [revealed, setRevealed] = useState<Set<BiasType>>(new Set());
  const [visitedCases, setVisitedCases] = useState<Set<BiasType>>(new Set(["survivorship"]));

  // Completion: all 5 visited + at least 3 revealed
  const allVisited = visitedCases.size === 5;
  const atLeastThreeRevealed = revealed.size >= 3;
  const allComplete = allVisited && atLeastThreeRevealed;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "sources-of-bias", score: 100 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  function handleCaseChange(id: BiasType) {
    setCurrentCase(id);
    setVisitedCases((prev) => new Set([...prev, id]));
  }

  function handleReveal(id: BiasType) {
    setRevealed((prev) => new Set([...prev, id]));
  }

  function handleReset() {
    setCurrentCase("survivorship");
    setRevealed(new Set());
    setVisitedCases(new Set(["survivorship"]));
  }

  const currentStudy = CASE_STUDIES.find((c) => c.id === currentCase)!;

  const progress = [
    { label: `Cases visited: ${visitedCases.size}/5`, done: allVisited },
    { label: `Biases revealed: ${revealed.size}/3`, done: atLeastThreeRevealed },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={allComplete} guideSlug="sources-of-bias" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Sources of Bias</span>
        </nav>

        {/* Hero */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">Statistics</span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Sources of Bias:{" "}
            <span className="text-[var(--color-accent)]">Selection, Survivorship & Beyond</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[680px] mb-4">
            Data tells a story, but which story? Explore five real-world cases where hidden biases distort conclusions. Learn to spot the traps.
          </p>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed max-w-[680px]">
            Bias is not about intentional deception; it is about how data is collected, who responds, what survives to observation, and what questions we choose to ask. Each case below hides a different type of bias.
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

        {/* Navigation */}
        <div className="mb-6">
          <CaseStudyNavigation
            cases={CASE_STUDIES}
            current={currentCase}
            visited={visitedCases}
            revealed={revealed}
            onChange={handleCaseChange}
          />
        </div>

        {/* Case content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCase}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <CaseStudyCard
              study={currentStudy}
              revealed={revealed.has(currentCase)}
              onReveal={() => handleReveal(currentCase)}
            />
          </motion.div>
        </AnimatePresence>

        {/* Bias type summary */}
        <div className="mt-8 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-4">Bias Types at a Glance</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CASE_STUDIES.map((c) => (
              <button
                key={c.id}
                onClick={() => handleCaseChange(c.id)}
                className={`text-left p-3 rounded-xl border transition-all ${
                  currentCase === c.id
                    ? "border-[#d4af37]/50 bg-[#d4af37]/5"
                    : "border-[#1e293b] hover:border-[#334155]"
                }`}
              >
                <span
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: c.biasColor }}
                >
                  {c.biasLabel}
                </span>
                <p className="text-[11px] text-[#94a3b8] mt-0.5 leading-tight">{c.title}</p>
              </button>
            ))}
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
                  You Named the Hidden Biases
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You worked through five real cases and uncovered the
                  collection flaw that quietly bent each conclusion.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Case studies visited
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {visitedCases.size} of {CASE_STUDIES.length}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      one bias type per case
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Biases revealed
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {revealed.size} of {CASE_STUDIES.length}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      hidden mechanisms uncovered
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Last case studied
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {currentStudy.biasLabel}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      {currentStudy.title}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Bias rarely announces itself: it hides in who was
                    asked, who answered, and what survived long enough to be
                    measured, so interrogate the collection story before you
                    trust the conclusion.&quot;
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
        {!allComplete && (
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
            <Link
              href="/visual-guides/types-of-data-measurement-scales"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
            >
              ← Previous: Types of Data
            </Link>
            <Link
              href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
            >
              Next: Math for Statistics: The Visual Toolkit →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
