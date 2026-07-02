"use client";

import React, { useRef, useCallback, useState } from "react";
import { type CompoundEvent, type SimState, type TrialResult, simulateTrial, simulateTrialDetailed, DEFAULT_SIM } from "./types";
import TrialCounter from "./TrialCounter";
import TrialVisualizer from "./TrialVisualizer";

// ── Convergence chart ─────────────────────────────────────────────────────────

interface ConvergenceChartProps {
  history: number[];
  theoretical: number;
  totalTrials: number;
}

function ConvergenceChart({ history, theoretical, totalTrials }: ConvergenceChartProps) {
  const W = 560;
  const H = 200;
  const PAD = { top: 16, right: 16, bottom: 32, left: 44 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const pointCount = history.length;
  const stepSize = 50; // one point every 50 trials

  function xOf(i: number) {
    // i is the index of the history point (each point = 50 trials)
    const trial = (i + 1) * stepSize;
    return PAD.left + (trial / totalTrials) * innerW;
  }

  function yOf(p: number) {
    return PAD.top + innerH - p * innerH;
  }

  // Build path for blue experimental line
  const linePath =
    pointCount < 2
      ? ""
      : history
          .map((p, i) => `${i === 0 ? "M" : "L"} ${xOf(i).toFixed(1)} ${yOf(p).toFixed(1)}`)
          .join(" ");

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ maxHeight: 200 }}
      aria-label="Convergence chart"
    >
      {/* Grid lines */}
      {yTicks.map((t) => (
        <line
          key={t}
          x1={PAD.left}
          y1={yOf(t)}
          x2={PAD.left + innerW}
          y2={yOf(t)}
          stroke="#1e293b"
          strokeWidth={1}
        />
      ))}

      {/* Y-axis labels */}
      {yTicks.map((t) => (
        <text
          key={t}
          x={PAD.left - 6}
          y={yOf(t) + 4}
          textAnchor="end"
          fill="#475569"
          fontSize={10}
        >
          {t.toFixed(2)}
        </text>
      ))}

      {/* X-axis label */}
      <text
        x={PAD.left + innerW / 2}
        y={H - 4}
        textAnchor="middle"
        fill="#475569"
        fontSize={10}
      >
        Trials
      </text>

      {/* Theoretical P — red horizontal line */}
      <line
        x1={PAD.left}
        y1={yOf(theoretical)}
        x2={PAD.left + innerW}
        y2={yOf(theoretical)}
        stroke="#ef4444"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
      <text
        x={PAD.left + innerW - 2}
        y={yOf(theoretical) - 4}
        textAnchor="end"
        fill="#ef4444"
        fontSize={9}
      >
        Theory {theoretical.toFixed(3)}
      </text>

      {/* Experimental line — blue */}
      {linePath && (
        <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth={1.8} strokeLinejoin="round" />
      )}

      {/* Dots */}
      {history.map((p, i) => (
        <circle key={i} cx={xOf(i)} cy={yOf(p)} r={2.5} fill="#3b82f6" />
      ))}
    </svg>
  );
}

// ── Main SimulationRunner ─────────────────────────────────────────────────────

interface SimulationRunnerProps {
  event: CompoundEvent;
  sim: SimState;
  onSimUpdate: (updated: SimState) => void;
  onSimComplete: () => void;
}

export default function SimulationRunner({
  event,
  sim,
  onSimUpdate,
  onSimComplete,
}: SimulationRunnerProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalTrialsRef = useRef<number>(1000);
  const [snapshot, setSnapshot] = useState<TrialResult | null>(null);
  const [snapshotKey, setSnapshotKey] = useState(0);

  const stopInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  function startSimulation(total: number) {
    if (sim.isRunning) return;

    stopInterval();
    totalTrialsRef.current = total;

    // Reset state
    let trialCount = 0;
    let matchCount = 0;
    const history: number[] = [];

    setSnapshot(null);

    onSimUpdate({
      isRunning: true,
      trialCount: 0,
      matchCount: 0,
      experimental: 0,
      history: [],
      completed: false,
    });

    const CHUNK = 30; // trials per tick
    const TICK_MS = 100;

    intervalRef.current = setInterval(() => {
      const remaining = total - trialCount;
      const batch = Math.min(CHUNK, remaining);

      let newSnapshot: TrialResult | null = null;

      for (let i = 0; i < batch; i++) {
        trialCount += 1;

        // Every 100th trial: use detailed version for both stats and snapshot
        if (trialCount % 100 === 0) {
          const detailed = simulateTrialDetailed(event);
          if (detailed.hit) matchCount += 1;
          newSnapshot = detailed;
        } else {
          if (simulateTrial(event)) matchCount += 1;
        }

        // Sample every 50 trials
        if (trialCount % 50 === 0) {
          history.push(matchCount / trialCount);
        }
      }

      if (newSnapshot) {
        setSnapshot(newSnapshot);
        setSnapshotKey((k) => k + 1);
      }

      const experimental = trialCount > 0 ? matchCount / trialCount : 0;

      if (trialCount >= total) {
        stopInterval();
        // Ensure final point is captured
        if (history.length === 0 || history[history.length - 1] !== experimental) {
          history.push(experimental);
        }
        onSimUpdate({
          isRunning: false,
          trialCount,
          matchCount,
          experimental,
          history: [...history],
          completed: true,
        });
        onSimComplete();
      } else {
        onSimUpdate({
          isRunning: true,
          trialCount,
          matchCount,
          experimental,
          history: [...history],
          completed: false,
        });
      }
    }, TICK_MS);
  }

  const total = totalTrialsRef.current;
  const progress =
    sim.trialCount > 0 && !sim.completed ? (sim.trialCount / total) * 100 : 0;

  return (
    <div className="space-y-5">
      {/* Run buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          disabled={sim.isRunning}
          onClick={() => startSimulation(1000)}
          className="px-5 py-2 text-[13px] rounded-xl font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          Run 1,000 Trials
        </button>
        <button
          disabled={sim.isRunning}
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
            Completed: {sim.trialCount.toLocaleString()} / {total.toLocaleString()}
          </p>
        </div>
      )}

      {/* Live trial visualizer — shown every 100 trials while running */}
      {sim.isRunning && snapshot && (
        <TrialVisualizer key={snapshotKey} result={snapshot} />
      )}

      {/* Trial counter */}
      {sim.trialCount > 0 && (
        <TrialCounter
          sim={sim}
          totalTrials={total}
          theoretical={event.theoretical}
        />
      )}

      {/* Convergence chart */}
      {(sim.history.length > 0 || sim.isRunning) && (
        <div className="rounded-2xl border border-[#1e293b] bg-[#0a0e1a] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-3">
            Convergence Chart
          </p>
          <ConvergenceChart
            history={sim.history}
            theoretical={event.theoretical}
            totalTrials={total}
          />
          <div className="flex items-center gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-[10px] text-[#3b82f6]">
              <span className="w-4 h-0.5 bg-[#3b82f6] inline-block" />
              Experimental P
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-[#ef4444]">
              <span className="w-4 h-0.5 bg-[#ef4444] inline-block border-dashed border-t border-[#ef4444]" />
              Theoretical P ({event.theoretical.toFixed(3)})
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
