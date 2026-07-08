"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

import type { NetworkType } from "./types";
import { LSTM_SEQUENCE, SENTENCE_TOKENS } from "./sequenceData";
import NetworkTypeSelector from "./NetworkTypeSelector";
import SequenceStepper from "./SequenceStepper";
import RNNCellDiagram from "./RNNCellDiagram";
import LSTMCellDiagram from "./LSTMCellDiagram";
import GradientFlowChart from "./GradientFlowChart";
import GateExplainer from "./GateExplainer";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import { useGuideMotion } from "@/lib/guideMotion";

export default function RNNsLSTMsClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();
  const completionFired = useRef(false);

  const [networkType, setNetworkType] = useState<NetworkType>("rnn");
  const [currentStep, setCurrentStep] = useState(0);
  const [seenTypes, setSeenTypes] = useState<Set<NetworkType>>(new Set(["rnn"]));
  const [hasViewedGradient, setHasViewedGradient] = useState(false);
  const gradientRef = useRef<HTMLDivElement | null>(null);

  const hasViewedBoth = seenTypes.size >= 2;

  // Track both types seen
  function handleNetworkTypeSelect(t: NetworkType) {
    setNetworkType(t);
    setSeenTypes((prev) => new Set([...prev, t]));
    setCurrentStep(0);
  }

  // Stable step change callback for SequenceStepper
  const handleStepChange = useCallback((stepOrUpdater: number | ((prev: number) => number)) => {
    if (typeof stepOrUpdater === "function") {
      setCurrentStep(stepOrUpdater);
    } else {
      setCurrentStep(stepOrUpdater);
    }
  }, []);

  // IntersectionObserver for gradient chart
  useEffect(() => {
    const el = gradientRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasViewedGradient(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const isComplete = hasViewedBoth && hasViewedGradient && currentStep >= SENTENCE_TOKENS.length - 1;

  // Completion API call
  useEffect(() => {
    if (isComplete && !completionFired.current) {
      completionFired.current = true;
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "rnns-lstms", score: 100 }),
        }).catch(() => {});
      }
    }
  }, [isComplete, session?.user]);

  // Progress percentage
  const progressPct =
    (seenTypes.size / 2) * 33 +
    (Math.min(currentStep + 1, SENTENCE_TOKENS.length) / SENTENCE_TOKENS.length) * 34 +
    (hasViewedGradient ? 33 : 0);

  const lstmStep = LSTM_SEQUENCE[currentStep];

  function handleReset() {
    setNetworkType("rnn");
    setCurrentStep(0);
    setSeenTypes(new Set(["rnn"]));
  }

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="rnns-lstms" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#475569] mb-6">
          <Link href="/visual-guides" className="hover:text-[var(--color-accent)] transition-colors">
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-[#94a3b8]">RNNs &amp; LSTMs: Memory in Networks</span>
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
            RNNs &amp; LSTMs: <span className="text-[var(--color-accent)]">Memory in Networks</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]">
            Watch information flow through recurrent cells step by step. See how LSTMs solve the
            vanishing gradient problem with gates and cell state.
          </p>
        </section>

        {/* Progress bar */}
        <div className="mb-8 bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#94a3b8]">Exploration Progress</span>
            <span className="text-sm font-semibold text-white">
              {seenTypes.size}/2 architectures &middot; step {currentStep + 1}/{SENTENCE_TOKENS.length} &middot;{" "}
              {hasViewedGradient ? "gradient seen ✓" : "scroll to gradient chart"}
            </span>
          </div>
          <div className="h-2 bg-[#0f172a] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #a855f7, #3bb4a4)",
              }}
              animate={{ width: `${Math.min(progressPct, 100)}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <AnimatePresence>
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-xs text-[var(--color-success)] font-semibold"
              >
                Guide complete! Great job exploring both architectures.
              </motion.div>
            )}
          </AnimatePresence>
          {!session?.user && (
            <p className="mt-2 text-[11px] text-[#475569]">
              <Link href="/auth/sign-in" className="text-[var(--color-accent)] hover:underline">
                Sign in
              </Link>{" "}
              to save your progress
            </p>
          )}
        </div>

        {/* Section: Choose Architecture */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-[#a855f7]/20 border border-[#a855f7]/40 flex items-center justify-center text-[#a855f7] text-xs font-bold">
              1
            </span>
            Choose Architecture
          </h2>
          <div className="bg-[#1e293b]/50 border border-[#1e293b] rounded-2xl p-5">
            <NetworkTypeSelector selected={networkType} onSelect={handleNetworkTypeSelect} />
          </div>
        </section>

        {/* Section: Step Through a Sequence */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-[#a855f7]/20 border border-[#a855f7]/40 flex items-center justify-center text-[#a855f7] text-xs font-bold">
              2
            </span>
            Step Through a Sequence
          </h2>
          <div className="bg-[#1e293b]/50 border border-[#1e293b] rounded-2xl p-5 flex flex-col gap-5">
            <div>
              <p className="text-xs text-[#475569] mb-3">
                Sequence: <span className="text-[#94a3b8] font-medium">&ldquo;The cat sat on the mat&rdquo;</span>. Step through to watch the{" "}
                <span style={{ color: networkType === "rnn" ? "#1e5d8a" : "#a855f7" }}>
                  {networkType === "rnn" ? "RNN" : "LSTM"}
                </span>{" "}
                process each token.
              </p>
              <SequenceStepper
                networkType={networkType}
                currentStep={currentStep}
                onStepChange={handleStepChange}
              />
            </div>

            {/* Cell diagram */}
            <AnimatePresence mode="wait">
              {networkType === "rnn" ? (
                <motion.div
                  key="rnn-diagram"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  <RNNCellDiagram step={currentStep} />
                </motion.div>
              ) : (
                <motion.div
                  key="lstm-diagram"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  <LSTMCellDiagram step={currentStep} sequence={lstmStep} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* LSTM Gate Explainer */}
        <AnimatePresence>
          {networkType === "lstm" && (
            <motion.section
              key="gate-explainer"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35 }}
              className="mb-10 overflow-hidden"
            >
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-[#a855f7]/20 border border-[#a855f7]/40 flex items-center justify-center text-[#a855f7] text-xs font-bold">
                  3
                </span>
                Gate Activations
              </h2>
              <div className="bg-[#1e293b]/50 border border-[#1e293b] rounded-2xl p-5">
                <GateExplainer currentStep={currentStep} sequenceStep={lstmStep} />
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Section: Vanishing Gradient */}
        <section className="mb-10" ref={gradientRef}>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-[#a855f7]/20 border border-[#a855f7]/40 flex items-center justify-center text-[#a855f7] text-xs font-bold">
              {networkType === "lstm" ? "4" : "3"}
            </span>
            The Vanishing Gradient Problem
          </h2>
          <div className="bg-[#1e293b]/50 border border-[#1e293b] rounded-2xl p-5 flex flex-col gap-4">
            <p className="text-sm text-[#94a3b8] leading-relaxed">
              During backpropagation, gradients are multiplied at every timestep, starting from the loss
              at the end of the sequence. In RNNs, multiplying by values &lt;1 repeatedly causes them to
              shrink to near-zero by the time they reach the earliest tokens, so the network struggles to
              learn from early inputs. Along the LSTM cell-state highway, the gradient is scaled only by
              the forget gate at each step: when the network chooses to keep its memory (forget gate near 1),
              gradients pass back almost unchanged, and they shrink mainly where the network deliberately
              forgets. The LSTM line below is computed from the same forget-gate values shown in the cell diagram.
            </p>
            <GradientFlowChart />
          </div>
        </section>

        {/* Gold insight box */}
        <div className="mb-10 rounded-2xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 p-5">
          <div className="flex items-start gap-3">
            <span className="text-[var(--color-accent)] text-lg mt-0.5">💡</span>
            <div>
              <p className="text-sm font-semibold text-[var(--color-accent)] mb-1">Historical Context</p>
              <p className="text-sm text-[#94a3b8] leading-relaxed">
                LSTMs are no longer the state of the art: Transformers (using self-attention) replaced
                them in 2017 with the landmark &ldquo;Attention Is All You Need&rdquo; paper. But
                understanding LSTMs gives critical intuition for <em className="text-white">why</em>{" "}
                attention was needed: sequential processing is slow, and long-range dependencies are hard
                to capture through gating alone.
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
                <h2 className="text-2xl font-extrabold tracking-tight text-white">Recurrent Memory Mastered!</h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You explored both RNN and LSTM architectures, stepped through a full sequence, and saw the vanishing gradient problem first-hand.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Architectures", value: `${seenTypes.size} / 2`, color: "#a855f7" },
                    { label: "Sequence steps", value: `${SENTENCE_TOKENS.length} tokens`, color: "#3bb4a4" },
                    { label: "Gradient flow", value: "Seen", color: "var(--color-accent)" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-[#1e293b] p-3">
                      <p className="text-[10px] text-[#475569] mb-1">{item.label}</p>
                      <p className="text-[14px] font-mono font-bold" style={{ color: item.color }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">Key Takeaway</p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;An RNN squeezes all history through one repeatedly multiplied hidden state, so old signals fade. The LSTM adds a gated memory highway where gradients survive as long as the network chooses to remember.&quot;
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-3">
                <Link href="/visual-guides"
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors">
                  ← All Guides
                </Link>
                <div className="flex items-center gap-3">
                  <button onClick={handleReset}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors">
                    Try Again
                  </button>
                  <Link href="/visual-guides/dropout"
                    className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
                    Next Guide →
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer nav */}
        {!isComplete && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
            <Link href="/visual-guides"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors">
              ← All Guides
            </Link>
            <Link href="/visual-guides/dropout"
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
              Next Guide →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
