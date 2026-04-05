"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

import type { OptimizerConfig, OptimizerType, TrajectoryPoint } from "./types";
import {
  computeSGD,
  computeMomentum,
  computeRMSProp,
  computeAdam,
  DEFAULT_CONFIGS,
} from "./optimizerLogic";
import LossLandscape from "./LossLandscape";
import OptimizerToggle from "./OptimizerToggle";
import LearningRateSliders from "./LearningRateSliders";
import RaceControls from "./RaceControls";
import ConvergenceTable from "./ConvergenceTable";

const MAX_STEPS = 40;

const INITIAL_CONFIGS: OptimizerConfig[] = [
  { id: "sgd", label: "SGD", color: "#ef4444", lr: DEFAULT_CONFIGS.sgd, enabled: true },
  { id: "momentum", label: "SGD + Momentum", color: "#d4af37", lr: DEFAULT_CONFIGS.momentum, enabled: true },
  { id: "rmsprop", label: "RMSProp", color: "#1e5d8a", lr: DEFAULT_CONFIGS.rmsprop, enabled: true },
  { id: "adam", label: "Adam", color: "#3bb4a4", lr: DEFAULT_CONFIGS.adam, enabled: true },
];

function computeTrajectories(configs: OptimizerConfig[]): Record<string, TrajectoryPoint[]> {
  const result: Record<string, TrajectoryPoint[]> = {};
  for (const cfg of configs) {
    switch (cfg.id) {
      case "sgd": result[cfg.id] = computeSGD(cfg.lr); break;
      case "momentum": result[cfg.id] = computeMomentum(cfg.lr); break;
      case "rmsprop": result[cfg.id] = computeRMSProp(cfg.lr); break;
      case "adam": result[cfg.id] = computeAdam(cfg.lr); break;
    }
  }
  return result;
}

