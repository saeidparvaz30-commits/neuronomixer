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

export default function GANsClient() {
  const { data: session } = useSession();

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

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <div className="max-w-[1300px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#94a3b8] mb-6 flex-wrap" aria-label="Breadcrumb">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-[#94a3b8]">Deep Learning</span>
          <span>/</span>
          <span className="text-white">GANs: The Art of Faking It</span>
        </nav>

        {/* Hero */}
        <div className="mb-8">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-4 border"
            style={{ background: "#a855f715", borderColor: "#a855f740" }}
          >
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "#a855f7" }}
            >
              Deep Learning
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            GANs: The Art of Faking It
          </h1>
          <p className="text-[#94a3b8] text-base max-w-2xl leading-relaxed">
            Watch a generator evolve from pure noise to convincing images while the discriminator
            fights back. Understand adversarial training, Nash equilibrium, and why GANs are both
            powerful and notoriously tricky to train.
          </p>
        </div>

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
                className="mt-2 text-xs text-[#3bb4a4] font-semibold"
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
        <div className="rounded-2xl border border-[#d4af37]/25 bg-[#d4af37]/[0.05] p-5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[#d4af37] text-sm font-semibold uppercase tracking-wide">
              Historical Insight
            </span>
          </div>
          <p className="text-sm text-[#94a3b8] leading-relaxed">
            <span className="text-white font-medium">GANs were invented by Ian Goodfellow in 2014</span> at a bar
            after a debate with colleagues about generative models. He coded up the first working version
            that same night. Modern variants like{" "}
            <span className="text-white font-medium">StyleGAN, DALL-E, and Stable Diffusion</span> generate
            photorealistic images, video, and audio — all building on that original adversarial idea.
          </p>
        </div>

        {/* Summary card on completion */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-2xl border border-[#3bb4a4]/30 bg-[#3bb4a4]/[0.05] p-5 mb-6"
            >
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-[#3bb4a4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[#3bb4a4] font-semibold text-sm">
                  You&apos;ve completed the Deep Learning section!
                </span>
              </div>
              <p className="text-xs text-[#94a3b8] mb-3 leading-relaxed">
                Next up: Large Language Models — how transformers read, understand, and generate text at scale.
              </p>
              <Link
                href="/visual-guides"
                className="inline-flex items-center gap-1.5 text-sm text-[#3bb4a4] hover:text-white transition-colors font-semibold"
              >
                <span>Next: Large Language Models</span>
                <span>→</span>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-[#1e293b]">
          <Link
            href="/visual-guides/optimizers-race"
            className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white transition-colors"
          >
            <span>←</span>
            <span>Optimizers Race</span>
          </Link>
          <Link
            href="/visual-guides"
            className="text-sm text-[#94a3b8] hover:text-white transition-colors"
          >
            All Guides
          </Link>
          <Link
            href="/visual-guides"
            className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white transition-colors"
          >
            <span>Next Guides</span>
            <span>→</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
