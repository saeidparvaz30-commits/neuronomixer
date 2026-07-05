"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

import type { FunctionId, FunctionProperties } from "./types";
import FunctionSelector from "./FunctionSelector";
import FunctionPlotter from "./FunctionPlotter";
import PropertiesPanel from "./PropertiesPanel";
import TrainingCurveChart from "./TrainingCurveChart";
import DeadNeuronDetector from "./DeadNeuronDetector";
import ComparisonTable from "./ComparisonTable";
import SummaryCard from "./SummaryCard";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

// ── Function properties data ───────────────────────────────────────────────────
const FUNCTION_PROPERTIES: Record<FunctionId, FunctionProperties> = {
  relu: {
    id: "relu",
    label: "ReLU",
    color: "#3bb4a4",
    formula: "f(x) = max(0, x)",
    range: "[0, ∞)",
    gradient: "1 for x > 0, 0 for x < 0 — sparse, efficient backprop",
    vanishingRisk: false,
    deadNeuronRisk: true,
    bestFor: ["Hidden layers in deep networks", "CNNs and image recognition"],
    keyInsight:
      "Fast and sparse, but neurons can permanently die if weights push inputs negative.",
    description:
      "The most popular activation in modern deep learning. Passes positive values unchanged, zeroes out negatives.",
  },
  sigmoid: {
    id: "sigmoid",
    label: "Sigmoid",
    color: "#3b82f6",
    formula: "f(x) = 1 / (1 + e⁻ˣ)",
    range: "(0, 1)",
    gradient: "Max 0.25 at x=0; shrinks exponentially as |x| grows",
    vanishingRisk: true,
    deadNeuronRisk: false,
    bestFor: ["Binary classification output", "Probability estimation", "LSTM/GRU gates"],
    keyInsight:
      "Classic S-curve, but the gradient vanishes for large |x| as the output saturates toward 0 or 1, slowing deep network training.",
    description:
      "Squashes all values into (0, 1). Historically popular but largely replaced by ReLU in hidden layers.",
  },
  tanh: {
    id: "tanh",
    label: "Tanh",
    color: "#d4af37",
    formula: "f(x) = tanh(x)",
    range: "(-1, 1)",
    gradient: "Max 1 at x=0 — stronger than sigmoid but still vanishes",
    vanishingRisk: true,
    deadNeuronRisk: false,
    bestFor: ["Hidden layers (older networks)", "LSTM cell/candidate values"],
    keyInsight:
      "Zero-centered output helps training, but still suffers from vanishing gradients in deep networks.",
    description:
      "Zero-centered version of sigmoid. Preferred over sigmoid for hidden layers when bounded output is needed.",
  },
  "leaky-relu": {
    id: "leaky-relu",
    label: "Leaky ReLU",
    color: "#a855f7",
    formula: "f(x) = x > 0 ? x : 0.01x",
    range: "(-∞, ∞)",
    gradient: "1 for x > 0, 0.01 for x < 0 — always non-zero",
    vanishingRisk: false,
    deadNeuronRisk: false,
    bestFor: ["Modern deep networks", "When ReLU causes dead neurons"],
    keyInsight:
      "Fixes the dying ReLU problem with a small negative slope (0.01×x for x<0).",
    description:
      "ReLU variant that allows a small gradient for negative inputs, preventing permanently dead neurons.",
  },
};

