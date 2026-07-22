"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { StageId, StageState, STAGE_CONFIGS, initialStages } from "./types";
import PipelineStage from "./PipelineStage";
import PipelineConnector from "./PipelineConnector";
import SummaryCard from "./SummaryCard";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

type Particle = { id: number; x: number; y: number; color: string; dx: number; dy: number };
function makeParticles(): Particle[] {
  const colors = ["var(--color-accent)", "#3bb4a4", "#3b82f6", "#a855f7", "#ffffff"];
  return Array.from({ length: 28 }, (_, i) => ({
    id: i, x: 30 + Math.random() * 50, y: 30 + Math.random() * 40,
    color: colors[i % colors.length],
    dx: (Math.random() - 0.5) * 90, dy: -(30 + Math.random() * 60),
  }));
}

export default function HowDatasetsAreBuiltClient() {
  const { data: session } = useSession();
  const [stages, setStages]         = useState<StageState[]>(initialStages);
  const [showSummary, setShowSummary] = useState(false);
  const [particles, setParticles]   = useState<Particle[]>([]);
  const [liveMsg, setLiveMsg]       = useState("");
  const completionFired             = useRef(false);
  const stageRefs                   = useRef<Record<StageId, HTMLDivElement | null>>({} as Record<StageId, HTMLDivElement | null>);

  const completedCount = stages.filter((s) => s.status === "completed").length;
  const allComplete    = completedCount === STAGE_CONFIGS.length;

  // Completion effect
  useEffect(() => {
    if (allComplete && !completionFired.current) {
      completionFired.current = true;
      setParticles(makeParticles());
      setLiveMsg("All 5 stages complete! Pipeline walkthrough finished.");
      const t = setTimeout(() => setShowSummary(true), 1000);
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "how-datasets-are-built", score: 100 }),
        }).catch(() => {});
      }
      return () => clearTimeout(t);
    }
  }, [allComplete, session?.user]);

  const handleToggle = useCallback((id: StageId) => {
    setStages((prev) => prev.map((s) => s.id === id ? { ...s, isExpanded: !s.isExpanded } : s));
  }, []);

  const handleChallengePassed = useCallback((id: StageId) => {
    setStages((prev) => prev.map((s) => s.id === id ? { ...s, challengePassed: true } : s));
    setLiveMsg(`Challenge passed for ${STAGE_CONFIGS.find((c) => c.id === id)?.title}. Click Continue to proceed.`);
  }, []);

  const handleContinue = useCallback((id: StageId) => {
    const idx = STAGE_CONFIGS.findIndex((c) => c.id === id);
    const nextConfig = STAGE_CONFIGS[idx + 1];

    setStages((prev) => prev.map((s) => {
      if (s.id === id)                    return { ...s, status: "completed", isExpanded: false };
      if (nextConfig && s.id === nextConfig.id) return { ...s, status: "active",    isExpanded: true  };
      return s;
    }));

    setLiveMsg(`${STAGE_CONFIGS[idx].title} complete. Moving to ${nextConfig?.title ?? "summary"}.`);

    // Scroll next stage into view
    if (nextConfig) {
      setTimeout(() => {
        stageRefs.current[nextConfig.id]?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 350);
    }
  }, []);

  function reset() {
    setStages(JSON.parse(JSON.stringify(initialStages)));
    setShowSummary(false);
    setParticles([]);
    completionFired.current = false;
    setLiveMsg("Guide reset.");
  }

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={allComplete} guideSlug="how-datasets-are-built" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Hero */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">Data &amp; Analysis</span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            How Datasets Are Built:{" "}
            <span className="text-[var(--color-accent)]">From Raw to Ready</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]">
            Follow data through every stage of the pipeline, from messy raw sources to clean, structured, analysis-ready datasets. Click each stage to explore and solve real challenges.
          </p>
        </section>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="relative h-1.5 rounded-full bg-[#1e293b] overflow-hidden">
            <motion.div className="absolute left-0 top-0 h-full rounded-full"
              style={{ background: "linear-gradient(90deg,#1e5d8a,#3bb4a4,var(--color-accent))" }}
              initial={{ width: "0%" }}
              animate={{ width: `${(completedCount / STAGE_CONFIGS.length) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-[12px] text-[#94a3b8]">{completedCount} of {STAGE_CONFIGS.length} stages completed</p>
            {!session?.user && (
              <p className="text-[11px] text-[#475569]">
                <Link href="/auth/sign-in" className="hover:text-[#94a3b8] transition-colors underline underline-offset-2">Sign in</Link>{" "}to track your progress
              </p>
            )}
          </div>
        </div>

        {/* Pipeline stages */}
        <div className="max-w-3xl mx-auto">
          {STAGE_CONFIGS.map((config, i) => {
            const state = stages.find((s) => s.id === config.id)!;
            const prevCompleted = i === 0 || stages[i - 1].status === "completed";
            return (
              <div key={config.id} ref={(el) => { stageRefs.current[config.id] = el; }}>
                <PipelineStage
                  config={config}
                  state={state}
                  onToggle={handleToggle}
                  onChallengePassed={handleChallengePassed}
                  onContinue={handleContinue}
                />
                {i < STAGE_CONFIGS.length - 1 && (
                  <PipelineConnector activated={state.status === "completed"} color={config.color} />
                )}
              </div>
            );
          })}

          {/* Summary card */}
          <AnimatePresence>
            {showSummary && (
              <SummaryCard
                stagesCompleted={completedCount}
                challengesPassed={stages.filter((s) => s.challengePassed).length}
                onReset={reset}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Particle burst */}
      {particles.length > 0 && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
          {particles.map((p) => (
            <motion.div key={p.id}
              initial={{ x: `${p.x}vw`, y: `${p.y}vh`, scale: 1, opacity: 1 }}
              animate={{ x: `calc(${p.x}vw + ${p.dx}px)`, y: `calc(${p.y}vh + ${p.dy}px)`, scale: 0, opacity: 0 }}
              transition={{ duration: 1.2, delay: p.id * 0.02, ease: "easeOut" }}
              onAnimationComplete={() => { if (p.id === particles.length - 1) setParticles([]); }}
              className="absolute w-2 h-2 rounded-full"
              style={{ background: p.color }}
            />
          ))}
        </div>
      )}

      {/* ARIA live region */}
      <div aria-live="polite" className="sr-only">{liveMsg}</div>
    </div>
  );
}
