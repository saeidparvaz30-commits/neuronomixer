"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";
import type { Scale, DataType } from "./types";
import { DATA_EXAMPLES, SCALE_INFO } from "./types";
import CardDeck from "./CardDeck";
import ScaleBucket from "./ScaleBucket";
import FeedbackPanel from "./FeedbackPanel";
import ScaleExplainer from "./ScaleExplainer";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

const SCALES: Scale[] = ["nominal", "ordinal", "interval", "ratio"];
const NEXT_GUIDE_SLUG = "sources-of-bias";

export default function TypesOfDataClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();
  const completionFired = useRef(false);

  // sorted: maps DataType -> Scale (where it was dropped) | null
  const [sorted, setSorted] = useState<Record<DataType, Scale | null>>(() => {
    const init: Record<DataType, Scale | null> = {} as Record<DataType, Scale | null>;
    DATA_EXAMPLES.forEach((e) => { init[e.id] = null; });
    return init;
  });

  const [draggingId, setDraggingId] = useState<DataType | null>(null);
  const [overBucket, setOverBucket] = useState<Scale | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; isCorrect: boolean } | null>(null);
  const [phase, setPhase] = useState<1 | 2>(1);

  // Correctly placed = placed in correct bucket
  const correctlyPlaced = DATA_EXAMPLES.filter(
    (e) => sorted[e.id] === e.correctScale
  );
  const correctCount = correctlyPlaced.length;
  const placedIds = new Set<DataType>(
    DATA_EXAMPLES.filter((e) => sorted[e.id] !== null).map((e) => e.id)
  );

  // Phase transition
  const allCorrect = correctCount === DATA_EXAMPLES.length;

  // Completion: all 9 correct + phase 2
  const allComplete = allCorrect && phase === 2;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "types-of-data-measurement-scales", score: 100 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  function handleDragStart(e: React.DragEvent, id: DataType) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }

  function handleDragOver(e: React.DragEvent, scale: Scale) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverBucket(scale);
  }

  function handleDrop(e: React.DragEvent, targetScale: Scale) {
    e.preventDefault();
    setOverBucket(null);
    const id = (e.dataTransfer.getData("text/plain") || draggingId) as DataType;
    if (!id) return;

    const example = DATA_EXAMPLES.find((ex) => ex.id === id);
    if (!example) return;

    const isCorrect = example.correctScale === targetScale;

    if (isCorrect) {
      setSorted((prev) => ({ ...prev, [id]: targetScale }));
      setFeedback({ message: "Correct!", isCorrect: true });
    } else {
      setFeedback({
        message: "Not quite. Think about whether this data has order or a true zero.",
        isCorrect: false,
      });
    }
    setDraggingId(null);
  }

  function handleDragLeave() {
    setOverBucket(null);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setOverBucket(null);
  }

  function handleReset() {
    const init: Record<DataType, Scale | null> = {} as Record<DataType, Scale | null>;
    DATA_EXAMPLES.forEach((e) => { init[e.id] = null; });
    setSorted(init);
    setPhase(1);
    setFeedback(null);
  }

  function handleAdvanceToPhase2() {
    setPhase(2);
  }

  const progress = [
    { label: `Cards sorted correctly: ${correctCount}/9`, done: allCorrect },
    { label: "Phase 2 unlocked", done: phase === 2 },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={allComplete} guideSlug="types-of-data-measurement-scales" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Types of Data</span>
        </nav>

        {/* Hero */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">Statistics</span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Types of Data &{" "}
            <span className="text-[var(--color-accent)]">Measurement Scales</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[680px] mb-4">
            Not all numbers are created equal. A zip code is not an income, and a star rating is not the same as a temperature.
          </p>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed max-w-[680px]">
            Data comes in four flavors based on measurement scale: <strong className="text-white">nominal</strong> (categories with no order), <strong className="text-white">ordinal</strong> (categories with order), <strong className="text-white">interval</strong> (numeric with no true zero), and <strong className="text-white">ratio</strong> (numeric with true zero). Each scale unlocks different mathematical tools.
          </p>
        </section>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {progress.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full transition-colors ${done ? "bg-[#3bb4a4]" : "bg-[#1e293b]"}`} />
              <span className={`text-[11px] ${done ? "text-white" : "text-[#475569]"}`}>{label}</span>
            </div>
          ))}
          {!session?.user && (
            <p className="text-[11px] text-[#475569] ml-auto">
              <Link href="/auth/sign-in" className="underline underline-offset-2 hover:text-[#94a3b8]">Sign in</Link>{" "}to track progress
            </p>
          )}
          <AnimatePresence>
            {allComplete && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="ml-auto text-[11px] font-semibold text-[#3bb4a4] flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Phase 1: Sorter */}
        {phase === 1 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[18px] font-bold text-white">Phase 1: Sort the Data</h2>
              <button
                onClick={handleReset}
                className="text-[11px] font-semibold text-[#94a3b8] hover:text-white border border-[#1e293b] px-2.5 py-1 rounded-lg transition-colors"
              >
                Reset
              </button>
            </div>

            {/* Feedback */}
            <div className="mb-3">
              <FeedbackPanel
                message={feedback?.message ?? null}
                isCorrect={feedback?.isCorrect ?? false}
                correctCount={correctCount}
                total={DATA_EXAMPLES.length}
              />
            </div>

            {/* Card deck */}
            <div className="mb-5" onDragEnd={handleDragEnd}>
              <CardDeck
                examples={DATA_EXAMPLES}
                placedItems={placedIds}
                onDragStart={handleDragStart}
              />
            </div>

            {/* Buckets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              {SCALES.map((scale) => {
                const itemsInBucket = DATA_EXAMPLES.filter(
                  (e) => sorted[e.id] === scale
                );
                return (
                  <ScaleBucket
                    key={scale}
                    scale={scale}
                    items={itemsInBucket}
                    isOver={overBucket === scale}
                    phase={phase}
                    onDragOver={(e) => handleDragOver(e, scale)}
                    onDrop={(e) => handleDrop(e, scale)}
                    onDragLeave={handleDragLeave}
                  />
                );
              })}
            </div>

            {/* Phase transition banner */}
            <AnimatePresence>
              {allCorrect && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-[#3bb4a4]/40 bg-[#3bb4a4]/10 p-5 text-center"
                >
                  <p className="text-[14px] font-semibold text-[#3bb4a4] mb-1">
                    Perfect! You&apos;ve classified all 9 data examples.
                  </p>
                  <p className="text-[12px] text-[#94a3b8] mb-4">
                    Now let&apos;s explore what statistical operations each scale supports.
                  </p>
                  <button
                    onClick={handleAdvanceToPhase2}
                    className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
                  >
                    Explore Valid Operations →
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Phase 2: Valid operations */}
        {phase === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[18px] font-bold text-white">Phase 2: Valid Operations</h2>
                <p className="text-[12px] text-[#94a3b8] mt-0.5">Tap or hover over each operation to see why it is valid or invalid.</p>
              </div>
              <button
                onClick={handleReset}
                className="text-[11px] font-semibold text-[#94a3b8] hover:text-white border border-[#1e293b] px-2.5 py-1 rounded-lg transition-colors"
              >
                Start Over
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {SCALES.map((scale) => {
                const items = DATA_EXAMPLES.filter((e) => sorted[e.id] === scale).map((e) => e.id);
                return (
                  <ScaleExplainer
                    key={scale}
                    scale={scale}
                    sortedItems={items}
                  />
                );
              })}
            </div>

            {/* Scale hierarchy explainer */}
            <div className="mt-6 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-3">Scale Hierarchy</p>
              <div className="flex items-center gap-2 flex-wrap text-[12px]">
                {SCALES.map((s, i) => (
                  <React.Fragment key={s}>
                    <span
                      className="px-3 py-1 rounded-lg font-semibold text-white"
                      style={{ background: SCALE_INFO[s].color + "33", border: `1px solid ${SCALE_INFO[s].color}66` }}
                    >
                      {SCALE_INFO[s].name}
                    </span>
                    {i < SCALES.length - 1 && (
                      <span className="text-[#475569]">⊂</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
              <p className="text-[11px] text-[#94a3b8] mt-2.5 leading-relaxed">
                Each scale inherits all operations of scales to its left. Ratio data supports everything; nominal data supports only counting.
              </p>
            </div>
          </motion.div>
        )}

        {/* Completion card */}
        <AnimatePresence>
          {allComplete && (
            <motion.div
              variants={card}
              initial="hidden"
              animate="visible"
              exit="hidden"
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
                  You Sorted Every Scale
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You classified all nine examples into nominal, ordinal,
                  interval, and ratio, then explored which statistical
                  operations each scale actually permits.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Examples classified correctly
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {correctCount} of {DATA_EXAMPLES.length}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      every card in its right bucket
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Scale buckets filled
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {SCALES.filter((s) => DATA_EXAMPLES.some((e) => sorted[e.id] === s)).length} of {SCALES.length}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      nominal through ratio
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Phases finished
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {phase} of 2
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      sorting, then valid operations
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Before reaching for any statistic, ask what the scale
                    permits: order, distance, and a true zero each unlock new
                    operations, and an average of ordinal codes is a claim the
                    data cannot back.&quot;
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
                    href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
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
        {!allComplete && (
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
            <Link
              href="/visual-guides/what-is-statistics"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
            >
              ← Previous: What Is Statistics?
            </Link>
            <Link
              href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
            >
              Next: Sources of Bias →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