// ── Progress helpers ───────────────────────────────────────────────────────────
function computeProgress(
  exploredFunctions: Set<FunctionId>,
  switchCount: number
): number {
  const explored = Math.min(exploredFunctions.size, 4) / 4;
  const switches = Math.min(switchCount, 3) / 3;
  return Math.round((explored * 0.7 + switches * 0.3) * 100);
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ActivationFunctionsClient() {
  const { data: session } = useSession();

  const [selectedFunction, setSelectedFunction] = useState<FunctionId>("relu");
  const [switchCount, setSwitchCount] = useState(0);
  const [exploredFunctions, setExploredFunctions] = useState<Set<FunctionId>>(
    new Set(["relu"])
  );
  const [showSummary, setShowSummary] = useState(false);
  const completionFired = useRef(false);

  const isComplete = exploredFunctions.size >= 4;
  const progress = computeProgress(exploredFunctions, switchCount);

  // Fire completion API
  useEffect(() => {
    if (isComplete && !completionFired.current) {
      completionFired.current = true;
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "activation-functions", score: 100 }),
        }).catch(() => {});
      }
    }
  }, [isComplete, session?.user]);

  // Show summary card once complete
  useEffect(() => {
    if (isComplete) {
      const t = setTimeout(() => setShowSummary(true), 600);
      return () => clearTimeout(t);
    }
  }, [isComplete]);

  function handleSelect(id: FunctionId) {
    if (id === selectedFunction) return;
    setSelectedFunction(id);
    setSwitchCount((c) => c + 1);
    setExploredFunctions((prev) => new Set([...prev, id]));
  }

  function handleReset() {
    setSelectedFunction("relu");
    setSwitchCount(0);
    setExploredFunctions(new Set(["relu"]));
    setShowSummary(false);
    completionFired.current = false;
  }

  const currentProps = FUNCTION_PROPERTIES[selectedFunction];

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <GuideCompletion isComplete={isComplete} guideSlug="activation-functions" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-white">Activation Functions</span>
        </nav>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 bg-[#a855f7]/20 border border-[#a855f7]/40 rounded-full px-3 py-1 mb-4">
            <span className="text-xs font-semibold text-[#a855f7] uppercase tracking-wider">
              Deep Learning
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Activation Functions: ReLU, Sigmoid &amp; Friends
          </h1>
          <p className="text-[#94a3b8] text-base max-w-2xl leading-relaxed">
            Explore how different activation functions affect gradient flow,
            training speed, and the dreaded &ldquo;dead neuron&rdquo; problem. Select a
            function to see its properties and training behavior.
          </p>
        </motion.div>

        {/* Progress bar */}
        <div className="mb-8 bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#94a3b8]">Exploration Progress</span>
            <span className="text-sm font-semibold text-white">
              {exploredFunctions.size}/4 functions explored
            </span>
          </div>
          <div className="h-2 bg-[#0f172a] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#a855f7] to-[#3bb4a4] rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <AnimatePresence>
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-xs text-[#3bb4a4] font-semibold"
              >
                Guide complete! You&apos;ve explored all activation functions.
              </motion.div>
            )}
          </AnimatePresence>
          {!session?.user && (
            <p className="mt-2 text-[11px] text-[#475569]">
              <Link href="/auth/sign-in" className="text-[#d4af37] hover:underline">
                Sign in
              </Link>{" "}
              to save your progress.
            </p>
          )}
        </div>

        {/* Function selector */}
        <div className="mb-6">
          <FunctionSelector
            selectedId={selectedFunction}
            properties={FUNCTION_PROPERTIES}
            onSelect={handleSelect}
          />
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6 mb-8">
          {/* Left: plotter + properties */}
          <div className="flex flex-col gap-5">
            {/* Plotter header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: currentProps.color }}
                />
                <h2 className="text-sm font-semibold text-white">
                  {currentProps.label} — {currentProps.formula}
                </h2>
              </div>
              <FunctionPlotter
                functionId={selectedFunction}
                properties={currentProps}
              />
            </div>

            <PropertiesPanel properties={currentProps} />
          </div>

          {/* Right: training curve + dead neuron detector */}
          <div className="flex flex-col gap-5">
            <TrainingCurveChart activeFunctionId={selectedFunction} />
            <DeadNeuronDetector functionId={selectedFunction} />
          </div>
        </div>

        {/* Comparison table */}
        <div className="mb-8">
          <ComparisonTable
            properties={FUNCTION_PROPERTIES}
            selectedId={selectedFunction}
            onSelect={handleSelect}
          />
        </div>

        {/* Summary card */}
        <AnimatePresence>
          {showSummary && (
            <div className="mb-8">
              <SummaryCard onReset={handleReset} />
            </div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-[#1e293b]">
          <Link
            href="/visual-guides/neural-network"
            className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white transition-colors"
          >
            <span>&#8592;</span>
            <span>What Is a Neural Network?</span>
          </Link>
          <Link
            href="/visual-guides"
            className="text-sm text-[#94a3b8] hover:text-white transition-colors"
          >
            All Guides
          </Link>
          <Link
            href="/visual-guides/backpropagation"
            className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white transition-colors"
          >
            <span>Next: Backpropagation: How Networks Learn</span>
            <span>&#8594;</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
