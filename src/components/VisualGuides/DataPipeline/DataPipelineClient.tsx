"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";
import { StageId, PIPELINE_STAGES, RAW_DATA } from "./types";
import PipelineFlow from "./PipelineFlow";
import DataTable from "./DataTable";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

const NEXT_GUIDE_SLUG = "what-is-ml";

export default function DataPipelineClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();
  const [activeStage, setActiveStage] = useState<StageId>("ingest");
  const [completedStages, setCompletedStages] = useState<Set<StageId>>(new Set(["ingest"]));
  const completionFired = useRef(false);

  const allStagesSeen = completedStages.size >= 6;

  const flaggedRows = RAW_DATA.filter(r => r.issues.length > 0).length;
  const cleanRows = RAW_DATA.filter(r => !r.issues.includes("duplicate")).length;

  function handleReset() {
    setActiveStage("ingest");
    setCompletedStages(new Set(["ingest"]));
  }

  useEffect(() => {
    if (allStagesSeen && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "data-pipeline", score: 100 }),
      }).catch(() => {});
    }
  }, [allStagesSeen, session?.user]);

  function handleSelectStage(id: StageId) {
    setActiveStage(id);
    setCompletedStages(prev => new Set([...prev, id]));
  }

  const stage = PIPELINE_STAGES.find(s => s.id === activeStage)!;

  const progress = [
    { label: `Stages explored: ${completedStages.size}/6`, done: allStagesSeen },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={allStagesSeen} guideSlug="data-pipeline" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Data Pipeline</span>
        </nav>

        {/* Hero */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              Data Engineering
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Data Pipeline:{" "}
            <span className="text-[var(--color-accent)]">Raw to Ready</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[620px]">
            12 messy employee records, 6 pipeline stages. Follow the data as it transforms from raw CSV,
            with nulls, duplicates, and outliers, into a clean, aggregated dataset ready for analysis.
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
            {allStagesSeen && (
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

        {/* Pipeline flow diagram */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-4">
            Click any stage to explore
          </p>
          <PipelineFlow
            activeStage={activeStage}
            completedStages={completedStages}
            onSelectStage={handleSelectStage}
          />
        </div>

        {/* Stage detail */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6"
          >
            {/* Data table */}
            <div className="rounded-2xl border bg-[#0f172a] overflow-hidden" style={{ borderColor: `color-mix(in srgb, ${stage.color} 19%, transparent)` }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: `color-mix(in srgb, ${stage.color} 13%, transparent)` }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[18px]">{stage.icon}</span>
                  <h2 className="text-[14px] font-bold" style={{ color: stage.color }}>{stage.label} Stage</h2>
                </div>
                <p className="text-[12px] text-[#94a3b8]">{stage.detail}</p>
              </div>
              <div className="p-2">
                <DataTable stage={activeStage} />
              </div>
            </div>

            {/* Stage info panel */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
                <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">{stage.description}</p>
                <div className="rounded-lg p-3" style={{ background: `color-mix(in srgb, ${stage.color} 5%, transparent)`, border: `1px solid color-mix(in srgb, ${stage.color} 15%, transparent)` }}>
                  <p className="text-[10px] font-semibold uppercase tracking-[1px] mb-2" style={{ color: stage.color }}>
                    Output
                  </p>
                  <p className="text-[13px] font-bold text-white">{stage.outputLabel}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[#475569] mb-2">
                  Common Tools
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {stage.tools.map(t => (
                    <span
                      key={t}
                      className="px-2 py-1 rounded-lg text-[10px] font-medium border border-[#1e293b] text-[#94a3b8]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Stage navigation */}
              <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[#475569] mb-2">
                  Navigate Stages
                </p>
                <div className="flex gap-2">
                  {(() => {
                    const idx = PIPELINE_STAGES.findIndex(s => s.id === activeStage);
                    const prev = PIPELINE_STAGES[idx - 1];
                    const next = PIPELINE_STAGES[idx + 1];
                    return (
                      <>
                        <button
                          onClick={() => prev && handleSelectStage(prev.id)}
                          disabled={!prev}
                          className="flex-1 py-2 rounded-xl text-[11px] font-semibold border border-[#1e293b] text-[#475569] disabled:opacity-30 hover:border-white hover:text-white transition-colors"
                        >
                          ← {prev?.label ?? "—"}
                        </button>
                        <button
                          onClick={() => next && handleSelectStage(next.id)}
                          disabled={!next}
                          className="flex-1 py-2 rounded-xl text-[11px] font-semibold border border-[#1e293b] text-[#475569] disabled:opacity-30 hover:border-white hover:text-white transition-colors"
                        >
                          {next?.label ?? "—"} →
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Completion card */}
        <AnimatePresence>
          {allStagesSeen && (
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
                  You Followed the Data Home
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You walked all six stages and watched 12 messy employee records become
                  warehouse-ready summaries, with every fix visible along the way.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Stages explored</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {completedStages.size} of {PIPELINE_STAGES.length}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      ingest through load
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Records in vs out</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {RAW_DATA.length} → {cleanRows}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      one exact duplicate dropped
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Rows flagged</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {flaggedRows} of {RAW_DATA.length}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      nulls, outlier, typo, type error
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Most of data work happens before the first chart: validating,
                    cleaning, transforming, and aggregating. A model or dashboard built
                    on an unexamined pipeline inherits every flaw the pipeline let
                    through.&quot;
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
        {!allStagesSeen && (
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
            <Link
              href="/visual-guides/data-distributions"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
            >
              ← Previous Guide
            </Link>
            <Link
              href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
            >
              Next: What Is Machine Learning? The Big Picture →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
