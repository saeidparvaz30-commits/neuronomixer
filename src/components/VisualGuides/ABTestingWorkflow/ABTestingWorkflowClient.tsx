"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

import {
  Phase1State,
  Phase2State,
  Phase3State,
  computeSampleSize,
  SIMULATED_COVARIATES,
} from "./types";
import Phase1Design from "./Phase1Design";
import Phase2Randomize from "./Phase2Randomize";
import Phase3Collect from "./Phase3Collect";
import Phase4Analyze from "./Phase4Analyze";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

type PhaseNum = 1 | 2 | 3 | 4;

const TOTAL_EXPERIMENT_DAYS = 14;

function buildInitialPhase1(): Phase1State {
  const p: Phase1State = {
    hypothesis: {
      h0: "",
      h1: "",
      direction: "two-tailed",
    },
    metric: {
      name: "Conversion Rate",
      baselineRate: 0.05,
    },
    parameters: {
      alpha: 0.05,
      power: 0.80,
      mde: 0.02,
    },
    sampleSize: 0,
  };
  p.sampleSize = computeSampleSize(
    p.metric.baselineRate,
    p.parameters.mde,
    p.parameters.alpha,
    p.parameters.power,
    p.hypothesis.direction
  );
  return p;
}

function buildPhase2FromPhase1(phase1: Phase1State): Phase2State {
  const n = phase1.sampleSize;
  return {
    randomizationMethod: "simple",
    controlSize: n,
    treatmentSize: n,
    covariates: SIMULATED_COVARIATES,
  };
}

function buildPhase3FromPhase1(phase1: Phase1State): Phase3State {
  const n = phase1.sampleSize;
  return {
    elapsedDays: 0,
    totalDays: TOTAL_EXPERIMENT_DAYS,
    controlConversions: 0,
    treatmentConversions: 0,
    controlN: n,
    treatmentN: n,
    isPaused: false,
    isComplete: false,
    history: [],
  };
}

