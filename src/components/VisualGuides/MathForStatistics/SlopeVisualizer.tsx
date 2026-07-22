"use client";

import React, { useState } from "react";

interface SlopeVisualizerProps {
  onAdjust: () => void;
}

// Curve: y = -(x-5)^2 + 25, domain x in [0,10]
function curveY(x: number): number {
  return -(x - 5) * (x - 5) + 25;
}

// Derivative: dy/dx = -2(x-5)
function slope(x: number): number {
  return -2 * (x - 5);
}

// SVG dimensions
const SVG_W = 480;
const SVG_H = 260;
const PAD = { left: 44, right: 20, top: 16, bottom: 36 };

const X_MIN = 0;
const X_MAX = 10;
const Y_MIN = -2;
const Y_MAX = 28;

function toSvgX(x: number): number {
  return PAD.left + ((x - X_MIN) / (X_MAX - X_MIN)) * (SVG_W - PAD.left - PAD.right);
}

function toSvgY(y: number): number {
  return PAD.top + (1 - (y - Y_MIN) / (Y_MAX - Y_MIN)) * (SVG_H - PAD.top - PAD.bottom);
}

// Build curve path
const CURVE_STEPS = 120;
const curvePath = Array.from({ length: CURVE_STEPS + 1 }, (_, i) => {
  const x = X_MIN + (i / CURVE_STEPS) * (X_MAX - X_MIN);
  const y = curveY(x);
  return `${i === 0 ? "M" : "L"}${toSvgX(x).toFixed(2)},${toSvgY(y).toFixed(2)}`;
}).join(" ");

// Axis ticks
const xTicks = [0, 2, 4, 5, 6, 8, 10];
const yTicks = [0, 5, 10, 15, 20, 25];

