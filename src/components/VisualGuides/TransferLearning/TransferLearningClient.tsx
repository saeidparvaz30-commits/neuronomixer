"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";

import LayerFreezer from "./LayerFreezer";
import StrategySelector, { STRATEGIES } from "./StrategySelector";
import KnowledgeTransferViz from "./KnowledgeTransferViz";
import DataComparisonChart from "./DataComparisonChart";
import type { CNNLayer, TransferStrategy, StrategyInfo } from "./types";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

// ── Default layers (fine-tuning strategy applied) ──────────────────────────────
const DEFAULT_LAYERS: CNNLayer[] = [
  { id: "conv1", name: "Conv Block 1", depth: 1, state: "frozen",    features: "Edges & gradients",   paramCount: 4608,   trainable: false },
  { id: "conv2", name: "Conv Block 2", depth: 2, state: "frozen",    features: "Corners & curves",    paramCount: 36864,  trainable: false },
  { id: "conv3", name: "Conv Block 3", depth: 3, state: "frozen",    features: "Textures & patterns", paramCount: 73728,  trainable: false },
  { id: "conv4", name: "Conv Block 4", depth: 4, state: "fine-tune", features: "Complex shapes",      paramCount: 147456, trainable: true },
  { id: "conv5", name: "Conv Block 5", depth: 5, state: "fine-tune", features: "Object parts",        paramCount: 294912, trainable: true },
  { id: "head",  name: "Classification Head", depth: 6, state: "new", features: "Task-specific classes", paramCount: 40960, trainable: true },
];

// ── Intersection hook ──────────────────────────────────────────────────────────
function useIntersectionOnce(threshold = 0.3) {
  const ref = useRef<HTMLDivElement>(null);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || triggered) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTriggered(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [triggered, threshold]);

  return { ref, triggered };
}

