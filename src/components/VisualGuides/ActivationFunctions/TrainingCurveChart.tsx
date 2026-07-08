"use client";

import React, { useState } from "react";
import type { FunctionId } from "./types";

// ── Pre-computed loss curves (100 steps each) ─────────────────────────────────
// ReLU: fast drop, converges ~step 40
// Sigmoid: slow, plateaus high due to vanishing gradients
// Tanh: moderate, between ReLU and Sigmoid
// Leaky-ReLU: similar to ReLU, slightly slower

// Seed-like deterministic approach using a simple LCG
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateDeterministicCurve(
  start: number,
  floor: number,
  decayRate: number,
  noiseAmp: number,
  seed: number,
  plateauAfter?: number
): number[] {
  const rand = seededRandom(seed);
  const pts: number[] = [];
  for (let i = 0; i <= 100; i++) {
    let base: number;
    if (plateauAfter && i > plateauAfter) {
      const basePlat = (start - floor) * Math.exp(-decayRate * plateauAfter) + floor;
      base = basePlat + (floor - basePlat) * ((i - plateauAfter) / 250);
    } else {
      base = (start - floor) * Math.exp(-decayRate * i) + floor;
    }
    const noise = (rand() - 0.5) * noiseAmp * Math.exp(-i / 30);
    pts.push(Math.max(0.01, base + noise));
  }
  return pts;
}

const CURVE_DATA: Record<FunctionId, number[]> = {
  relu: generateDeterministicCurve(2.4, 0.08, 0.065, 0.12, 42),
  sigmoid: generateDeterministicCurve(2.3, 0.62, 0.018, 0.06, 100, 28),
  tanh: generateDeterministicCurve(2.35, 0.22, 0.038, 0.09, 100, 60),
  "leaky-relu": generateDeterministicCurve(2.4, 0.09, 0.058, 0.11, 100),
};

const CURVE_COLORS: Record<FunctionId, string> = {
  relu: "#3bb4a4",
  sigmoid: "#1e5d8a",
  tanh: "#d4af37",
  "leaky-relu": "#a855f7",
};

const CURVE_LABELS: Record<FunctionId, string> = {
  relu: "ReLU",
  sigmoid: "Sigmoid",
  tanh: "Tanh",
  "leaky-relu": "Leaky ReLU",
};

// ── SVG dimensions ─────────────────────────────────────────────────────────────
const CW = 460;
const CH = 200;
const PAD_L = 40;
const PAD_R = 16;
const PAD_T = 12;
const PAD_B = 32;

const Y_MAX = 2.5;
const Y_MIN = 0;
const X_STEPS = 100;

function toSx(step: number): number {
  return PAD_L + (step / X_STEPS) * (CW - PAD_L - PAD_R);
}
function toSy(loss: number): number {
  return PAD_T + ((Y_MAX - Math.min(Y_MAX, loss)) / (Y_MAX - Y_MIN)) * (CH - PAD_T - PAD_B);
}

function buildLinePath(data: number[]): string {
  return data
    .map((v, i) => `${i === 0 ? "M" : "L"}${toSx(i)},${toSy(v)}`)
    .join(" ");
}

interface TrainingCurveChartProps {
  activeFunctionId: FunctionId;
}