export default function OptimizersRaceClient() {
  const { data: session } = useSession();
  const [configs, setConfigs] = useState<OptimizerConfig[]>(INITIAL_CONFIGS);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<0.5 | 1 | 2>(1);
  const [hasWatchedRace, setHasWatchedRace] = useState(false);
  const [hasAdjustedLR, setHasAdjustedLR] = useState(false);
  const [hasToggledOptimizer, setHasToggledOptimizer] = useState(false);
  const completionFired = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const trajectories = useMemo(() => computeTrajectories(configs), [configs]);

  const raceComplete = currentStep >= MAX_STEPS;
  const isComplete = hasWatchedRace && (hasAdjustedLR || hasToggledOptimizer);

  // Progress percentage
  const progressPct = Math.min(
    (hasWatchedRace ? 50 : (currentStep / 30) * 50) +
      ((hasAdjustedLR ? 25 : 0) + (hasToggledOptimizer ? 25 : 0)),
    100
  );

  // Fire completion
  useEffect(() => {
    if (isComplete && !completionFired.current) {
      completionFired.current = true;
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "optimizers-race", score: 100 }),
        }).catch(() => {});
      }
    }
  }, [isComplete, session?.user]);

  // Track watched race
  useEffect(() => {
    if (currentStep >= 30 && !hasWatchedRace) {
      setHasWatchedRace(true);
    }
  }, [currentStep, hasWatchedRace]);

  // Animation loop
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!isPlaying) return;

    const ms = speed === 0.5 ? 200 : speed === 2 ? 50 : 100;
    intervalRef.current = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= MAX_STEPS) {
          setIsPlaying(false);
          return MAX_STEPS;
        }
        return prev + 1;
      });
    }, ms);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, speed]);

  // Stop when complete
  useEffect(() => {
    if (currentStep >= MAX_STEPS && isPlaying) {
      setIsPlaying(false);
    }
  }, [currentStep, isPlaying]);

  const handleToggle = useCallback((id: OptimizerType) => {
    setConfigs((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    );
    setHasToggledOptimizer(true);
  }, []);

  const handleLRChange = useCallback((id: OptimizerType, lr: number) => {
    setConfigs((prev) =>
      prev.map((c) => (c.id === id ? { ...c, lr } : c))
    );
    setHasAdjustedLR(true);
    // Reset race when LR changes
    setCurrentStep(0);
    setIsPlaying(false);
  }, []);

  const handleStart = useCallback(() => {
    if (currentStep >= MAX_STEPS) return;
    setIsPlaying(true);
  }, [currentStep]);

  const handlePause = useCallback(() => setIsPlaying(false), []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(0);
  }, []);

  const handleSpeedChange = useCallback((s: 0.5 | 1 | 2) => setSpeed(s), []);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <div className="max-w-[1300px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#94a3b8] mb-6" aria-label="Breadcrumb">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-[#94a3b8]">Deep Learning</span>
          <span>/</span>
          <span className="text-white">Optimizers Race: SGD vs Adam vs RMSProp</span>
        </nav>

        {/* Hero */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-4 border"
            style={{ background: "#a855f715", borderColor: "#a855f740" }}>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#a855f7" }}>
              Deep Learning
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Optimizers Race: SGD vs Adam vs RMSProp
          </h1>
          <p className="text-[#94a3b8] text-base max-w-2xl leading-relaxed">
            Watch SGD, Adam, and RMSProp descend the same loss landscape simultaneously.
            See why adaptive optimizers converge faster on non-uniform loss surfaces — and
            tune learning rates to explore their trade-offs.
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
              style={{ background: "linear-gradient(90deg, #1e5d8a, #3bb4a4)" }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-4 text-[11px] text-[#475569]">
              <span className={hasWatchedRace ? "text-[#3bb4a4]" : ""}>
                {hasWatchedRace ? "✓" : "○"} Watch race to step 30
              </span>
              <span className={hasAdjustedLR ? "text-[#3bb4a4]" : ""}>
                {hasAdjustedLR ? "✓" : "○"} Adjust a learning rate
              </span>
              <span className={hasToggledOptimizer ? "text-[#3bb4a4]" : ""}>
                {hasToggledOptimizer ? "✓" : "○"} Toggle an optimizer
              </span>
            </div>
            {!session?.user && (
              <p className="text-[11px] text-[#475569]">Sign in to save progress</p>
            )}
          </div>
          {isComplete && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-xs text-[#3bb4a4] font-semibold"
            >
              Guide complete! You understand optimizer trade-offs.
            </motion.p>
          )}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">

          {/* Left: landscape + controls */}
          <div className="flex flex-col gap-5">

            {/* Section: The Race */}
            <section className="bg-[#1e293b]/60 border border-[#1e293b] rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-[#1e293b]">
                <h2 className="text-base font-semibold text-white mb-3">The Race</h2>
                <OptimizerToggle configs={configs} onToggle={handleToggle} />
              </div>

              {/* Loss landscape */}
              <div className="p-4">
                <LossLandscape
                  currentStep={currentStep}
                  configs={configs}
                  trajectories={trajectories}
                />
              </div>

              {/* Race controls */}
              <div className="px-4 pb-4">
                <RaceControls
                  isPlaying={isPlaying}
                  currentStep={currentStep}
                  speed={speed}
                  raceComplete={raceComplete}
                  onStart={handleStart}
                  onPause={handlePause}
                  onReset={handleReset}
                  onSpeedChange={handleSpeedChange}
                />
              </div>
            </section>

            {/* Section: Results (only when race complete) */}
            <AnimatePresence>
              {raceComplete && (
                <motion.section
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="bg-[#1e293b]/60 border border-[#1e293b] rounded-2xl p-5"
                >
                  <h2 className="text-base font-semibold text-white mb-4">Results</h2>
                  <ConvergenceTable configs={configs} trajectories={trajectories} />
                </motion.section>
              )}
            </AnimatePresence>

            {/* Gold insight box */}
            <div className="rounded-2xl border border-[#d4af37]/25 bg-[#d4af37]/[0.05] p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[#d4af37] text-sm font-semibold uppercase tracking-wide">
                  Practitioner Insight
                </span>
              </div>
              <p className="text-sm text-[#94a3b8] leading-relaxed">
                <span className="text-white font-medium">Adam</span> is the default choice for most deep
                learning today — but it can generalize slightly worse than SGD+Momentum on some tasks.
                Many practitioners train with Adam then fine-tune with SGD for better final performance.
              </p>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-[#1e293b]">
              <Link
                href="/visual-guides/batch-normalization"
                className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white transition-colors"
              >
                <span>&#8592;</span>
                <span>Batch Normalization</span>
              </Link>
              <Link
                href="/visual-guides"
                className="text-sm text-[#94a3b8] hover:text-white transition-colors"
              >
                All Guides
              </Link>
              <Link
                href="/visual-guides/gans"
                className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white transition-colors"
              >
                <span>GANs</span>
                <span>&#8594;</span>
              </Link>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="flex flex-col gap-5">

            {/* Section: Tune Learning Rates */}
            <section className="bg-[#1e293b]/60 border border-[#1e293b] rounded-2xl p-5">
              <h2 className="text-base font-semibold text-white mb-1">Tune Learning Rates</h2>
              <p className="text-xs text-[#475569] mb-4 leading-relaxed">
                Change a learning rate and the trajectories recompute instantly.
                Watch how each optimizer responds differently.
              </p>
              <LearningRateSliders configs={configs} onChange={handleLRChange} />
            </section>

            {/* Optimizer legend */}
            <section className="bg-[#1e293b]/60 border border-[#1e293b] rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-white mb-3">Loss Surface</h2>
              <p className="text-xs text-[#94a3b8] leading-relaxed mb-3">
                The landscape is <code className="text-[#3bb4a4]">L(x,y) = 0.1x² + 2y²</code> — an
                elongated bowl. The steep y-axis causes SGD to oscillate while adaptive
                optimizers glide smoothly.
              </p>
              <div className="flex flex-col gap-2 text-xs text-[#94a3b8]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-0.5 rounded" style={{ background: "#d4af37", display: "inline-block" }} />
                  <span>Gold star = global minimum (0, 0)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border border-[#94a3b8]" style={{ background: "white", display: "inline-block" }} />
                  <span>White dot = starting point (−3, 2)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#3bb4a4] text-[10px] border border-[#3bb4a4]/40 px-1 rounded">ellipses</span>
                  <span>Contour lines of equal loss</span>
                </div>
              </div>
            </section>

            {/* Live stats panel */}
            <section className="bg-[#1e293b]/60 border border-[#1e293b] rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-white mb-3">Current Loss</h2>
              <div className="flex flex-col gap-2">
                {configs.filter((c) => c.enabled).map((cfg) => {
                  const traj = trajectories[cfg.id];
                  const pt = traj?.[Math.min(currentStep, traj.length - 1)];
                  if (!pt) return null;
                  return (
                    <div key={cfg.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: cfg.color }}
                        />
                        <span className="text-xs text-[#94a3b8]">{cfg.label}</span>
                      </div>
                      <span className="font-mono text-xs font-semibold text-white tabular-nums">
                        {pt.loss.toFixed(4)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
