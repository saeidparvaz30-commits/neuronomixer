"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

import type { BayesState, ScenarioType } from "./types";
import { computePosterior, SCENARIO_CONFIGS, initialBayesState } from "./types";
import ScenarioIntro from "./ScenarioIntro";
import PriorPanel from "./PriorPanel";
import LikelihoodPanel from "./LikelihoodPanel";
import BayesianAnimation from "./BayesianAnimation";
import InteractiveBlocks from "./InteractiveBlocks";
import PosteriorResult from "./PosteriorResult";
import ComparisonView from "./ComparisonView";

export default function BayesTheoremClient() {
  const { data: session } = useSession();
  const completionFired = useRef(false);

  const [state, setState] = useState<BayesState>(initialBayesState);

  // Auto-play animation: step through 1→2→3 when controls change
  const animTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const triggerAnimation = useCallback(() => {
    // Clear any pending animation timeouts
    animTimeouts.current.forEach(clearTimeout);
    animTimeouts.current = [];

    setState((prev) => ({ ...prev, animationStep: 1, animationCompleted: false }));

    const t1 = setTimeout(() => {
      setState((prev) => ({ ...prev, animationStep: 2 }));
    }, 900);
    const t2 = setTimeout(() => {
      setState((prev) => ({ ...prev, animationStep: 3, animationCompleted: true }));
    }, 1900);

    animTimeouts.current = [t1, t2];
  }, []);

  // Trigger animation on mount
  useEffect(() => {
    triggerAnimation();
    return () => {
      animTimeouts.current.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Completion check
  const isComplete =
    state.sliderAdjustments >= 5 && state.animationCompleted;

  useEffect(() => {
    if (isComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "bayes-theorem", score: 7 }),
      }).catch(() => {});
    }
  }, [isComplete, session?.user]);

  // Handlers
  function handleScenarioChange(s: ScenarioType) {
    const cfg = SCENARIO_CONFIGS[s];
    const posterior = computePosterior(cfg.baseRate, cfg.sensitivity, cfg.specificity);
    setState((prev) => ({
      ...prev,
      scenario: s,
      baseRate: cfg.baseRate,
      sensitivity: cfg.sensitivity,
      specificity: cfg.specificity,
      posterior,
    }));
    triggerAnimation();
  }

  function handleIntuitionChange(v: number) {
    setState((prev) => ({ ...prev, intuition: v }));
  }

  function handleBaseRateChange(v: number) {
    const posterior = computePosterior(v, state.sensitivity, state.specificity);
    setState((prev) => ({
      ...prev,
      baseRate: v,
      posterior,
      sliderAdjustments: prev.sliderAdjustments + 1,
    }));
    triggerAnimation();
  }

  function handleSensitivityChange(v: number) {
    const posterior = computePosterior(state.baseRate, v, state.specificity);
    setState((prev) => ({
      ...prev,
      sensitivity: v,
      posterior,
      sliderAdjustments: prev.sliderAdjustments + 1,
    }));
    triggerAnimation();
  }

  function handleSpecificityChange(v: number) {
    const posterior = computePosterior(state.baseRate, state.sensitivity, v);
    setState((prev) => ({
      ...prev,
      specificity: v,
      posterior,
      sliderAdjustments: prev.sliderAdjustments + 1,
    }));
    triggerAnimation();
  }

  function handleAnimationStepComplete(step: 1 | 2 | 3) {
    setState((prev) => ({
      ...prev,
      animationStep: step,
      animationCompleted: step === 3 ? true : prev.animationCompleted,
    }));
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Bayes Theorem</span>
        </nav>

        {/* Hero */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[#d4af37]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#d4af37]">
              Statistics
            </span>
            <span className="w-6 h-px bg-[#d4af37]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Bayes Theorem:{" "}
            <span className="text-[#d4af37]">Update Your Beliefs</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[680px]">
            A test is 95% accurate. You test positive. What&apos;s the probability you have the disease?
            Adjust base rates and test accuracy to see how beliefs update.
          </p>
        </section>

        {/* Progress tracker */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full transition-colors ${
                state.sliderAdjustments >= 5 ? "bg-[#3bb4a4]" : "bg-[#1e293b]"
              }`}
            />
            <span
              className={`text-[11px] ${
                state.sliderAdjustments >= 5 ? "text-white" : "text-[#475569]"
              }`}
            >
              Sliders adjusted: {state.sliderAdjustments}/5
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full transition-colors ${
                state.animationCompleted ? "bg-[#3bb4a4]" : "bg-[#1e293b]"
              }`}
            />
            <span
              className={`text-[11px] ${
                state.animationCompleted ? "text-white" : "text-[#475569]"
              }`}
            >
              Animation viewed
            </span>
          </div>
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
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Main layout */}
        <div className="space-y-6">
          {/* Row 1: Scenario Intro */}
          <ScenarioIntro
            state={state}
            onScenarioChange={handleScenarioChange}
            onIntuitionChange={handleIntuitionChange}
          />

          {/* Row 2: Prior + Likelihood side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PriorPanel
              baseRate={state.baseRate}
              onBaseRateChange={handleBaseRateChange}
            />
            <LikelihoodPanel
              sensitivity={state.sensitivity}
              specificity={state.specificity}
              onSensitivityChange={handleSensitivityChange}
              onSpecificityChange={handleSpecificityChange}
            />
          </div>

          {/* Row 3: Bayesian Animation (full width — the centerpiece) */}
          <BayesianAnimation
            baseRate={state.baseRate}
            sensitivity={state.sensitivity}
            specificity={state.specificity}
            animationStep={state.animationStep}
            onStepComplete={handleAnimationStepComplete}
          />

          {/* Row 4: Interactive Blocks + Posterior Result side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <InteractiveBlocks
              posterior={state.posterior}
              baseRate={state.baseRate}
              sensitivity={state.sensitivity}
              specificity={state.specificity}
            />
            <PosteriorResult
              posterior={state.posterior}
              baseRate={state.baseRate}
              sensitivity={state.sensitivity}
              specificity={state.specificity}
              scenario={state.scenario}
            />
          </div>

          {/* Row 5: Comparison View */}
          <ComparisonView
            intuition={state.intuition}
            posterior={state.posterior}
          />
        </div>

        {/* Footer nav */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link
            href="/visual-guides/conditional-probability"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            ← Previous: Conditional Probability
          </Link>
          <Link
            href="/visual-guides/random-variables-expected-value"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            Next: Random Variables →
          </Link>
        </div>
      </div>
    </div>
  );
}
