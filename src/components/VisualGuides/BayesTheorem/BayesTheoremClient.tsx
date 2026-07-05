"use client";

import React, { useState, useEffect, useRef } from "react";
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
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

export default function BayesTheoremClient() {
  const { data: session } = useSession();
  const completionFired = useRef(false);

  const [state, setState] = useState<BayesState>(initialBayesState);

  // Computed task flags
  const allSlidersTouched =
    state.slidersTouched.baseRate &&
    state.slidersTouched.sensitivity &&
    state.slidersTouched.specificity;
  const allStepsVisited =
    state.stepsVisited[1] && state.stepsVisited[2] && state.stepsVisited[3];

  // Completion requires all four tasks
  const isComplete =
    state.intuitionApplied &&
    state.actualsRevealed &&
    allSlidersTouched &&
    allStepsVisited;

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
      intuitionApplied: false,
      actualsRevealed: false,
      slidersTouched: { baseRate: false, sensitivity: false, specificity: false },
      animationStep: 1,
      stepsVisited: { 1: false, 2: false, 3: false },
    }));
  }

  function handleIntuitionChange(v: number) {
    setState((prev) => ({ ...prev, intuition: v }));
  }

  function handleApplyIntuition() {
    setState((prev) => ({ ...prev, intuitionApplied: true }));
  }

  function handleRevealActuals() {
    setState((prev) => ({
      ...prev,
      actualsRevealed: true,
      // Step 1 is the default visible step after reveal — count as visited.
      stepsVisited: { ...prev.stepsVisited, 1: true },
    }));
  }

  function handleBaseRateChange(v: number) {
    const posterior = computePosterior(v, state.sensitivity, state.specificity);
    setState((prev) => ({
      ...prev,
      baseRate: v,
      posterior,
      slidersTouched: { ...prev.slidersTouched, baseRate: true },
    }));
  }

  function handleSensitivityChange(v: number) {
    const posterior = computePosterior(state.baseRate, v, state.specificity);
    setState((prev) => ({
      ...prev,
      sensitivity: v,
      posterior,
      slidersTouched: { ...prev.slidersTouched, sensitivity: true },
    }));
  }

  function handleSpecificityChange(v: number) {
    const posterior = computePosterior(state.baseRate, state.sensitivity, v);
    setState((prev) => ({
      ...prev,
      specificity: v,
      posterior,
      slidersTouched: { ...prev.slidersTouched, specificity: true },
    }));
  }

  function handleAnimationStepComplete(step: 1 | 2 | 3) {
    setState((prev) => ({
      ...prev,
      animationStep: step,
      stepsVisited: { ...prev.stepsVisited, [step]: true },
    }));
  }

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="bayes-theorem" score={7} />
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
        <div className="flex items-center gap-4 mb-8 flex-wrap">
          {(() => {
            const slidersCount =
              (state.slidersTouched.baseRate ? 1 : 0) +
              (state.slidersTouched.sensitivity ? 1 : 0) +
              (state.slidersTouched.specificity ? 1 : 0);
            const stepsCount =
              (state.stepsVisited[1] ? 1 : 0) +
              (state.stepsVisited[2] ? 1 : 0) +
              (state.stepsVisited[3] ? 1 : 0);
            const tasks = [
              { done: state.intuitionApplied, label: "Guess applied" },
              { done: state.actualsRevealed, label: "Actuals revealed" },
              { done: allSlidersTouched, label: `Sliders explored: ${slidersCount}/3` },
              { done: allStepsVisited, label: `Steps viewed: ${stepsCount}/3` },
            ];
            return tasks.map((t) => (
              <div key={t.label} className="flex items-center gap-1.5">
                <div
                  className={`w-2 h-2 rounded-full transition-colors ${
                    t.done ? "bg-[#3bb4a4]" : "bg-[#1e293b]"
                  }`}
                />
                <span className={`text-[11px] ${t.done ? "text-white" : "text-[#475569]"}`}>
                  {t.label}
                </span>
              </div>
            ));
          })()}
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
            onApplyIntuition={handleApplyIntuition}
          />

          {/* Reveal gate: hide everything below until the user clicks "Show Actuals" */}
          {!state.actualsRevealed ? (
            <div className="rounded-2xl border border-dashed border-[#1e293b] bg-[#0f172a] p-8 sm:p-12 flex flex-col items-center text-center space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">
                Ready to see the math?
              </p>
              <h3 className="text-[18px] sm:text-[20px] font-bold text-white max-w-[520px]">
                Reveal the Bayesian breakdown and compare it with your guess.
              </h3>
              <p className="text-[12px] text-[#94a3b8] max-w-[480px]">
                {state.intuitionApplied
                  ? "Your guess is locked in. Click below to reveal the actual posterior probability and walk through the math."
                  : "Lock in your guess above first, then reveal the actual posterior probability."}
              </p>
              <button
                onClick={handleRevealActuals}
                disabled={!state.intuitionApplied}
                className="mt-2 px-8 py-3.5 rounded-xl text-[15px] font-bold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Show Actuals →
              </button>
            </div>
          ) : (
            <>
              {/* Row 2: Prior + Likelihood side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PriorPanel
                  baseRate={state.baseRate}
                  scenario={state.scenario}
                  onBaseRateChange={handleBaseRateChange}
                />
                <LikelihoodPanel
                  sensitivity={state.sensitivity}
                  specificity={state.specificity}
                  scenario={state.scenario}
                  onSensitivityChange={handleSensitivityChange}
                  onSpecificityChange={handleSpecificityChange}
                />
              </div>

              {/* Row 3: Bayesian Animation (full width — the centerpiece) */}
              <BayesianAnimation
                baseRate={state.baseRate}
                sensitivity={state.sensitivity}
                specificity={state.specificity}
                scenario={state.scenario}
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
                  scenario={state.scenario}
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
                sensitivity={state.sensitivity}
              />
            </>
          )}
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
