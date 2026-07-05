"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useGuideMotion } from "@/lib/guideMotion";
import { Phase3State, seededRandom } from "./types";

interface Props {
  state: Phase3State;
  baselineRate: number;
  mde: number;
  onStateChange: (s: Phase3State | ((prev: Phase3State) => Phase3State)) => void;
  onNext: () => void;
  onBack: () => void;
}

// SVG chart dimensions
const W = 480;
const H = 240;
const PAD = { l: 52, r: 20, t: 16, b: 36 };

function toX(day: number, totalDays: number) {
  return PAD.l + (day / totalDays) * (W - PAD.l - PAD.r);
}
function toY(rate: number, minR: number, maxR: number) {
  return PAD.t + ((maxR - rate) / (maxR - minR)) * (H - PAD.t - PAD.b);
}

export default function Phase3Collect({
  state,
  baselineRate,
  mde,
  onStateChange,
  onNext,
  onBack,
}: Props) {
  const { fadeUp } = useGuideMotion();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rngRef = useRef(seededRandom(42));

  // Simulate one day step
  const stepDay = useCallback(() => {
    onStateChange((prev: Phase3State) => {
      if (prev.isPaused || prev.isComplete) return prev;

      const nextDay = prev.elapsedDays + 1;
      const rng = rngRef.current;

      // Daily participants arriving (split evenly across days)
      const dailyPerGroup = Math.ceil(prev.controlN / prev.totalDays);

      // Running totals converge toward true rates with noise
      const controlRate = baselineRate + (rng() - 0.5) * 0.01;
      const treatmentRate = baselineRate + mde + (rng() - 0.5) * 0.01;

      const newControlConv = Math.min(
        prev.controlN,
        prev.controlConversions + Math.round(controlRate * dailyPerGroup)
      );
      const newTreatmentConv = Math.min(
        prev.treatmentN,
        prev.treatmentConversions + Math.round(treatmentRate * dailyPerGroup)
      );

      const daysExposed = nextDay;
      const totalPerGroup = Math.min(prev.controlN, dailyPerGroup * daysExposed);

      const cRate = newControlConv / Math.max(1, totalPerGroup);
      const tRate = newTreatmentConv / Math.max(1, totalPerGroup);

      const newHistory = [
        ...prev.history,
        { day: nextDay, controlRate: cRate, treatmentRate: tRate },
      ];

      const isDone = nextDay >= prev.totalDays;

      return {
        ...prev,
        elapsedDays: nextDay,
        controlConversions: newControlConv,
        treatmentConversions: newTreatmentConv,
        history: newHistory,
        isComplete: isDone,
        isPaused: isDone ? true : prev.isPaused,
      };
    });
  }, [baselineRate, mde, onStateChange]);

  useEffect(() => {
    if (!state.isPaused && !state.isComplete) {
      intervalRef.current = setInterval(stepDay, 100);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isPaused, state.isComplete, stepDay]);

  function togglePause() {
    if (state.isComplete) return;
    onStateChange({ ...state, isPaused: !state.isPaused });
  }

  function skipToEnd() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const rng = seededRandom(42);
    rngRef.current = seededRandom(42 + state.totalDays);
    const history: { day: number; controlRate: number; treatmentRate: number }[] = [];
    const dailyPerGroup = Math.ceil(state.controlN / state.totalDays);
    let cConv = 0;
    let tConv = 0;

    for (let d = 1; d <= state.totalDays; d++) {
      const cRate = baselineRate + (rng() - 0.5) * 0.01;
      const tRate = baselineRate + mde + (rng() - 0.5) * 0.01;
      cConv = Math.min(state.controlN, cConv + Math.round(cRate * dailyPerGroup));
      tConv = Math.min(state.treatmentN, tConv + Math.round(tRate * dailyPerGroup));
      const exposed = Math.min(state.controlN, dailyPerGroup * d);
      history.push({
        day: d,
        controlRate: cConv / Math.max(1, exposed),
        treatmentRate: tConv / Math.max(1, exposed),
      });
    }

    onStateChange({
      ...state,
      elapsedDays: state.totalDays,
      controlConversions: cConv,
      treatmentConversions: tConv,
      history,
      isComplete: true,
      isPaused: true,
    });
  }

  function restart() {
    rngRef.current = seededRandom(42);
    onStateChange({
      ...state,
      elapsedDays: 0,
      controlConversions: 0,
      treatmentConversions: 0,
      history: [],
      isComplete: false,
      isPaused: false,
    });
  }

  const progress = state.elapsedDays / state.totalDays;
  const currentControlRate =
    state.history.length > 0
      ? state.history[state.history.length - 1].controlRate
      : baselineRate;
  const currentTreatmentRate =
    state.history.length > 0
      ? state.history[state.history.length - 1].treatmentRate
      : baselineRate + mde;

  // Chart bounds
  const allRates = state.history.flatMap((h) => [h.controlRate, h.treatmentRate]);
  const minR = allRates.length > 0 ? Math.max(0, Math.min(...allRates) - 0.005) : 0;
  const maxR =
    allRates.length > 0
      ? Math.min(1, Math.max(...allRates) + 0.01)
      : baselineRate + mde + 0.05;

  // Build SVG path strings
  const controlPath = state.history
    .map((h, i) => {
      const x = toX(h.day, state.totalDays);
      const y = toY(h.controlRate, minR, maxR);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const treatmentPath = state.history
    .map((h, i) => {
      const x = toX(h.day, state.totalDays);
      const y = toY(h.treatmentRate, minR, maxR);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  // Y-axis ticks
  const yTicks = 4;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    minR + ((maxR - minR) * i) / yTicks
  );

  // X-axis ticks: every 2 days
  const xTicks = Array.from(
    { length: Math.floor(state.totalDays / 2) + 1 },
    (_, i) => i * 2
  ).filter((d) => d <= state.totalDays);

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Progress bar */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Experiment Progress</h3>
          <span className="text-[12px] text-[#94a3b8]">
            Day {state.elapsedDays} / {state.totalDays}
          </span>
        </div>

        <div className="rounded-full bg-[#1e293b] h-3 overflow-hidden mb-2">
          <motion.div
            className="h-full rounded-full bg-[var(--color-accent)]"
            style={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-[#475569]">
          <span>Start</span>
          <span
            className={`font-semibold ${state.isComplete ? "text-[#3bb4a4]" : "text-[var(--color-accent)]"}`}
          >
            {state.isComplete
              ? "Collection complete!"
              : `${(progress * 100).toFixed(0)}% complete`}
          </span>
          <span>Day {state.totalDays}</span>
        </div>
      </div>

      {/* Live line chart */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Live Conversion Rates</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0.5 bg-[#1e5d8a] rounded-full" />
              <span className="text-[11px] text-[#94a3b8]">Control</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0.5 bg-[#3bb4a4] rounded-full" />
              <span className="text-[11px] text-[#94a3b8]">Treatment</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full max-w-[480px]"
          >
            {/* Grid lines */}
            {yTickValues.map((v, i) => {
              const y = toY(v, minR, maxR);
              return (
                <g key={i}>
                  <line
                    x1={PAD.l}
                    y1={y}
                    x2={W - PAD.r}
                    y2={y}
                    stroke="#1e293b"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                  <text
                    x={PAD.l - 6}
                    y={y + 4}
                    textAnchor="end"
                    fontSize={9}
                    fill="#475569"
                  >
                    {(v * 100).toFixed(1)}%
                  </text>
                </g>
              );
            })}

            {/* X-axis ticks */}
            {xTicks.map((d) => {
              const x = toX(d, state.totalDays);
              return (
                <g key={d}>
                  <text
                    x={x}
                    y={H - PAD.b + 14}
                    textAnchor="middle"
                    fontSize={9}
                    fill="#475569"
                  >
                    {d === 0 ? "" : `d${d}`}
                  </text>
                </g>
              );
            })}

            {/* Baseline reference */}
            <line
              x1={PAD.l}
              y1={toY(baselineRate, minR, maxR)}
              x2={W - PAD.r}
              y2={toY(baselineRate, minR, maxR)}
              stroke="#475569"
              strokeWidth={0.5}
              strokeDasharray="6 3"
            />

            {/* X axis */}
            <line
              x1={PAD.l}
              y1={H - PAD.b}
              x2={W - PAD.r}
              y2={H - PAD.b}
              stroke="#1e293b"
              strokeWidth={1}
            />
            {/* Y axis */}
            <line
              x1={PAD.l}
              y1={PAD.t}
              x2={PAD.l}
              y2={H - PAD.b}
              stroke="#1e293b"
              strokeWidth={1}
            />

            {/* Control line */}
            {controlPath && (
              <path
                d={controlPath}
                fill="none"
                stroke="#1e5d8a"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}

            {/* Treatment line */}
            {treatmentPath && (
              <path
                d={treatmentPath}
                fill="none"
                stroke="#3bb4a4"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}

            {/* Today marker */}
            {state.elapsedDays > 0 && state.elapsedDays < state.totalDays && (
              <line
                x1={toX(state.elapsedDays, state.totalDays)}
                y1={PAD.t}
                x2={toX(state.elapsedDays, state.totalDays)}
                y2={H - PAD.b}
                stroke="var(--color-accent)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            )}

            {/* X axis label */}
            <text
              x={W / 2}
              y={H - 2}
              textAnchor="middle"
              fontSize={9}
              fill="#475569"
            >
              Days elapsed
            </text>

            {/* Y axis label */}
            <text
              x={10}
              y={H / 2}
              textAnchor="middle"
              fontSize={9}
              fill="#475569"
              transform={`rotate(-90, 10, ${H / 2})`}
            >
              Conv. rate
            </text>
          </svg>
        </div>
      </div>

      {/* Current metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[#1e5d8a]/40 bg-[#0f172a] p-5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#1e5d8a] mb-2">
            Control Rate
          </p>
          <p className="text-3xl font-black text-white tabular-nums">
            {(currentControlRate * 100).toFixed(2)}%
          </p>
          <p className="text-[11px] text-[#94a3b8] mt-1">
            {state.controlConversions.toLocaleString()} / {Math.min(state.controlN, Math.ceil((state.controlN / state.totalDays) * state.elapsedDays)).toLocaleString()} users
          </p>
        </div>
        <div className="rounded-2xl border border-[#3bb4a4]/40 bg-[#0f172a] p-5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#3bb4a4] mb-2">
            Treatment Rate
          </p>
          <p className="text-3xl font-black text-white tabular-nums">
            {(currentTreatmentRate * 100).toFixed(2)}%
          </p>
          <p className="text-[11px] text-[#94a3b8] mt-1">
            {state.treatmentConversions.toLocaleString()} / {Math.min(state.treatmentN, Math.ceil((state.treatmentN / state.totalDays) * state.elapsedDays)).toLocaleString()} users
          </p>
        </div>
      </div>

      {/* Observed lift */}
      {state.elapsedDays > 0 && (
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-[#94a3b8]">Observed Lift</p>
              <p className="text-xl font-bold text-white">
                {((currentTreatmentRate - currentControlRate) * 100).toFixed(2)}%{" "}
                <span className="text-[#94a3b8] text-sm font-normal">absolute</span>
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#94a3b8]">Relative Lift</p>
              <p className="text-xl font-bold text-[var(--color-accent)]">
                {currentControlRate > 0
                  ? (
                      ((currentTreatmentRate - currentControlRate) /
                        currentControlRate) *
                      100
                    ).toFixed(1)
                  : "—"}%
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#94a3b8]">Target MDE</p>
              <p className="text-xl font-bold text-[#94a3b8]">{(mde * 100).toFixed(1)}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={onBack}
          className="px-4 py-2.5 rounded-xl font-semibold text-sm border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
        >
          ← Back
        </button>

        {!state.isComplete ? (
          <>
            <button
              onClick={togglePause}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-[#1e293b] text-white hover:bg-[#1e5d8a] transition-colors"
            >
              {state.isPaused ? (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Resume
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Pause
                </>
              )}
            </button>
            <button
              onClick={skipToEnd}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm border border-[#1e293b] text-[#94a3b8] hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
            >
              Skip to End →
            </button>
          </>
        ) : (
          <button
            onClick={restart}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm border border-[#1e293b] text-[#94a3b8] hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            ↺ Restart Simulation
          </button>
        )}

        {state.isComplete && (
          <button
            onClick={onNext}
            className="ml-auto px-6 py-2.5 rounded-xl font-semibold text-sm bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            Analyze Results →
          </button>
        )}
      </div>
    </motion.div>
  );
}
