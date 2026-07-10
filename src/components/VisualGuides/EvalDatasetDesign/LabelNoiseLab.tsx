"use client";

import React from "react";
import { EvalTask } from "./types";
import {
  expectedMeasuredRate,
  improvementAttenuation,
  noiseCeiling,
  noisyRealization,
  pct,
  rawPassRate,
} from "./stats";

type Props = {
  tasks: readonly EvalTask[];
  flipRate: number;
  onFlipRate: (v: number) => void;
  nonce: number;
  onReroll: () => void;
  noiseThreshold: number;
  minSetSize: number;
  gateHit: boolean;
};

function NoiseChart({
  flipRate,
  trueRate,
  realized,
}: {
  flipRate: number;
  trueRate: number | null;
  realized: number | null;
}) {
  const x = (p: number) => 52 + p * 520;
  const y = (m: number) => 208 - m * 176;
  const ceiling = noiseCeiling(flipRate);
  return (
    <svg
      viewBox="0 0 640 248"
      className="w-full h-auto"
      role="img"
      aria-label={`Chart of measured pass rate against true pass rate at a label error rate of ${pct(
        flipRate,
        0
      )}. The measured line runs from ${pct(flipRate, 0)} at true 0% to ${pct(
        ceiling,
        0
      )} at true 100%.${
        trueRate !== null
          ? ` Your set: true ${pct(trueRate)}, expected measured ${pct(
              expectedMeasuredRate(trueRate, flipRate)
            )}.`
          : ""
      }`}
    >
      {/* axes */}
      <line x1={52} y1={32} x2={52} y2={208} stroke="#334155" strokeWidth={1.5} />
      <line x1={52} y1={208} x2={572} y2={208} stroke="#334155" strokeWidth={1.5} />
      {[0, 0.5, 1].map((t) => (
        <g key={`yt-${t}`}>
          <text
            x={44}
            y={y(t) + 4}
            textAnchor="end"
            fill="#475569"
            fontSize={10}
            fontFamily="monospace"
          >
            {Math.round(t * 100)}%
          </text>
          <line x1={48} y1={y(t)} x2={52} y2={y(t)} stroke="#334155" strokeWidth={1.5} />
        </g>
      ))}
      {[0, 0.5, 1].map((t) => (
        <text
          key={`xt-${t}`}
          x={x(t)}
          y={226}
          textAnchor="middle"
          fill="#475569"
          fontSize={10}
          fontFamily="monospace"
        >
          {Math.round(t * 100)}%
        </text>
      ))}
      <text x={56} y={24} fill="#94a3b8" fontSize={11}>
        Measured pass rate vs true pass rate
      </text>
      <text x={312} y={244} textAnchor="middle" fill="#475569" fontSize={10}>
        true pass rate
      </text>

      {/* identity line: what a perfect labeler measures */}
      <line
        x1={x(0)}
        y1={y(0)}
        x2={x(1)}
        y2={y(1)}
        stroke="#475569"
        strokeWidth={1.5}
        strokeDasharray="5 4"
      />
      <text x={x(0.78)} y={y(0.78) - 8} fill="#475569" fontSize={10}>
        perfect labels
      </text>

      {/* expected measured line under current noise */}
      <line
        x1={x(0)}
        y1={y(expectedMeasuredRate(0, flipRate))}
        x2={x(1)}
        y2={y(expectedMeasuredRate(1, flipRate))}
        stroke="var(--cat-accent)"
        strokeWidth={2.5}
      />
      {/* ceiling marker */}
      <line
        x1={x(1)}
        y1={y(ceiling)}
        x2={x(1) + 8}
        y2={y(ceiling)}
        stroke="var(--cat-accent)"
        strokeWidth={2}
      />
      <text
        x={x(1) + 12}
        y={y(ceiling) + 4}
        fill="var(--cat-accent)"
        fontSize={10}
        fontFamily="monospace"
      >
        {pct(ceiling, 0)}
      </text>

      {/* markers for the user's set */}
      {trueRate !== null && (
        <>
          <line
            x1={x(trueRate)}
            y1={y(0) + 0}
            x2={x(trueRate)}
            y2={y(expectedMeasuredRate(trueRate, flipRate))}
            stroke="#334155"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <circle
            cx={x(trueRate)}
            cy={y(expectedMeasuredRate(trueRate, flipRate))}
            r={5}
            fill="var(--color-accent)"
          />
          {realized !== null && (
            <circle
              cx={x(trueRate)}
              cy={y(realized)}
              r={5}
              fill="none"
              stroke="#3bb4a4"
              strokeWidth={2.5}
            />
          )}
        </>
      )}
    </svg>
  );
}

