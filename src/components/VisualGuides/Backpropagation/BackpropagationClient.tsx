"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";

import { Step, STEP_CONTENTS } from "./types";
import NetworkVisualization from "./NetworkVisualization";
import StepControlPanel from "./StepControlPanel";
import ExplanationPanel from "./ExplanationPanel";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

const TOTAL_STEPS = 8;
const AUTO_PLAY_INTERVAL = 2500;

export default function BackpropagationClient() {
  const { data: session } = useSession();
  const { fadeIn, card } = useGuideMotion();
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

  function handleReset() {
    setIsAutoPlay(false);
    setCurrentStep(1);
  }

  // ── Progress bar width ─────────────────────────────────────────────────────
  const progressPct = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="backpropagation" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#475569] mb-6">
          <Link href="/visual-guides" className="hover:text-[var(--color-accent)] transition-colors">
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-[#94a3b8]">Backpropagation: How Networks Learn</span>
        </nav>

        {/* Hero */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              Deep Learning
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Backpropagation:{" "}
            <span className="text-[var(--color-accent)]">How Networks Learn</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]">
            Follow data forward through the network, compute the loss, then watch gradients flow
            backward via the chain rule. Step through each phase neuron by neuron.
          </p>
        </section>

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
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              className="mt-2 text-xs text-[#3bb4a4] font-semibold"
            >
              Guide complete! You walked through the full backpropagation cycle.
            </motion.div>
          )}
          {!session?.user && (
            <p className="mt-2 text-[11px] text-[#475569]">
              <Link href="/auth/sign-in" className="text-[var(--color-accent)] hover:underline">
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
            <div className="grid grid-cols-4 gap-2 xl:hidden" role="radiogroup" aria-label="Jump to step">
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
                    role="radio"
                    aria-checked={isCurrent}
                    aria-label={`Step ${s.step}: ${s.title}`}
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
              <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Jump to step">
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
                      role="radio"
                      aria-checked={isCurrent}
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
              <h3 className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-2">
                Key Insight
              </h3>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Backpropagation is just the{" "}
                <span className="text-white">chain rule applied recursively</span>. Each layer
                receives a gradient from the layer above, multiplies it by the local derivative, and
                passes it further back. No magic, just calculus and matrix multiplication.
              </p>
            </div>
          </div>
        </div>

        {/* Completion card */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              variants={card}
              initial="hidden"
              animate="visible"
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
                  Backpropagation Mastered!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You walked the full training cycle: forward pass, loss, backward pass, and weight update.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Steps completed</p>
                    <p className="text-[14px] font-mono font-bold text-[#3bb4a4]">
                      {currentStep} / {TOTAL_STEPS}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Phases walked</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      Fwd, Loss, Bwd, Update
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Core mechanism</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      Chain rule
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Backpropagation is the chain rule applied recursively: each layer multiplies
                    the gradient from above by its local derivative and passes it further back.&quot;
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
                    href="/visual-guides/cnns"
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
        {!isComplete && (
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
            <Link
              href="/visual-guides"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
            >
              ← All Guides
            </Link>
            <Link
              href="/visual-guides/cnns"
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
            >
              Next Guide →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