export default function ABTestingWorkflowClient() {
  const { data: session } = useSession();
  const completionFired = useRef(false);
  const [isComplete, setIsComplete] = useState(false);

  const [currentPhase, setCurrentPhase] = useState<PhaseNum>(1);
  const [reachedPhase, setReachedPhase] = useState<PhaseNum>(1);

  const [phase1, setPhase1] = useState<Phase1State>(buildInitialPhase1);
  const [phase2, setPhase2] = useState<Phase2State>(() => buildPhase2FromPhase1(buildInitialPhase1()));
  const [phase3, setPhase3] = useState<Phase3State>(() => buildPhase3FromPhase1(buildInitialPhase1()));

  // Update phase 2 and 3 whenever phase 1 sample size changes
  function handlePhase1Change(s: Phase1State) {
    setPhase1(s);
    setPhase2(buildPhase2FromPhase1(s));
    // Only reset phase3 if we haven't started collecting yet
    if (reachedPhase < 3) {
      setPhase3(buildPhase3FromPhase1(s));
    }
  }

  // Track completion
  useEffect(() => {
    if (isComplete && !completionFired.current) {
      completionFired.current = true;
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "ab-testing-workflow", score: 100 }),
        }).catch(() => {});
      }
    }
  }, [isComplete, session?.user]);

  function goToPhase(n: PhaseNum) {
    if (n <= reachedPhase) {
      setCurrentPhase(n);
    }
  }

  function advanceToPhase(n: PhaseNum) {
    setCurrentPhase(n);
    if (n > reachedPhase) {
      setReachedPhase(n);
    }
    if (n === 4 && !isComplete) {
      setIsComplete(true);
    }
  }

  const phases: { num: PhaseNum; label: string; shortLabel: string }[] = [
    { num: 1, label: "Design", shortLabel: "Design" },
    { num: 2, label: "Randomize", shortLabel: "Randomize" },
    { num: 3, label: "Collect", shortLabel: "Collect" },
    { num: 4, label: "Analyze", shortLabel: "Analyze" },
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-white pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="ab-testing-workflow" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white">A/B Testing: The Complete Workflow</span>
        </nav>

        {/* Hero */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[#d4af37]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#d4af37]">
              Experimentation
            </span>
            <span className="w-6 h-px bg-[#d4af37]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            A/B Testing:{" "}
            <span className="text-[#d4af37]">The Complete Workflow</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[640px]">
            Walk through every stage of a rigorous A/B test — from power-based
            sample-size calculation to randomization, live data collection, and
            statistical analysis with a full hypothesis test.
          </p>

          {/* Progress indicator */}
          <div className="flex items-center gap-3 mt-5 flex-wrap">
            {!session?.user && (
              <p className="text-[11px] text-[#475569]">
                <Link
                  href="/auth/sign-in"
                  className="underline underline-offset-2 hover:text-[#94a3b8]"
                >
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
                  className="text-[11px] font-semibold text-[#3bb4a4] flex items-center gap-1"
                >
                  <svg
                    className="w-3.5 h-3.5"
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
                  Guide complete!
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </motion.section>

        {/* Phase selector */}
        <div className="flex items-stretch gap-0 mb-8 rounded-2xl border border-[#1e293b] overflow-hidden">
          {phases.map(({ num, label }, idx) => {
            const isActive = currentPhase === num;
            const isDone = reachedPhase > num;
            const isReached = num <= reachedPhase;

            return (
              <React.Fragment key={num}>
                <button
                  onClick={() => goToPhase(num)}
                  disabled={!isReached}
                  className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 py-3 px-2 sm:px-4 text-center transition-all ${
                    isActive
                      ? "bg-[#1e293b]"
                      : isReached
                      ? "bg-[#0f172a] hover:bg-[#1e293b]/60"
                      : "bg-[#0f172a] opacity-40 cursor-not-allowed"
                  }`}
                >
                  {/* Step circle */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-colors ${
                      isActive
                        ? "bg-[#d4af37] text-[#0a0e1a]"
                        : isDone
                        ? "bg-[#3bb4a4] text-[#0a0e1a]"
                        : "bg-[#1e293b] text-[#94a3b8]"
                    }`}
                  >
                    {isDone ? (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      num
                    )}
                  </div>
                  <span
                    className={`text-[12px] font-semibold ${
                      isActive
                        ? "text-[#d4af37]"
                        : isDone
                        ? "text-[#3bb4a4]"
                        : isReached
                        ? "text-white"
                        : "text-[#475569]"
                    }`}
                  >
                    {label}
                  </span>
                </button>
                {idx < phases.length - 1 && (
                  <div className="flex items-center px-0 bg-[#0f172a]">
                    <svg className="w-4 h-4 text-[#1e293b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Phase content */}
        <AnimatePresence mode="wait">
          {currentPhase === 1 && (
            <motion.div
              key="phase1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Phase1Design
                state={phase1}
                onChange={handlePhase1Change}
                onNext={() => advanceToPhase(2)}
              />
            </motion.div>
          )}
          {currentPhase === 2 && (
            <motion.div
              key="phase2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Phase2Randomize
                state={phase2}
                onChange={setPhase2}
                onNext={() => advanceToPhase(3)}
                onBack={() => goToPhase(1)}
              />
            </motion.div>
          )}
          {currentPhase === 3 && (
            <motion.div
              key="phase3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Phase3Collect
                state={phase3}
                baselineRate={phase1.metric.baselineRate}
                mde={phase1.parameters.mde}
                onStateChange={setPhase3}
                onNext={() => advanceToPhase(4)}
                onBack={() => goToPhase(2)}
              />
            </motion.div>
          )}
          {currentPhase === 4 && (
            <motion.div
              key="phase4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Phase4Analyze
                controlConversions={phase3.controlConversions}
                treatmentConversions={phase3.treatmentConversions}
                controlN={phase3.controlN}
                treatmentN={phase3.treatmentN}
                alpha={phase1.parameters.alpha}
                baselineRate={phase1.metric.baselineRate}
                mde={phase1.parameters.mde}
                direction={phase1.hypothesis.direction}
                onBack={() => goToPhase(3)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Concept cards (always shown) */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-10">
          {[
            {
              title: "Type I Error (α)",
              body: "Rejecting a true null — a false positive. You choose α before the test.",
              color: "#ef4444",
            },
            {
              title: "Type II Error (β)",
              body: "Failing to reject a false null — a false negative. β = 1 − Power.",
              color: "#d4af37",
            },
            {
              title: "MDE",
              body: "Minimum Detectable Effect: the smallest difference worth detecting. Drives required sample size.",
              color: "#3bb4a4",
            },
            {
              title: "Peeking Problem",
              body: "Checking results before full sample is collected inflates false positive rate. Stick to your plan.",
              color: "#1e5d8a",
            },
          ].map(({ title, body, color }) => (
            <div key={title} className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4">
              <p className="text-[11px] font-semibold mb-2" style={{ color }}>
                {title}
              </p>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* Footer nav */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link
            href="/visual-guides/statistical-power-effect-size"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            ← Statistical Power &amp; Effect Size
          </Link>
          <Link
            href="/visual-guides/multiple-testing-false-discovery"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            Multiple Testing &amp; False Discovery →
          </Link>
        </div>
      </div>
    </div>
  );
}