export default function TransferLearningClient() {
  const { data: session } = useSession();
  const completionFired = useRef(false);

  const [layers, setLayers] = useState<CNNLayer[]>(DEFAULT_LAYERS);
  const [selectedStrategy, setSelectedStrategy] = useState<TransferStrategy | null>("fine-tuning");
  const [hasInteractedWithLayers, setHasInteractedWithLayers] = useState(false);
  const [hasSelectedStrategy, setHasSelectedStrategy] = useState(false);

  const { ref: chartRef, triggered: hasViewedChart } = useIntersectionOnce(0.3);

  // Completion gate
  const isComplete = hasInteractedWithLayers && hasSelectedStrategy && hasViewedChart;

  useEffect(() => {
    if (isComplete && !completionFired.current) {
      completionFired.current = true;
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "transfer-learning", score: 100 }),
        }).catch(() => {});
      }
    }
  }, [isComplete, session?.user]);

  function handleStrategySelect(strategy: StrategyInfo) {
    setSelectedStrategy(strategy.id);
    setHasSelectedStrategy(true);

    // Apply layer config from strategy
    const updated = layers.map((layer, i) => {
      const newState = strategy.layerConfig[i];
      return {
        ...layer,
        state: newState,
        trainable: newState !== "frozen",
      };
    });
    setLayers(updated);
  }

  function handleLayerChange(updated: CNNLayer[]) {
    setLayers(updated);
    setHasInteractedWithLayers(true);
    // If user manually tweaks, deselect preset strategy
    setSelectedStrategy(null);
  }

  // Progress calc
  const steps = [
    { label: "View Transfer Viz", done: true },
    { label: "Select a Strategy", done: hasSelectedStrategy },
    { label: "Toggle Layer State", done: hasInteractedWithLayers },
    { label: "View Data Chart", done: hasViewedChart },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const progressPct = (doneCount / steps.length) * 100;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <GuideCompletion isComplete={isComplete} guideSlug="transfer-learning" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#94a3b8] mb-6 flex-wrap">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-[#94a3b8]">Deep Learning</span>
          <span>/</span>
          <span className="text-white">Transfer Learning: Stand on Giants&apos; Shoulders</span>
        </nav>

        {/* Hero */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-[#a855f7]/20 border border-[#a855f7]/40 rounded-full px-3 py-1 mb-4">
            <span className="text-xs font-semibold text-[#a855f7] uppercase tracking-wider">
              Deep Learning
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Transfer Learning: Stand on Giants&apos; Shoulders
          </h1>
          <p className="text-[#94a3b8] text-base max-w-2xl">
            Click to freeze and unfreeze CNN layers. See how pretrained features transfer across tasks
            with dramatically less training data.
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-6 bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#94a3b8]">Exploration Progress</span>
            <span className="text-sm font-semibold text-white">
              {doneCount} / {steps.length} steps
            </span>
          </div>
          <div className="h-2 bg-[#0f172a] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#a855f7] to-[#3bb4a4] rounded-full"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {steps.map((s) => (
              <span
                key={s.label}
                className={`text-[11px] ${s.done ? "text-[#3bb4a4]" : "text-[#475569]"}`}
              >
                {s.done ? "✓" : "○"} {s.label}
              </span>
            ))}
          </div>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-xs text-[#3bb4a4] font-semibold"
            >
              Guide complete! Great work.
            </motion.div>
          )}
          {!session?.user && (
            <p className="text-[11px] text-[#475569] mt-2">
              <Link href="/auth/sign-in" className="text-[#d4af37] hover:underline">
                Sign in
              </Link>{" "}
              to save progress
            </p>
          )}
        </div>

        {/* Section: How Knowledge Transfers */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-1">How Knowledge Transfers</h2>
          <p className="text-sm text-[#94a3b8] mb-4">
            Early layers of a CNN learn universal features useful for any vision task. These can be
            reused directly — only the final layers need retraining for your specific problem.
          </p>
          <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-2xl p-4 sm:p-6">
            <KnowledgeTransferViz />
          </div>
        </section>

        {/* Two-column: Strategy + Layer Freezer */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          {/* Left: Strategy Selector */}
          <section>
            <h2 className="text-xl font-bold text-white mb-1">Apply a Strategy</h2>
            <p className="text-sm text-[#94a3b8] mb-4">
              Choose a transfer learning strategy. It will configure the layers on the right.
            </p>
            <StrategySelector selected={selectedStrategy} onSelect={handleStrategySelect} />
          </section>

          {/* Right: Layer Freezer */}
          <section>
            <h2 className="text-xl font-bold text-white mb-1">Freeze or Unfreeze Layers</h2>
            <p className="text-sm text-[#94a3b8] mb-4">
              Click any layer to toggle its state. The Classification Head is always a new layer.
            </p>
            <LayerFreezer layers={layers} onChange={handleLayerChange} />
          </section>
        </div>

        {/* Section: Data Comparison Chart */}
        <section className="mb-10" ref={chartRef}>
          <h2 className="text-xl font-bold text-white mb-1">Why It Works With Less Data</h2>
          <p className="text-sm text-[#94a3b8] mb-4">
            Transfer learning consistently outperforms training from scratch, especially when labelled
            data is scarce. The gap shrinks as data grows beyond 100K samples.
          </p>
          <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-2xl p-4 sm:p-6">
            <DataComparisonChart animate={hasViewedChart} />
          </div>
        </section>

        {/* Insight box */}
        <div className="mb-10 bg-[#d4af37]/8 border border-[#d4af37]/25 rounded-2xl p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-[#d4af37] uppercase tracking-wide mb-2">
            Real-World Insight
          </h3>
          <p className="text-sm text-[#94a3b8] leading-relaxed">
            GPT-4, CLIP, and most modern AI models are fine-tuned, not trained from scratch.
            Even ChatGPT started as a base language model that was transfer-learned with human
            feedback (RLHF). Transfer learning is not a shortcut — it is the standard.
          </p>
        </div>

        {/* Summary card (on completion) */}
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 bg-[#3bb4a4]/10 border border-[#3bb4a4]/30 rounded-2xl p-5 sm:p-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-[#3bb4a4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-base font-bold text-[#3bb4a4]">Guide Complete!</span>
            </div>
            <p className="text-sm text-[#94a3b8] mb-4">
              You understand how to freeze layers, apply transfer strategies, and why less data is
              needed. Ready to see how optimizers race to minimise loss?
            </p>
            <Link
              href="/visual-guides/optimizers-race"
              className="inline-flex items-center gap-2 bg-[#3bb4a4] text-[#0f172a] font-semibold text-sm px-4 py-2 rounded-lg hover:brightness-110 transition-all"
            >
              Next: Optimizers Race →
            </Link>
          </motion.div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-[#1e293b]">
          <Link
            href="/visual-guides/batch-normalization"
            className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white transition-colors"
          >
            <span>←</span>
            <span>Batch Normalization</span>
          </Link>
          <Link
            href="/visual-guides"
            className="text-sm text-[#94a3b8] hover:text-white transition-colors"
          >
            All Guides
          </Link>
          <Link
            href="/visual-guides/optimizers-race"
            className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white transition-colors"
          >
            <span>Optimizers Race</span>
            <span>→</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