export default function LabelNoiseLab({
  tasks,
  flipRate,
  onFlipRate,
  nonce,
  onReroll,
  noiseThreshold,
  minSetSize,
  gateHit,
}: Props) {
  const n = tasks.length;
  const trueRate = rawPassRate(tasks);
  const realization = noisyRealization(tasks, flipRate, nonce);
  const expected = trueRate === null ? null : expectedMeasuredRate(trueRate, flipRate);
  const attenuation = improvementAttenuation(flipRate);

  return (
    <div>
      {n < minSetSize && (
        <p className="text-[12px] text-[var(--color-warning)] mb-3">
          Assemble at least {minSetSize} tasks in the sampling lab first, so the
          noise experiment has a real set to corrupt.
        </p>
      )}

      {/* Slider */}
      <div className="rounded-xl border border-[#1e293b] p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="label-error-rate"
            className="text-[12px] font-semibold text-white"
          >
            Label error rate
          </label>
          <span className="text-[13px] font-mono font-bold text-[var(--cat-accent)]">
            {pct(flipRate, 0)}
          </span>
        </div>
        <input
          id="label-error-rate"
          type="range"
          min={0}
          max={50}
          step={1}
          value={Math.round(flipRate * 100)}
          onChange={(e) => onFlipRate(Number(e.target.value) / 100)}
          className="w-full accent-[var(--cat-accent)]"
          aria-describedby="label-error-hint"
        />
        <p id="label-error-hint" className="text-[11px] text-[#475569] mt-1.5">
          Each grader verdict flips with this probability, independently per
          task (symmetric noise). Whenever two honest annotators can disagree
          on a task, your labels carry some of this. Push it to{" "}
          {Math.round(noiseThreshold * 100)}% or beyond to complete the
          experiment.
        </p>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-[#1e293b] p-4 mb-4">
        <NoiseChart
          flipRate={flipRate}
          trueRate={trueRate}
          realized={realization.measured}
        />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
          <span className="text-[10px] text-[#475569]">
            <span className="inline-block w-3 h-0.5 align-middle mr-1.5 bg-[var(--cat-accent)]" />
            expected measured line
          </span>
          <span className="text-[10px] text-[#475569]">
            <span
              className="inline-block w-2 h-2 rounded-full align-middle mr-1.5"
              style={{ background: "var(--color-accent)" }}
            />
            your set (expected)
          </span>
          <span className="text-[10px] text-[#475569]">
            <span className="inline-block w-2 h-2 rounded-full align-middle mr-1.5 border-2 border-[#3bb4a4]" />
            one seeded noise draw
          </span>
        </div>
      </div>

      {/* Exact relationship */}
      <pre className="bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[11px] leading-relaxed rounded-xl p-4 overflow-x-auto mb-4">
{`measured = true * (1 - err) + (1 - true) * err

at err = ${(flipRate * 100).toFixed(0)}%:  ceiling = ${pct(noiseCeiling(flipRate), 0)}   (no model can measure higher)
           a +10 pt true improvement reads as +${(attenuation * 10).toFixed(1)} pts`}
      </pre>

      {/* Readout tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            True pass rate (your set)
          </p>
          <p className="text-xl font-black font-mono text-[#f1f5f9]">
            {trueRate === null ? "?" : pct(trueRate)}
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Expected measured
          </p>
          <p className="text-xl font-black font-mono text-[var(--color-accent)]">
            {expected === null ? "?" : pct(expected)}
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            One noise draw
          </p>
          <p className="text-xl font-black font-mono text-[#3bb4a4]">
            {realization.measured === null ? "?" : pct(realization.measured)}
          </p>
          <p className="text-[10px] text-[#475569] mt-0.5">
            {realization.measured === null
              ? ""
              : `${realization.flippedIds.size} of ${n} labels flipped`}
          </p>
        </div>
        <div
          className="rounded-xl border p-3"
          style={{ borderColor: gateHit ? "var(--cat-accent)" : "#1e293b" }}
        >
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Measurement ceiling
          </p>
          <p className="text-xl font-black font-mono text-[var(--cat-accent)]">
            {pct(noiseCeiling(flipRate), 0)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onReroll}
          disabled={n === 0 || flipRate === 0}
          className="px-3.5 py-2 rounded-xl text-[12px] font-semibold border border-[#334155] text-white hover:border-[var(--cat-accent)] hover:text-[var(--cat-accent)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cat-accent)] disabled:opacity-40 disabled:pointer-events-none"
        >
          New noise draw
        </button>
        <p className="text-[11px] text-[#475569]" aria-live="polite">
          {gateHit
            ? "Noise experiment complete ✓ Notice the draw scatters around the expected value, never around the truth."
            : "The expected value is exact math; each draw is one seeded realization of it."}
        </p>
      </div>
    </div>
  );
}
