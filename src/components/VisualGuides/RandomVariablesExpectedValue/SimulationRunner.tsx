"use client";

import React, { useRef, useCallback } from "react";
import type { PayoutRow, SimState, HistoryPoint } from "./types";
import { computeEV, probabilitiesValid, sampleOutcome } from "./types";
import ConvergenceChart from "./ConvergenceChart";

interface SimulationRunnerProps {
  rows: PayoutRow[];
  sim: SimState;
  onSimUpdate: (updated: SimState) => void;
  onSimComplete: () => void;
}

export default function SimulationRunner({
  rows,
  sim,
  onSimUpdate,
  onSimComplete,
}: SimulationRunnerProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isValid = probabilitiesValid(rows);
  const theoreticalEV = computeEV(rows);

  const stopInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  function startSimulation(total: number) {
    if (sim.isRunning || !isValid) return;

    stopInterval();

    let trialCount = 0;
    let runningSum = 0;
    const history: HistoryPoint[] = [];

    onSimUpdate({
      isRunning: true,
      trialCount: 0,
      runningSum: 0,
      runningAvg: 0,
      history: [],
      completed: false,
      totalTrials: total,
    });

    const CHUNK = 100;
    const TICK_MS = 50;
    // Sample at most 200 points for the chart
    const sampleEvery = Math.max(1, Math.floor(total / 200));

    intervalRef.current = setInterval(() => {
      const remaining = total - trialCount;
      const batch = Math.min(CHUNK, remaining);

      for (let i = 0; i < batch; i++) {
        trialCount += 1;
        runningSum += sampleOutcome(rows);

        if (trialCount % sampleEvery === 0) {
          history.push({ trial: trialCount, avg: runningSum / trialCount });
        }
      }

      const runningAvg = trialCount > 0 ? runningSum / trialCount : 0;

      if (trialCount >= total) {
        stopInterval();
        // Ensure final point
        if (history.length === 0 || history[history.length - 1].trial !== trialCount) {
          history.push({ trial: trialCount, avg: runningAvg });
        }
        onSimUpdate({
          isRunning: false,
          trialCount,
          runningSum,
          runningAvg,
          history: [...history],
          completed: true,
          totalTrials: total,
        });
        onSimComplete();
      } else {
        onSimUpdate({
          isRunning: true,
          trialCount,
          runningSum,
          runningAvg,
          history: [...history],
          completed: false,
          totalTrials: total,
        });
      }
    }, TICK_MS);
  }

  const progress =
    sim.trialCount > 0 && sim.isRunning
      ? (sim.trialCount / sim.totalTrials) * 100
      : 0;

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-1">
          Simulation
        </p>
        <p className="text-[12px] text-[#475569]">
          Run thousands of random draws to verify the Law of Large Numbers
        </p>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          disabled={sim.isRunning || !isValid}
          onClick={() => startSimulation(1000)}
          className="px-5 py-2 text-[13px] rounded-xl font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          Run 1,000 Trials
        </button>
        <button
          disabled={sim.isRunning || !isValid}
          onClick={() => startSimulation(10000)}
          className="px-5 py-2 text-[13px] rounded-xl font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Run 10,000 Trials
        </button>
        {sim.isRunning && (
          <span className="text-[12px] text-[#94a3b8] font-mono animate-pulse">
            Running…
          </span>
        )}
        {!isValid && (
          <span className="text-[12px] text-[#f97316]">
            Fix probabilities first (must sum to 1.0)
          </span>
        )}
      </div>

      {/* Progress bar */}
      {sim.isRunning && (
        <div className="space-y-1.5">
          <div className="h-1.5 w-full rounded-full bg-[#1e293b] overflow-hidden">
            <div
              className="h-full bg-[#d4af37] rounded-full transition-[width] duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11px] text-[#94a3b8] font-mono">
            {sim.trialCount.toLocaleString()} / {sim.totalTrials.toLocaleString()} trials
          </p>
        </div>
      )}

      {/* Stats */}
      {sim.trialCount > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-3 text-center">
            <p className="text-[10px] text-[#94a3b8] mb-1">Trials Run</p>
            <p className="text-[16px] font-bold text-white font-mono">
              {sim.trialCount.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-3 text-center">
            <p className="text-[10px] text-[#94a3b8] mb-1">Running Average</p>
            <p
              className={`text-[16px] font-bold font-mono ${
                sim.runningAvg > 0.005
                  ? "text-[#3bb4a4]"
                  : sim.runningAvg < -0.005
                  ? "text-[#ef4444]"
                  : "text-[#94a3b8]"
              }`}
            >
              {sim.runningAvg >= 0 ? "+" : ""}
              {sim.runningAvg.toFixed(4)}
            </p>
          </div>
          <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-3 text-center">
            <p className="text-[10px] text-[#94a3b8] mb-1">Theoretical EV</p>
            <p
              className={`text-[16px] font-bold font-mono ${
                theoreticalEV > 0.005
                  ? "text-[#3bb4a4]"
                  : theoreticalEV < -0.005
                  ? "text-[#ef4444]"
                  : "text-[#94a3b8]"
              }`}
            >
              {theoreticalEV >= 0 ? "+" : ""}
              {theoreticalEV.toFixed(4)}
            </p>
          </div>
        </div>
      )}

      {/* Convergence chart */}
      {(sim.history.length > 0 || sim.isRunning) && (
        <ConvergenceChart
          history={sim.history}
          theoreticalEV={theoreticalEV}
          totalTrials={sim.totalTrials}
          isComplete={sim.completed}
        />
      )}
    </div>
  );
}
