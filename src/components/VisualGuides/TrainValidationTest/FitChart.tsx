"use client";

import React from "react";
import {
  Sample,
  DegreeResult,
  DEGREES,
  trueFn,
  curvePoints,
} from "./splitMath";
import { TRAIN_COLOR, VAL_COLOR, TEST_COLOR } from "./SplitStrip";

interface Props {
  train: readonly Sample[];
  val: readonly Sample[];
  test: readonly Sample[];
  result: DegreeResult;
  degree: number;
  onDegreeChange: (d: number) => void;
}

const W = 640;
const H = 340;
const ML = 56;
const MR = 12;
const MT = 12;
const MB = 28;
const Y_MAX = 1.75;

function sx(x: number): string {
  return (ML + x * (W - ML - MR)).toFixed(2);
}

function clampY(y: number): number {
  return Math.min(Math.max(y, -Y_MAX), Y_MAX);
}

function sy(y: number): string {
  const c = clampY(y);
  return (MT + (1 - (c + Y_MAX) / (2 * Y_MAX)) * (H - MT - MB)).toFixed(2);
}

function pathFrom(points: Array<{ x: number; y: number }>): string {
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x)},${sy(p.y)}`)
    .join(" ");
}

/**
 * Scatter of the on-screen dataset (shapes per split) with the polynomial
 * fit on train only, plus live train / val / test RMSE bars for the
 * current degree. Every number comes from splitMath.
 */
export default function FitChart({
  train,
  val,
  test,
  result,
  degree,
  onDegreeChange,
}: Props) {
  const fitPath = pathFrom(curvePoints(result.coeffs));
  const truthPath = pathFrom(
    Array.from({ length: 101 }, (_, i) => {
      const x = i / 100;
      return { x, y: trueFn(x) };
    })
  );

  const bars = [
    { name: "Train RMSE", value: result.trainRmse, color: TRAIN_COLOR, note: "what the fit minimizes" },
    { name: "Validation RMSE", value: result.valRmse, color: VAL_COLOR, note: "what you select on" },
    { name: "Test RMSE", value: result.testRmse, color: TEST_COLOR, note: "look, do not touch" },
  ];
  const barMax = Math.max(...bars.map((b) => b.value), 0.1);

  const yTicks = [-1.5, -1, -0.5, 0, 0.5, 1, 1.5];
  const xTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5">
      <div>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <label
            htmlFor="tvt-degree"
            className="text-[12px] font-semibold text-[#f1f5f9]"
          >
            Polynomial degree
          </label>
          <input
            id="tvt-degree"
            type="range"
            min={DEGREES[0]}
            max={DEGREES[DEGREES.length - 1]}
            step={1}
            value={degree}
            onChange={(e) => onDegreeChange(Number(e.target.value))}
            className="flex-1 min-w-[140px] accent-[var(--color-accent)]"
          />
          <span className="font-mono text-[14px] font-bold text-[var(--color-accent)] w-7 text-center">
            {degree}
          </span>
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto rounded-xl border border-[#1e293b] bg-[#0f172a]"
          role="img"
          aria-label={`Scatter plot of 60 samples split into ${train.length} train, ${val.length} validation, and ${test.length} test points, with a degree ${degree} polynomial fit on the training points only. Current RMSE: train ${result.trainRmse.toFixed(3)}, validation ${result.valRmse.toFixed(3)}, test ${result.testRmse.toFixed(3)}.`}
        >
          {yTicks.map((t) => (
            <g key={`y${t}`}>
              <line
                x1={ML}
                x2={W - MR}
                y1={sy(t)}
                y2={sy(t)}
                stroke="#1e293b"
                strokeWidth="1"
              />
              <text
                x={ML - 6}
                y={sy(t)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="20"
                fill="#475569"
              >
                {t}
              </text>
            </g>
          ))}
          {xTicks.map((t) => (
            <text
              key={`x${t}`}
              x={sx(t)}
              y={H - 10}
              textAnchor="middle"
              fontSize="20"
              fill="#475569"
            >
              {t}
            </text>
          ))}

          <path
            d={truthPath}
            fill="none"
            stroke="#475569"
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />
          <path
            d={fitPath}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2.25"
          />

          {train.map((s, i) => (
            <circle
              key={`tr${i}`}
              cx={sx(s.x)}
              cy={sy(s.y)}
              r="3.4"
              fill={TRAIN_COLOR}
              opacity="0.9"
            />
          ))}
          {val.map((s, i) => (
            <path
              key={`va${i}`}
              d={`M${sx(s.x)},${(Number(sy(s.y)) - 4.4).toFixed(2)} l4.4,4.4 l-4.4,4.4 l-4.4,-4.4 Z`}
              fill={VAL_COLOR}
              opacity="0.9"
            />
          ))}
          {test.map((s, i) => (
            <rect
              key={`te${i}`}
              x={(Number(sx(s.x)) - 3.2).toFixed(2)}
              y={(Number(sy(s.y)) - 3.2).toFixed(2)}
              width="6.4"
              height="6.4"
              fill={TEST_COLOR}
              opacity="0.9"
            />
          ))}
        </svg>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-[#94a3b8]">
          <span className="flex items-center gap-1.5">
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <circle cx="5" cy="5" r="4" fill={TRAIN_COLOR} />
            </svg>
            train points
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M5 0 L10 5 L5 10 L0 5 Z" fill={VAL_COLOR} />
            </svg>
            validation points
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <rect x="1" y="1" width="8" height="8" fill={TEST_COLOR} />
            </svg>
            test points
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="18" height="4" viewBox="0 0 18 4" aria-hidden="true">
              <line x1="0" y1="2" x2="18" y2="2" stroke="var(--color-accent)" strokeWidth="2.5" />
            </svg>
            fit (train only)
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="18" height="4" viewBox="0 0 18 4" aria-hidden="true">
              <line x1="0" y1="2" x2="18" y2="2" stroke="#475569" strokeWidth="2" strokeDasharray="4 3" />
            </svg>
            hidden truth sin(2 pi x)
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">
          RMSE at degree {degree}
        </p>
        {bars.map((b) => (
          <div key={b.name} className="rounded-xl border border-[#1e293b] p-3">
            <div className="flex items-baseline justify-between mb-1.5">
              <p className="text-[11px] text-[#94a3b8]">{b.name}</p>
              <p className="font-mono text-[14px] font-bold text-[#f1f5f9]">
                {b.value.toFixed(3)}
              </p>
            </div>
            <div className="h-2 rounded-full bg-[#1e293b] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${((b.value / barMax) * 100).toFixed(1)}%`,
                  background: b.color,
                }}
              />
            </div>
            <p className="text-[10px] text-[#475569] mt-1.5">{b.note}</p>
          </div>
        ))}
        <p className="text-[10px] text-[#475569] leading-relaxed">
          All three recompute live from the current split and degree. The fit
          only ever sees the train points.
        </p>
      </div>
    </div>
  );
}
