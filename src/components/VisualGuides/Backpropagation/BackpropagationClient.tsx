"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";

import { Step, STEP_CONTENTS } from "./types";
import NetworkVisualization from "./NetworkVisualization";
import StepControlPanel from "./StepControlPanel";
import ExplanationPanel from "./ExplanationPanel";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

const TOTAL_STEPS = 8;
const AUTO_PLAY_INTERVAL = 2500;

export default function BackpropagationClient() {
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const completionFired = useRef(false);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stepContent = STEP_CONTENTS[currentStep - 1];

  // ── Completion tracking ────────────────────────────────────────────────────
  const isComplete = currentStep === TOTAL_STEPS;

  useEffect(() => {
    if (isComplete && !isAutoPlay && !completionFired.current) {
      completionFired.current = true;
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "backpropagation", score: 100 }),
        }).catch(() => {});
      }
    }
  }, [isComplete, isAutoPlay, session?.user]);

  // ── Auto-play ──────────────────────────────────────────────────────────────
  const clearAutoPlay = useCallback(() => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isAutoPlay) {
      clearAutoPlay();
      return;
    }
    autoPlayRef.current = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= TOTAL_STEPS) {
          setIsAutoPlay(false);
          return prev;
        }
        return (prev + 1) as Step;
      });
    }, AUTO_PLAY_INTERVAL);
    return clearAutoPlay;
  }, [isAutoPlay, clearAutoPlay]);

  // ── Navigation handlers ────────────────────────────────────────────────────
  function goNext() {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  }

  function goPrev() {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  }

  function toggleAutoPlay() {
    setIsAutoPlay((prev) => !prev);
  }

  // ── Progress bar width ─────────────────────────────────────────────────────
  const progressPct = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <GuideCompletion isComplete={isComplete} guideSlug="backpropagation" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-white">Backpropagation: How Networks Learn</span>
        </nav>

        {/* Hero */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-[#a855f7]/20 border border-[#a855f7]/40 rounded-full px-3 py-1 mb-4">
            <span className="text-xs font-semibold text-[#a855f7] uppercase tracking-wider">
              Deep Learning
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Backpropagation: How Networks Learn
          </h1>
          <p className="text-[#94a3b8] text-base max-w-2xl">
            Follow data forward through the network, compute the loss, then watch gradients flow
            backward via the chain rule. Step through each phase neuron by neuron.
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8 bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#94a3b8]">Walkthrough Progress</span>
            <span className="text-sm font-semibold text-white">
              Step {currentStep} of {TOTAL_STEPS}
            </span>
          </div>
          <div className="h-2 bg-[#0f172a] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #a855f7, #3bb4a4)",
              }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 text-xs text-[#3bb4a4] font-semibold"
            >
              Guide complete! You walked through the full backpropagation cycle.
            </motion.div>
          )}
          {!session?.user && (
            <p className="mt-2 text-[11px] text-[#475569]">
              <Link href="/auth/sign-in" className="text-[#d4af37] hover:underline">
                Sign in
              </Link>{" "}
              to save your progress across sessions.
            </p>
          )}
        </div>

        {/* Main layout: Network (left 60%) | Controls + Explanation (right 40%) */}
        <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-6">

          {/* Left: Network visualization */}
          <div className="flex flex-col gap-4">
            <NetworkVisualization step={currentStep} />

            {/* Step summary cards (mobile-friendly quick reference) */}
            <div className="grid grid-cols-4 gap-2 xl:hidden">
              {STEP_CONTENTS.map((s) => {
                const phaseColors = {
                  forward: "#3bb4a4",
                  loss: "#d4af37",
                  backward: "#f87171",
                  update: "#4ade80",
                };
                const color = phaseColors[s.phase];
                const isCurrent = s.step === currentStep;
                const isDone = s.step < currentStep;
                return (
                  <button
                    key={s.step}
                    onClick={() => setCurrentStep(s.step)}
                    className="rounded-lg p-2 text-center transition-all border text-[11px] font-semibold"
                    style={{
                      borderColor: isCurrent ? color : isDone ? `${color}50` : "#334155",
                      background: isCurrent ? `${color}18` : "transparent",
                      color: isCurrent ? color : isDone ? `${color}80` : "#475569",
                    }}
                  >
                    {s.step}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Explanation + controls */}
          <div className="flex flex-col gap-4">
            {/* Explanation panel */}
            <ExplanationPanel content={stepContent} />

            {/* Step control panel */}
            <StepControlPanel
              currentStep={currentStep}
              isAutoPlay={isAutoPlay}
              onPrev={goPrev}
              onNext={goNext}
              onToggleAutoPlay={toggleAutoPlay}
            />

            {/* Quick step picker (desktop) */}
            <div className="hidden xl:block bg-[#1e293b]/60 border border-[#1e293b] rounded-2xl p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-3">
                Jump to Step
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {STEP_CONTENTS.map((s) => {
                  const phaseColors = {
                    forward: "#3bb4a4",
                    loss: "#d4af37",
                    backward: "#f87171",
                    update: "#4ade80",
                  };
                  const color = phaseColors[s.phase];
                  const isCurrent = s.step === currentStep;
                  const isDone = s.step < currentStep;
                  return (
                    <button
                      key={s.step}
                      onClick={() => setCurrentStep(s.step)}
                      title={s.title}
                      className="rounded-lg p-2 text-center transition-all border"
                      style={{
                        borderColor: isCurrent ? color : isDone ? `${color}40` : "#334155",
                        background: isCurrent ? `${color}18` : "transparent",
                      }}
                    >
                      <div
                        className="text-sm font-bold"
                        style={{ color: isCurrent ? color : isDone ? `${color}80` : "#475569" }}
                      >
                        {s.step}
                      </div>
                      <div
                        className="text-[9px] mt-0.5 leading-tight"
                        style={{ color: isCurrent ? color : "#475569" }}
                      >
                        {s.phase === "forward" ? "Fwd" : s.phase === "loss" ? "Loss" : s.phase === "backward" ? "Bwd" : "Upd"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Key insight box */}
            <div className="bg-[#1e293b]/60 border border-[#d4af37]/20 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-[#d4af37] uppercase tracking-wide mb-2">
                Key Insight
              </h3>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Backpropagation is just the{" "}
                <span className="text-white">chain rule applied recursively</span>. Each layer
                receives a gradient from the layer above, multiplies it by the local derivative, and
                passes it further back. No magic — just calculus and matrix multiplication.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-[#1e293b]">
          <Link
            href="/visual-guides/neural-network"
            className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white transition-colors"
          >
            <span>←</span>
            <span>What Is a Neural Network?</span>
          </Link>
          <Link
            href="/visual-guides"
            className="text-sm text-[#94a3b8] hover:text-white transition-colors"
          >
            All Guides
          </Link>
          <Link
            href="/visual-guides/cnns"
            className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white transition-colors"
          >
            <span>Next: CNNs: See What Filters See</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
