"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

import {
  TestingState,
  INITIAL_STATE,
  runExperimentFull,
  runExperiment,
  updateConfusionMatrix,
} from "./types";
import ExperimentDesign from "./ExperimentDesign";
import DataGroups from "./DataGroups";
import TestResults from "./TestResults";
import ConfusionMatrix from "./ConfusionMatrix";
import ResultsTracker from "./ResultsTracker";
import PowerAnalysis from "./PowerAnalysis";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

function computePowerString(state: TestingState): string {
  const { truePositives: tp, falseNegatives: fn } = state.confusionMatrix;
  const den = tp + fn;
  if (den === 0) return "—";
  return ((tp / den) * 100).toFixed(1) + "%";
}

export default function HypothesisTestingClient() {
  const { data: session } = useSession();
  const completionFired = useRef(false);

  const [state, setState] = useState<TestingState>(() => ({
    ...INITIAL_STATE,
    scenariosExplored: new Set<string>(),
  }));

  const [groupA, setGroupA] = useState<number[] | null>(null);
  const [groupB, setGroupB] = useState<number[] | null>(null);
  const [powerAnalysisViewed, setPowerAnalysisViewed] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<number>(0);
  const [isBulkRunning, setIsBulkRunning] = useState(false);

  const bulkCancelRef = useRef(false);

  // ── Completion check ──────────────────────────────────────────────────────

  const isComplete =
    state.experimentsCompleted >= 100 && state.scenariosExplored.size >= 3;

  useEffect(() => {
    if (isComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "hypothesis-testing", score: 9 }),
      }).catch(() => {});
    }
  }, [isComplete, session?.user]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleRunSingle = useCallback(() => {
    setState(prev => {
      const { result, tStat, pValue, groupA: ga, groupB: gb } =
        runExperimentFull(prev.effectSize, prev.sampleSize, prev.alpha);
      const newMatrix = updateConfusionMatrix(result, prev.effectSize, prev.confusionMatrix);
      const scenarioKey = `${prev.effectSize}-${prev.sampleSize}-${prev.alpha}`;
      const newScenarios = new Set(prev.scenariosExplored);
      newScenarios.add(scenarioKey);
      setGroupA(ga);
      setGroupB(gb);
      return {
        ...prev,
        currentResult: result,
        lastTStat: tStat,
        lastPValue: pValue,
        confusionMatrix: newMatrix,
        experimentsCompleted: prev.experimentsCompleted + 1,
        scenariosExplored: newScenarios,
      };
    });
  }, []);

  const handleRun1000 = useCallback(() => {
    if (isBulkRunning) return;
    setIsBulkRunning(true);
    bulkCancelRef.current = false;
    setBulkProgress(0);

    const BATCH = 50;
    const TOTAL = 1000;
    let completed = 0;

    // Capture current params at start of bulk run
    const { effectSize, sampleSize, alpha } = state;
    const scenarioKey = `${effectSize}-${sampleSize}-${alpha}`;

    function runBatch() {
      if (bulkCancelRef.current) {
        setIsBulkRunning(false);
        return;
      }

      let localTp = 0, localFp = 0, localFn = 0, localTn = 0;
      const batchSize = Math.min(BATCH, TOTAL - completed);

      for (let i = 0; i < batchSize; i++) {
        const result = runExperiment(effectSize, sampleSize, alpha);
        const hasEffect = effectSize > 0;
        if (result === "reject" && hasEffect) localTp++;
        else if (result === "reject" && !hasEffect) localFp++;
        else if (result === "fail-to-reject" && hasEffect) localFn++;
        else localTn++;
      }

      completed += batchSize;
      setBulkProgress(completed);

      setState(prev => {
        const newMatrix = {
          truePositives: prev.confusionMatrix.truePositives + localTp,
          falsePositives: prev.confusionMatrix.falsePositives + localFp,
          falseNegatives: prev.confusionMatrix.falseNegatives + localFn,
          trueNegatives: prev.confusionMatrix.trueNegatives + localTn,
        };
        const newScenarios = new Set(prev.scenariosExplored);
        newScenarios.add(scenarioKey);
        return {
          ...prev,
          confusionMatrix: newMatrix,
          experimentsCompleted: prev.experimentsCompleted + batchSize,
          scenariosExplored: newScenarios,
        };
      });

      if (completed < TOTAL) {
        setTimeout(runBatch, 10);
      } else {
        setIsBulkRunning(false);
        setBulkProgress(0);
      }
    }

    setTimeout(runBatch, 10);
  }, [isBulkRunning, state]);

  const handleReset = useCallback(() => {
    if (state.isRunning || isBulkRunning) return;
    bulkCancelRef.current = true;
    setState(prev => ({
      ...prev,
      currentResult: null,
      lastTStat: null,
      lastPValue: null,
      confusionMatrix: { truePositives: 0, falsePositives: 0, falseNegatives: 0, trueNegatives: 0 },
      experimentsCompleted: 0,
      scenariosExplored: new Set<string>(),
    }));
    setGroupA(null);
    setGroupB(null);
    setBulkProgress(0);
    setIsBulkRunning(false);
  }, [state.isRunning, isBulkRunning]);

  // ── Progress dots ────────────────────────────────────────────────────────

  const progress = [
    {
      label: `Experiments run: ${state.experimentsCompleted}`,
      done: state.experimentsCompleted >= 100,
    },
    {
      label: `Scenarios explored: ${state.scenariosExplored.size}/3`,
      done: state.scenariosExplored.size >= 3,
    },
  ];

  const power = computePowerString(state);
  const isRunning = state.isRunning || isBulkRunning;

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="hypothesis-testing" score={9} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Hypothesis Testing</span>
        </nav>

        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[#d4af37]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#d4af37]">
              STATISTICS
            </span>
            <span className="w-6 h-px bg-[#d4af37]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Hypothesis Testing:{" "}
            <span className="text-[#d4af37]">A Visual Experiment</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[680px]">
            Design A/B tests. Run 1000 experiments. Watch the confusion matrix
            tally true/false positives. See how power, Type I, and Type II error
            emerge from the math in real time.
          </p>
        </motion.section>

        {/* Progress tracker */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {progress.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full transition-colors"
                style={{ background: done ? "#3bb4a4" : "#1e293b" }}
              />
              <span className={`text-[11px] ${done ? "text-white" : "text-[#475569]"}`}>
                {label}
              </span>
            </div>
          ))}
          {!session?.user && (
            <p className="text-[11px] text-[#475569] ml-auto">
              <Link
                href="/auth/sign-in"
                className="underline underline-offset-2 hover:text-[#94a3b8]"
              >
                Sign in
              </Link>{" "}
              to track progress
            </p>
          )}
          <AnimatePresence>
            {isComplete && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="ml-auto text-[11px] font-semibold text-[#3bb4a4] flex items-center gap-1"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Bulk progress bar */}
        <AnimatePresence>
          {isBulkRunning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-[#94a3b8]">Running 1000 experiments…</span>
                  <span className="text-[11px] font-mono text-[#d4af37]">
                    {bulkProgress} / 1000
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[#1e293b] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-[#d4af37]"
                    animate={{ width: `${(bulkProgress / 1000) * 100}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main 2-col grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

          {/* Left column */}
          <div className="space-y-5">

            {/* Experiment design */}
            <ExperimentDesign
              effectSize={state.effectSize}
              sampleSize={state.sampleSize}
              alpha={state.alpha}
              isRunning={isRunning}
              onEffectSizeChange={v =>
                setState(prev => ({ ...prev, effectSize: v }))
              }
              onSampleSizeChange={v =>
                setState(prev => ({ ...prev, sampleSize: v }))
              }
              onAlphaChange={v =>
                setState(prev => ({ ...prev, alpha: v }))
              }
            />

            {/* Data groups viz */}
            <DataGroups
              effectSize={state.effectSize}
              sampleSize={state.sampleSize}
              groupA={groupA}
              groupB={groupB}
              showGroups={groupA !== null && groupB !== null}
            />

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <motion.button
                onClick={handleRunSingle}
                disabled={isRunning}
                whileHover={{ scale: isRunning ? 1 : 1.02 }}
                whileTap={{ scale: isRunning ? 1 : 0.98 }}
                className="px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Run Single Experiment
              </motion.button>

              <motion.button
                onClick={handleRun1000}
                disabled={isRunning}
                whileHover={{ scale: isRunning ? 1 : 1.02 }}
                whileTap={{ scale: isRunning ? 1 : 0.98 }}
                className="px-5 py-2.5 rounded-xl text-[13px] font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Run 1000 Experiments
              </motion.button>

              <button
                onClick={handleReset}
                disabled={isRunning}
                className="text-[11px] text-[#475569] hover:text-[#94a3b8] transition-colors disabled:opacity-30 disabled:cursor-not-allowed ml-auto"
              >
                Reset Results
              </button>
            </div>

            {/* Test results */}
            <TestResults
              result={state.currentResult}
              tStat={state.lastTStat}
              pValue={state.lastPValue}
              alpha={state.alpha}
            />

            {/* Power analysis collapsible */}
            <PowerAnalysis
              alpha={state.alpha}
              power={power}
              onViewed={() => setPowerAnalysisViewed(true)}
            />

            {powerAnalysisViewed && (
              <p className="text-[9px] text-[#334155] text-center">
                Power analysis section viewed
              </p>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-5">
            <ConfusionMatrix
              matrix={state.confusionMatrix}
              total={state.experimentsCompleted}
            />
            <ResultsTracker state={state} />
          </div>
        </div>

        {/* Footer nav */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link
            href="/visual-guides/sample-size-margin-of-error"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            ← Sample Size, Margin of Error &amp; Survey Design
          </Link>
          <Link
            href="/visual-guides/p-values"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            P-Values Demystified →
          </Link>
        </div>
      </div>
    </div>
  );
}
