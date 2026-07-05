"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

import { TRAINING_STEPS } from "./ganLogic";
import GANDiagram from "./GANDiagram";
import GeneratorOutput from "./GeneratorOutput";
import TrainingChart from "./TrainingChart";
import TrainingControls from "./TrainingControls";
import ProblemExplorer from "./ProblemExplorer";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import { useGuideMotion } from "@/lib/guideMotion";

export default function GANsClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();

  const [currentEpoch, setCurrentEpoch] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2>(1);
  const [hasReachedEpoch20, setHasReachedEpoch20] = useState(false);
  const [hasViewedProblems, setHasViewedProblems] = useState(false);
  const completionFired = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isComplete = hasReachedEpoch20 && hasViewedProblems;
  const progressPct = Math.min(
    (hasReachedEpoch20 ? 60 : (currentEpoch / 20) * 60) +
      (hasViewedProblems ? 40 : 0),
    100
  );

  const step = TRAINING_STEPS[currentEpoch];

  // Track epoch 20
  useEffect(() => {
    if (currentEpoch >= 20 && !hasReachedEpoch20) {
      setHasReachedEpoch20(true);
    }
  }, [currentEpoch, hasReachedEpoch20]);

  // Fire completion
  useEffect(() => {
    if (isComplete && !completionFired.current) {
      completionFired.current = true;
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "gans", score: 100 }),
        }).catch(() => {});
      }
    }
  }, [isComplete, session?.user]);

  // Animation interval
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!isPlaying) return;

    const ms = speed === 2 ? 400 : 800;
    intervalRef.current = setInterval(() => {
      setCurrentEpoch((prev) => {
        if (prev >= 30) {
          setIsPlaying(false);
          return 30;
        }
        return prev + 1;
      });
    }, ms);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, speed]);

  // Stop when done
  useEffect(() => {
    if (currentEpoch >= 30 && isPlaying) {
      setIsPlaying(false);
    }
  }, [currentEpoch, isPlaying]);

  const handlePlay = useCallback(() => {
    if (currentEpoch >= 30) return;
    setIsPlaying(true);
  }, [currentEpoch]);

  const handlePause = useCallback(() => setIsPlaying(false), []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentEpoch(0);
  }, []);

  const handleSpeedChange = useCallback((s: 1 | 2) => setSpeed(s), []);

  const handleProblemsExpand = useCallback(() => {
    setHasViewedProblems(true);
  }, []);

  const handleFullReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentEpoch(0);
    setHasReachedEpoch20(false);
    setHasViewedProblems(false);
  }, []);

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="gans" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#475569] mb-6">
          <Link href="/visual-guides" className="hover:text-[var(--color-accent)] transition-colors">
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-[#94a3b8]">GANs: The Art of Faking It</span>
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
            GANs: <span className="text-[var(--color-accent)]">The Art of Faking It</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]">
            Watch a generator evolve from pure noise to convincing images while the discriminator
            fights back. Understand adversarial training, Nash equilibrium, and why GANs are both
            powerful and notoriously tricky to train.
          </p>
        </section>

        {/* Progress bar */}
        <div className="mb-8 bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#94a3b8]">Exploration Progress</span>
            <span className="text-sm font-semibold text-white">
              {isComplete ? "Complete!" : `${Math.round(progressPct)}%`}
            </span>
          </div>
          <div className="h-2 bg-[#0f172a] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #1e5d8a, #a855f7)" }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex flex-wrap gap-3 text-[11px] text-[#475569]">
              <span className={hasReachedEpoch20 ? "text-[#3bb4a4]" : ""}>
                {hasReachedEpoch20 ? "✓" : "○"} Train to epoch 20
              </span>
              <span className={hasViewedProblems ? "text-[#3bb4a4]" : ""}>
                {hasViewedProblems ? "✓" : "○"} Explore a GAN problem
              </span>
            </div>
            {!session?.user && (
              <p className="text-[11px] text-[#475569]">Sign in to save progress</p>
            )}
          </div>
          <AnimatePresence>
            {isComplete && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-2 text-xs text-[var(--color-success)] font-semibold"
              >
                Guide complete! You understand how GANs work.
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Section: The Architecture */}
        <section className="bg-[#1e293b]/60 border border-[#1e293b] rounded-2xl p-5 mb-6">
          <h2 className="text-base font-semibold text-white mb-4">The Architecture</h2>
          <GANDiagram phase={step.phase} step={step} />
        </section>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">

          {/* Left: Training Simulation */}
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold text-white mb-3">Training Simulation</h2>
              <TrainingControls
                isPlaying={isPlaying}
                currentEpoch={currentEpoch}
                speed={speed}
                phase={step.phase}
                onPlay={handlePlay}
                onPause={handlePause}
                onReset={handleReset}
                onSpeedChange={handleSpeedChange}
              />
            </div>
            <GeneratorOutput step={step} />
          </div>

          {/* Right: Training Dynamics */}
          <div>
            <h2 className="text-base font-semibold text-white mb-3">Training Dynamics</h2>
            <TrainingChart currentEpoch={currentEpoch} />
          </div>
        </div>

        {/* Section: What Can Go Wrong */}
        <section className="mb-6">
          <h2 className="text-base font-semibold text-white mb-3">What Can Go Wrong?</h2>
          <p className="text-xs text-[#475569] mb-4 leading-relaxed">
            GANs are notoriously difficult to train. Expand each problem to understand
            why GANs fail and how researchers work around them.
          </p>
          <ProblemExplorer onExpand={handleProblemsExpand} />
        </section>

        {/* Gold insight box */}
        <div className="rounded-2xl border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/[0.05] p-5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[var(--color-accent)] text-sm font-semibold uppercase tracking-wide">
              Historical Insight
            </span>
          </div>
          <p className="text-sm text-[#94a3b8] leading-relaxed">
            <span className="text-white font-medium">GANs were invented by Ian Goodfellow in 2014</span> at a bar
            after a debate with colleagues about generative models. He coded up the first working version
            that same night. Successors like <span className="text-white font-medium">StyleGAN</span> pushed
            the adversarial idea to photorealistic faces. Today&apos;s image generators such as{" "}
            <span className="text-white font-medium">DALL-E and Stable Diffusion</span> are a different
            lineage: DALL-E 1 was autoregressive, while DALL-E 2/3 and Stable Diffusion are{" "}
            <Link href="/visual-guides/diffusion-models" className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80 transition-opacity">
              diffusion models
            </Link>
            , which largely replaced GANs for image generation, though GAN-style adversarial losses still
            appear inside some of their components.
          </p>
        </div>

        {/* Completion card */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              variants={card}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0 }}
              className="mt-8 rounded-2xl border border-white/[0.08] bg-[#0f172a] overflow-hidden"
            >
              <div className="px-6 pt-6 pb-4 border-b border-white/[0.07]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-px bg-[var(--color-accent)]" />
                  <span className="text-[10px] font-semibold uppercase tracking-[2px] text-[var(--color-accent)]">
                    Guide Complete
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">Adversarial Training Mastered!</h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You trained a GAN to equilibrium and explored the failure modes that make them notoriously tricky.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Epochs trained", value: `${currentEpoch} / 30`, color: "#a855f7" },
                    { label: "Nash equilibrium", value: "log(2)", color: "var(--color-accent)" },
                    { label: "Failure modes", value: "Explored", color: "#3bb4a4" },
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
                    &quot;A GAN is a two-player game: the generator learns by trying to fool a critic that is learning right back. Training succeeds when neither side can improve, not when a loss hits zero.&quot;
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-3">
                <Link href="/visual-guides"
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors">
                  ← All Guides
                </Link>
                <div className="flex items-center gap-3">
                  <button onClick={handleFullReset}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors">
                    Try Again
                  </button>
                  <Link href="/visual-guides/loss-functions"
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
            <Link href="/visual-guides/loss-functions"
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
              Next Guide →
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