export default function SlopeVisualizer({ onAdjust }: SlopeVisualizerProps) {
  const [xPos, setXPos] = useState(3);

  function handleX(val: number) {
    setXPos(val);
    onAdjust();
  }

  const x0 = xPos;
  const y0 = curveY(x0);
  const m = slope(x0);

  // Tangent line: y - y0 = m(x - x0), draw across dx=1.5 on each side
  const dx = 1.5;
  const txLeft = Math.max(X_MIN, x0 - dx);
  const txRight = Math.min(X_MAX, x0 + dx);
  const tyLeft = y0 + m * (txLeft - x0);
  const tyRight = y0 + m * (txRight - x0);

  // Rise/run triangle endpoints (clamped to visible area)
  // Run goes horizontally from (x0, y0) to (x0+1, y0)
  // Rise goes vertically from (x0+1, y0) to (x0+1, y0+m)
  const runX = Math.min(x0 + 1, X_MAX);
  const riseY = Math.min(Math.max(y0 + m, Y_MIN), Y_MAX);

  const px0 = toSvgX(x0);
  const py0 = toSvgY(y0);
  const ptxLeft = toSvgX(txLeft);
  const ptyLeft = toSvgY(tyLeft);
  const ptxRight = toSvgX(txRight);
  const ptyRight = toSvgY(tyRight);
  const pRunX = toSvgX(runX);
  const pRiseY = toSvgY(riseY);

  let slopeLabel = "= 0 (at peak)";
  if (m > 0.1) slopeLabel = `= +${m.toFixed(2)} (rising)`;
  if (m < -0.1) slopeLabel = `= ${m.toFixed(2)} (falling)`;

  return (
    <div className="space-y-5">
      {/* Slider */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-2">
          X Position: {xPos.toFixed(1)}
        </label>
        <input
          type="range"
          aria-label="X position"
          min={0.5}
          max={9.5}
          step={0.1}
          value={xPos}
          onChange={(e) => handleX(Number(e.target.value))}
          className="w-full accent-[var(--color-accent)] h-1"
        />
        <div className="flex justify-between text-[10px] text-[#334155] mt-0.5">
          <span>0</span><span>5 (peak)</span><span>10</span>
        </div>
      </div>

      {/* SVG chart */}
      <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full max-w-[480px]"
          style={{ minWidth: 320 }}
        >
          {/* Grid lines */}
          {yTicks.map((y) => (
            <line
              key={y}
              x1={PAD.left}
              y1={toSvgY(y)}
              x2={SVG_W - PAD.right}
              y2={toSvgY(y)}
              stroke="#1e293b"
              strokeWidth={1}
            />
          ))}
          {xTicks.map((x) => (
            <line
              key={x}
              x1={toSvgX(x)}
              y1={PAD.top}
              x2={toSvgX(x)}
              y2={SVG_H - PAD.bottom}
              stroke="#1e293b"
              strokeWidth={1}
            />
          ))}

          {/* Axes */}
          <line
            x1={PAD.left}
            y1={toSvgY(0)}
            x2={SVG_W - PAD.right}
            y2={toSvgY(0)}
            stroke="#334155"
            strokeWidth={1.5}
          />
          <line
            x1={toSvgX(0)}
            y1={PAD.top}
            x2={toSvgX(0)}
            y2={SVG_H - PAD.bottom}
            stroke="#334155"
            strokeWidth={1.5}
          />

          {/* X tick labels */}
          {xTicks.map((x) => (
            <text
              key={x}
              x={toSvgX(x)}
              y={SVG_H - PAD.bottom + 16}
              textAnchor="middle"
              fontSize={15}
              fill="#475569"
            >
              {x}
            </text>
          ))}

          {/* Y tick labels */}
          {yTicks.map((y) => (
            <text
              key={y}
              x={PAD.left - 6}
              y={toSvgY(y) + 5}
              textAnchor="end"
              fontSize={15}
              fill="#475569"
            >
              {y}
            </text>
          ))}

          {/* Curve */}
          <path d={curvePath} fill="none" stroke="#3b82f6" strokeWidth={2.5} />

          {/* Rise/run triangle */}
          {Math.abs(m) > 0.05 && (
            <>
              {/* Run line (horizontal, teal) */}
              <line
                x1={px0}
                y1={py0}
                x2={pRunX}
                y2={py0}
                stroke="#3bb4a4"
                strokeWidth={2}
                strokeDasharray="4 2"
              />
              {/* Rise line (vertical, gold) */}
              <line
                x1={pRunX}
                y1={py0}
                x2={pRunX}
                y2={pRiseY}
                stroke="var(--color-accent)"
                strokeWidth={2}
                strokeDasharray="4 2"
              />
              {/* Labels */}
              <text
                x={(px0 + pRunX) / 2}
                y={py0 + 16}
                textAnchor="middle"
                fontSize={15}
                fill="#3bb4a4"
              >
                run=1
              </text>
              <text
                x={pRunX + 6}
                y={(py0 + pRiseY) / 2 + 5}
                textAnchor="start"
                fontSize={15}
                fill="var(--color-accent)"
              >
                rise={m.toFixed(1)}
              </text>
            </>
          )}

          {/* Tangent line */}
          <line
            x1={ptxLeft}
            y1={ptyLeft}
            x2={ptxRight}
            y2={ptyRight}
            stroke="var(--color-warning)"
            strokeWidth={2}
            opacity={0.85}
          />

          {/* Point on curve */}
          <circle cx={px0} cy={py0} r={5} fill="var(--color-accent)" />
          <circle cx={px0} cy={py0} r={3} fill="#0a0e1a" />
        </svg>
      </div>

      {/* Slope readout */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4">
          <p className="text-[10px] uppercase tracking-widest text-[#475569] mb-1">Position</p>
          <p className="text-xl font-bold text-white">x = {x0.toFixed(1)}</p>
          <p className="text-[11px] text-[#475569] mt-0.5">y = {y0.toFixed(1)}</p>
        </div>
        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4">
          <p className="text-[10px] uppercase tracking-widest text-[#475569] mb-1">Slope Δy/Δx</p>
          <p
            className="text-xl font-bold"
            style={{ color: m > 0.1 ? "#3bb4a4" : m < -0.1 ? "#ef4444" : "var(--color-accent)" }}
          >
            {m.toFixed(2)}
          </p>
          <p className="text-[11px] text-[#475569] mt-0.5">{slopeLabel}</p>
        </div>
        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4">
          <p className="text-[10px] uppercase tracking-widest text-[#475569] mb-1">Curve</p>
          <p className="text-sm font-mono text-white">y = -(x−5)² + 25</p>
          <p className="text-[11px] text-[#475569] mt-0.5">Peak at x=5</p>
        </div>
      </div>

      {/* Explanation */}
      <div className="rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-4">
        <p className="text-[13px] text-[#94a3b8] leading-relaxed">
          <span className="font-semibold text-white">Slope is steepness.</span>{" "}
          At the peak (x=5), slope=0: the curve is momentarily flat. Before the peak: positive slope (rising). After: negative slope (falling). In a salary-vs-experience plot, slope = average raise per additional year.
        </p>
      </div>
    </div>
  );
}
