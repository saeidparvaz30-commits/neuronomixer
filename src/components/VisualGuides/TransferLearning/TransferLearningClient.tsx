"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";

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
  const { fadeUp, card } = useGuideMotion();
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

  function handleReset() {
    setLayers(DEFAULT_LAYERS);
    setSelectedStrategy("fine-tuning");
    setHasInteractedWithLayers(false);
    setHasSelectedStrategy(false);
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
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="transfer-learning" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#475569] mb-6">
          <Link href="/visual-guides" className="hover:text-[var(--color-accent)] transition-colors">
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-[#94a3b8]">Transfer Learning: Stand on Giants&apos; Shoulders</span>
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
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3"
          >
            Transfer Learning:{" "}
            <span className="text-[var(--color-accent)]">Stand on Giants&apos; Shoulders</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Click to freeze and unfreeze CNN layers. See how pretrained features transfer across tasks
            with dramatically less training data.
          </motion.p>
        </section>

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
              className="h-full bg-[var(--color-accent)] rounded-full"
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
              className="mt-2 text-xs text-[var(--color-success)] font-semibold"
            >
              Guide complete! Great work.
            </motion.div>
          )}
          {!session?.user && (
            <p className="text-[11px] text-[#475569] mt-2">
              <Link href="/auth/sign-in" className="text-[var(--color-accent)] hover:underline">
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
            reused directly; only the final layers need retraining for your specific problem.
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
            Transfer learning typically outperforms training from scratch, especially when labelled
            data is scarce, and the gap narrows as data grows.
          </p>
          <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-2xl p-4 sm:p-6">
            <DataComparisonChart animate={hasViewedChart} />
            <p className="text-[11px] text-[#475569] mt-3">
              Illustrative numbers showing the typical pattern, not measurements from a specific
              published benchmark. Exact accuracies depend on the task, model, and datasets.
            </p>
          </div>
        </section>

        {/* Insight box */}
        <div className="mb-10 bg-[#d4af37]/8 border border-[#d4af37]/25 rounded-2xl p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-2">
            Real-World Insight
          </h3>
          <p className="text-sm text-[#94a3b8] leading-relaxed">
            Very few teams train large models from scratch. Foundation models like GPT-4 and CLIP
            are pretrained once, at enormous cost, and everyone else adapts them: fine-tuning them
            or reusing their learned representations for downstream tasks. ChatGPT itself is a
            pretrained base model adapted with instruction tuning and human feedback (RLHF).
            Reusing a pretrained model is not a shortcut; it is the standard practice.
          </p>
        </div>

        {/* Completion card */}
        {isComplete && (
          <motion.div
            variants={card}
            initial="hidden"
            animate="visible"
            className="mt-8 mb-10 rounded-2xl border border-white/[0.08] bg-[#0f172a] overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-white/[0.07]">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-px bg-[var(--color-accent)]" />
                <span className="text-[10px] font-semibold uppercase tracking-[2px] text-[var(--color-accent)]">
                  Guide Complete
                </span>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-white">
                Transfer Learning Unlocked!
              </h2>
              <p className="text-sm text-[#94a3b8] mt-1">
                You froze layers, applied transfer strategies, and saw why less data is needed.
              </p>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <p className="text-[13px] text-[#94a3b8] leading-relaxed mb-4">
                You understand how to freeze layers, apply transfer strategies, and why less
                data is needed. Ready to see how optimizers race to minimise loss?
              </p>

              {/* Key Takeaway */}
              <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                  Key Takeaway
                </p>
                <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                  &quot;Reusing a pretrained model is not a shortcut; it is the standard
                  practice. Early layers learn universal features, so only the final layers
                  need retraining for your specific task.&quot;
                </p>
              </div>
            </div>

            {/* Footer */}
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
                  href="/visual-guides/optimizers-race"
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
                >
                  Next Guide →
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Navigation */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link
            href="/visual-guides/batch-normalization"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            ← Batch Normalization
          </Link>
          <Link
            href="/visual-guides/optimizers-race"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            Next Guide →
          </Link>
        </div>

      </div>
    </div>
  );
}