export default function TrainingCurveChart({
  activeFunctionId,
}: TrainingCurveChartProps) {
  const allIds: FunctionId[] = ["relu", "sigmoid", "tanh", "leaky-relu"];
  const [visibleIds, setVisibleIds] = useState<Set<FunctionId>>(
    new Set(allIds)
  );

  function toggleId(id: FunctionId) {
    setVisibleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size === 1) return prev; // keep at least one visible
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const yTicks = [0, 0.5, 1.0, 1.5, 2.0, 2.5];
  const xTicks = [0, 25, 50, 75, 100];

  return (
    <div className="bg-[#0f172a] rounded-xl border border-[#1e293b] p-4">
      <h3 className="text-sm font-semibold text-white mb-1">
        Training Loss (Illustrative)
      </h3>
      <p className="text-[11px] text-[#475569] mb-3">
        Stylized curves showing the typical convergence pattern of each
        function; not data from a real training run
      </p>

      <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full">
        {/* Grid */}
        {yTicks.map((y) => (
          <line
            key={`yg-${y}`}
            x1={PAD_L}
            y1={toSy(y)}
            x2={CW - PAD_R}
            y2={toSy(y)}
            stroke="#1e293b"
            strokeWidth="1"
          />
        ))}
        {xTicks.map((x) => (
          <line
            key={`xg-${x}`}
            x1={toSx(x)}
            y1={PAD_T}
            x2={toSx(x)}
            y2={CH - PAD_B}
            stroke="#1e293b"
            strokeWidth="1"
          />
        ))}

        {/* Axes */}
        <line
          x1={PAD_L}
          y1={PAD_T}
          x2={PAD_L}
          y2={CH - PAD_B}
          stroke="#334155"
          strokeWidth="1.5"
        />
        <line
          x1={PAD_L}
          y1={CH - PAD_B}
          x2={CW - PAD_R}
          y2={CH - PAD_B}
          stroke="#334155"
          strokeWidth="1.5"
        />

        {/* Tick labels */}
        {yTicks.map((y) => (
          <text
            key={`yt-${y}`}
            x={PAD_L - 4}
            y={toSy(y) + 3}
            fill="#475569"
            fontSize="8"
            textAnchor="end"
          >
            {y.toFixed(1)}
          </text>
        ))}
        {xTicks.map((x) => (
          <text
            key={`xt-${x}`}
            x={toSx(x)}
            y={CH - PAD_B + 12}
            fill="#475569"
            fontSize="8"
            textAnchor="middle"
          >
            {x}
          </text>
        ))}

        {/* Axis labels */}
        <text
          x={(PAD_L + CW - PAD_R) / 2}
          y={CH - 4}
          fill="#475569"
          fontSize="8.5"
          textAnchor="middle"
        >
          Iterations
        </text>
        <text
          x={9}
          y={(PAD_T + CH - PAD_B) / 2}
          fill="#475569"
          fontSize="8.5"
          textAnchor="middle"
          transform={`rotate(-90, 9, ${(PAD_T + CH - PAD_B) / 2})`}
        >
          Loss
        </text>

        {/* Loss curves */}
        {allIds.map((id) => {
          const isVisible = visibleIds.has(id);
          const isActive = id === activeFunctionId;
          if (!isVisible) return null;
          return (
            <path
              key={id}
              d={buildLinePath(CURVE_DATA[id])}
              fill="none"
              stroke={CURVE_COLORS[id]}
              strokeWidth={isActive ? 2.5 : 1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={isActive ? 1 : 0.45}
            />
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-3">
        {allIds.map((id) => (
          <button
            key={id}
            onClick={() => toggleId(id)}
            aria-pressed={visibleIds.has(id)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] border transition-all"
            style={{
              borderColor: visibleIds.has(id) ? CURVE_COLORS[id] : "#334155",
              backgroundColor: visibleIds.has(id)
                ? `${CURVE_COLORS[id]}18`
                : "transparent",
              color: visibleIds.has(id) ? CURVE_COLORS[id] : "#475569",
            }}
          >
            <span
              className="w-3 h-0.5 rounded"
              style={{
                backgroundColor: visibleIds.has(id)
                  ? CURVE_COLORS[id]
                  : "#334155",
              }}
            />
            {CURVE_LABELS[id]}
          </button>
        ))}
      </div>

      {/* Insight */}
      <p className="mt-3 text-[11px] text-[#475569] leading-relaxed">
        <span className="text-[#3bb4a4] font-semibold">ReLU</span> and{" "}
        <span className="text-[#a855f7] font-semibold">Leaky ReLU</span>{" "}
        converge fastest.{" "}
        <span className="text-[#93c5fd] font-semibold">
          Sigmoid
        </span>{" "}
        typically struggles in deep networks due to vanishing gradients. These
        illustrative curves exaggerate the pattern for clarity.
      </p>
    </div>
  );
}
