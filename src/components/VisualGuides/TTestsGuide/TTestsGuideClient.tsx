"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import type { ScenarioId } from "./types";
import OneSampleScenario from "./OneSampleScenario";
import IndependentSampleScenario from "./IndependentSampleScenario";
import PairedSampleScenario from "./PairedSampleScenario";
import ProportionTestSection from "./ProportionTestSection";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

// ── Tab config ─────────────────────────────────────────────────────────────────
const TABS: { id: ScenarioId; label: string; short: string }[] = [
  { id: "one-sample", label: "One-Sample t-Test", short: "One-Sample" },
  { id: "independent", label: "Independent Samples", short: "Independent" },
  { id: "paired", label: "Paired t-Test", short: "Paired" },
  { id: "proportion", label: "Proportion Test", short: "Proportion" },
];

export default function TTestsGuideClient() {
  const { data: session } = useSession();
  const [activeScenario, setActiveScenario] = useState<ScenarioId>("one-sample");

  const [completion, setCompletion] = useState({
    oneSampleRun: false,
    independentRun: false,
    pairedRun: false,
    assumptionsChecked: 0, // count of assumption checks done
    proportionRun: false,
  });

  const completionFired = useRef(false);

  // Compute progress: 5 criteria, 20% each
  const criteria = [
    completion.oneSampleRun,
    completion.independentRun,
    completion.pairedRun,
    completion.assumptionsChecked >= 1,
    completion.proportionRun,
  ];
  const completedCount = criteria.filter(Boolean).length;
  const progressPct = (completedCount / criteria.length) * 100;
  const allComplete = completedCount === criteria.length;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "t-tests-proportion-tests", score: 100 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  const mark = (key: keyof typeof completion, val?: boolean | number) => {
    setCompletion(prev => ({
      ...prev,
      [key]: val !== undefined ? val : true,
    }));
  };

  const incrementAssumptions = () => {
    setCompletion(prev => ({
      ...prev,
      assumptionsChecked: prev.assumptionsChecked + 1,
    }));
  };

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={allComplete} guideSlug="t-tests-proportion-tests" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <Link href="/visual-guides" className="hover:text-white transition-colors">Statistics</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">t-Tests &amp; Proportion Tests</span>
        </nav>

        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[10px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              Statistics &nbsp;|&nbsp; Unit 8: Comparing Groups
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mb-3 leading-tight">
            t-Tests &amp; Proportion Tests:{" "}
            <span className="text-[var(--color-accent)]">Comparing Two Groups</span>
          </h1>
          <p className="text-[14px] sm:text-[15px] text-[#94a3b8] leading-relaxed max-w-[680px]">
            Determine whether two groups differ significantly. Work through four
            real-world scenarios (one-sample, independent, paired, and proportion
            tests) with interactive data, assumption checks, and visual results.
          </p>
        </motion.section>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-[#475569]">
              Progress: {completedCount}/{criteria.length} tasks completed
            </p>
            <AnimatePresence>
              {allComplete && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[11px] font-semibold text-[#3bb4a4] flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Guide complete!
                </motion.span>
              )}
            </AnimatePresence>
            {!session?.user && (
              <p className="text-[11px] text-[#475569]">
                <Link href="/auth/sign-in" className="underline underline-offset-2 hover:text-[#94a3b8]">Sign in</Link>{" "}to save progress
              </p>
            )}
          </div>
          <div className="w-full h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[var(--color-accent)] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          {/* Criteria dots */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {[
              { label: "One-Sample run", done: completion.oneSampleRun },
              { label: "Independent run", done: completion.independentRun },
              { label: "Paired run", done: completion.pairedRun },
              { label: "Assumption checked", done: completion.assumptionsChecked >= 1 },
              { label: "Proportion run", done: completion.proportionRun },
            ].map(({ label, done }) => (
              <div key={label} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full transition-colors ${done ? "bg-[#3bb4a4]" : "bg-[#1e293b]"}`} />
                <span className={`text-[10px] ${done ? "text-white" : "text-[#475569]"}`}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scenario tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map(tab => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveScenario(tab.id)}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className={`px-4 py-2 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                activeScenario === tab.id
                  ? "bg-[var(--color-accent)] text-[#0a0e1a]"
                  : "bg-[#1e293b] text-white hover:bg-[#334155]"
              }`}
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="inline sm:hidden">{tab.short}</span>
              {/* Completion dot */}
              {(
                (tab.id === "one-sample" && completion.oneSampleRun) ||
                (tab.id === "independent" && completion.independentRun) ||
                (tab.id === "paired" && completion.pairedRun) ||
                (tab.id === "proportion" && completion.proportionRun)
              ) && (
                <span className={`ml-1.5 inline-block w-1.5 h-1.5 rounded-full ${activeScenario === tab.id ? "bg-[#0a0e1a]" : "bg-[#3bb4a4]"}`} />
              )}
            </motion.button>
          ))}
        </div>

        {/* Active scenario */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeScenario}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {activeScenario === "one-sample" && (
              <OneSampleScenario
                onTestRun={() => mark("oneSampleRun", true)}
                onAssumptionChecked={incrementAssumptions}
              />
            )}
            {activeScenario === "independent" && (
              <IndependentSampleScenario
                onTestRun={() => mark("independentRun", true)}
                onAssumptionChecked={incrementAssumptions}
              />
            )}
            {activeScenario === "paired" && (
              <PairedSampleScenario
                onTestRun={() => mark("pairedRun", true)}
              />
            )}
            {activeScenario === "proportion" && (
              <ProportionTestSection
                onTestRun={() => mark("proportionRun", true)}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Quick reference card */}
        <div className="mt-8 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-4">
            Quick Reference: When to Use Which Test
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                test: "One-Sample t",
                when: "Compare one group's mean to a known/target value",
                example: "Is avg output = 500?",
                color: "#1e5d8a",
              },
              {
                test: "Independent t",
                when: "Compare means of two separate, unrelated groups",
                example: "Campaign A vs. B?",
                color: "#3bb4a4",
              },
              {
                test: "Paired t",
                when: "Same subjects measured twice (before/after)",
                example: "Training effect?",
                color: "var(--color-accent)",
              },
              {
                test: "Proportion z",
                when: "Compare two proportions (binary outcomes)",
                example: "Conversion rate A vs. B?",
                color: "#94a3b8",
              },
            ].map(({ test, when, example, color }) => (
              <div key={test} className="rounded-xl border border-[#1e293b] p-3">
                <p className="text-[11px] font-semibold mb-1" style={{ color }}>{test}</p>
                <p className="text-[11px] text-[#94a3b8] leading-relaxed mb-1.5">{when}</p>
                <p className="text-[10px] font-mono text-[#475569] italic">e.g. {example}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer nav */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link
            href="/visual-guides/multiple-testing-false-discovery"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            &larr; Multiple Testing &amp; False Discovery
          </Link>
          <Link
            href="/visual-guides/anova-comparing-groups"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            ANOVA: Comparing Many Groups &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
