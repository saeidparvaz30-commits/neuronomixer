"use client";

import React, { useMemo } from "react";
import {
  N_PUBLIC,
  N_PRIVATE,
  LAB_MODEL_SEED,
  scoreSummary,
  contaminationCurve,
} from "./benchmarkMath";
import { PUBLIC_SERIES, PRIVATE_SERIES } from "./types";

type Props = {
  skillPct: number;
  contaminationPct: number;
  onSkillChange: (pct: number) => void;
  onContaminationChange: (pct: number) => void;
};

const W = 560;
const H = 250;
const PL = 42;
const PR = 14;
const PT = 14;
const PB = 34;

function x(c: number): number {
  return PL + c * (W - PL - PR);
}

function y(pct: number): number {
  return PT + (1 - pct / 100) * (H - PT - PB);
}

export default function ContaminationLab({
  skillPct,
  contaminationPct,
  onSkillChange,
  onContaminationChange,
}: Props) {
  const skill = skillPct / 100;
  const contamination = contaminationPct / 100;

  const summary = useMemo(
    () => scoreSummary(skill, contamination, LAB_MODEL_SEED),
    [skill, contamination]
  );
  const curve = useMemo(
    () => contaminationCurve(skill, LAB_MODEL_SEED, 20),
    [skill]
  );

  const publicLine = curve.map((p) => `${x(p.c)},${y(p.publicPct)}`).join(" ");
  const startPct = curve[0].publicPct;
  const endPct = curve[curve.length - 1].publicPct;

  return (
    <div>
      <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
        This model is fully synthetic: you set its true skill, and the simulation
        generates every item outcome with a seeded random draw. The contamination
        slider leaks a share of the {N_PUBLIC} public test items into its training
        set. Leaked items become memorized: the model repeats the answer it saw, so
        they score correct regardless of skill. The {N_PRIVATE} private held-out
        items can never leak.
      </p>

      {/* Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div className="rounded-xl border border-[#1e293b] p-4">
          <label
            htmlFor="bl-skill-slider"
            className="block text-[12px] font-semibold text-white mb-2"
          >
            True skill (defined by you):{" "}
            <span className="font-mono text-[var(--color-accent)]">{skillPct}%</span>
          </label>
          <input
            id="bl-skill-slider"
            type="range"
            min={30}
            max={90}
            step={2}
            value={skillPct}
            onChange={(e) => onSkillChange(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: "var(--color-accent)" }}
          />
          <p className="text-[11px] text-[#475569] mt-2">
            The ground truth. Both scores should track this number.
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-4">
          <label
            htmlFor="bl-contamination-slider"
            className="block text-[12px] font-semibold text-white mb-2"
          >
            Contamination:{" "}
            <span className="font-mono" style={{ color: PUBLIC_SERIES }}>
              {contaminationPct}%
            </span>{" "}
            of public items leaked
          </label>
          <input
            id="bl-contamination-slider"
            type="range"
            min={0}
            max={100}
            step={5}
            value={contaminationPct}
            onChange={(e) => onContaminationChange(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: PUBLIC_SERIES }}
          />
          <p className="text-[11px] text-[#475569] mt-2">
            {summary.leaked} of {N_PUBLIC} public items are now in the training set.
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-[#1e293b] p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4 mb-3">
          <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
            <svg width="22" height="8" aria-hidden="true">
              <line x1="1" y1="4" x2="21" y2="4" stroke={PUBLIC_SERIES} strokeWidth="2.5" />
            </svg>
            Public leaderboard score (solid)
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
            <svg width="22" height="8" aria-hidden="true">
              <line
                x1="1"
                y1="4"
                x2="21"
                y2="4"
                stroke={PRIVATE_SERIES}
                strokeWidth="2.5"
                strokeDasharray="5 3"
              />
            </svg>
            Private held-out score (dashed)
          </span>
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={`Line chart computed from the simulation. The public leaderboard score rises from ${startPct}% at zero contamination to ${endPct}% when the whole public set is leaked, while the private held-out score stays flat at ${summary.privatePct}%.`}
        >
          {/* Grid + y labels */}
          {[0, 25, 50, 75, 100].map((pct) => (
            <g key={pct}>
              <line
                x1={PL}
                y1={y(pct)}
                x2={W - PR}
                y2={y(pct)}
                stroke="#1e293b"
                strokeWidth="1"
              />
              <text
                x={PL - 6}
                y={y(pct) + 3}
                textAnchor="end"
                fontSize="10"
                fill="#475569"
              >
                {pct}%
              </text>
            </g>
          ))}
          {/* X labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((c) => (
            <text
              key={c}
              x={x(c)}
              y={H - PB + 14}
              textAnchor="middle"
              fontSize="10"
              fill="#475569"
            >
              {Math.round(c * 100)}%
            </text>
          ))}
          <text
            x={(PL + W - PR) / 2}
            y={H - 4}
            textAnchor="middle"
            fontSize="10"
            fill="#475569"
          >
            share of public test set leaked into training
          </text>

          {/* Current contamination guide line */}
          <line
            x1={x(contamination)}
            y1={PT}
            x2={x(contamination)}
            y2={H - PB}
            stroke="#334155"
            strokeWidth="1"
            strokeDasharray="3 3"
          />

          {/* Private held-out score: flat, contamination cannot touch it */}
          <line
            x1={x(0)}
            y1={y(summary.privatePct)}
            x2={x(1)}
            y2={y(summary.privatePct)}
            stroke={PRIVATE_SERIES}
            strokeWidth="2.5"
            strokeDasharray="6 4"
          />

          {/* Public score curve */}
          <polyline
            points={publicLine}
            fill="none"
            stroke={PUBLIC_SERIES}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Current markers */}
          <circle
            cx={x(contamination)}
            cy={y(summary.publicPct)}
            r="5"
            fill={PUBLIC_SERIES}
            stroke="#0f172a"
            strokeWidth="2"
          />
          <circle
            cx={x(contamination)}
            cy={y(summary.privatePct)}
            r="5"
            fill={PRIVATE_SERIES}
            stroke="#0f172a"
            strokeWidth="2"
          />
        </svg>
        <p className="text-[11px] text-[#475569] mt-2" aria-live="polite">
          At {contaminationPct}% contamination ({summary.leaked} of {N_PUBLIC} items
          leaked): public score {summary.publicPct}%, private score{" "}
          {summary.privatePct}%, gap {summary.gapPts} points.
        </p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            True skill
          </p>
          <p className="text-2xl font-black font-mono text-[#f1f5f9]">{skillPct}%</p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Public score
          </p>
          <p className="text-2xl font-black font-mono" style={{ color: PUBLIC_SERIES }}>
            {summary.publicPct}%
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Private score
          </p>
          <p className="text-2xl font-black font-mono" style={{ color: PRIVATE_SERIES }}>
            {summary.privatePct}%
          </p>
        </div>
        <div
          className={`rounded-xl border p-3 ${
            summary.gapPts >= 5
              ? "border-[var(--color-warning)]/50"
              : "border-[#1e293b]"
          }`}
        >
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Public minus private
          </p>
          <p
            className="text-2xl font-black font-mono"
            style={{
              color: summary.gapPts >= 5 ? "var(--color-warning)" : "#f1f5f9",
            }}
          >
            {summary.gapPts > 0 ? "+" : ""}
            {summary.gapPts} pts
          </p>
        </div>
      </div>

      {contaminationPct === 0 && (
        <p className="text-[11px] text-[#475569] leading-relaxed mb-4">
          Even at zero leakage the two sets disagree by a couple of points. That is
          sampling noise on {N_PUBLIC} items, and it is the floor below which small
          leaderboard differences mean nothing.
        </p>
      )}

      {/* Survey context, clearly separated from the simulation output */}
      <div className="rounded-xl border border-[#334155] bg-[#1e293b]/40 p-4">
        <p className="text-[11px] font-semibold text-[#94a3b8] mb-1.5 uppercase tracking-wide">
          What the literature reports
        </p>
        <p className="text-[12px] text-[#94a3b8] leading-relaxed">
          Published surveys of data contamination in LLM benchmarks report that
          leaked test data can inflate measured scores by roughly 5 to 15 percentage
          points (arXiv:2502.17521, arXiv:2404.00699). That range is the survey
          finding, quoted for context. The gap you create above is computed live
          from this page&apos;s simulation, not taken from those papers.
        </p>
      </div>
    </div>
  );
}
