"use client";

import React from "react";
import { motion } from "framer-motion";

const W = 560;
const H = 280;
const PAD = { l: 52, r: 20, t: 20, b: 48 };
const CW = W - PAD.l - PAD.r;
const CH = H - PAD.t - PAD.b;

// X domain: 0..1 (normalized complexity)
function cx(t: number) {
  return PAD.l + t * CW;
}
// Y domain: 0..1 (normalized error, higher = more error)
function cy(e: number) {
  return PAD.t + (1 - e) * CH;
}

// Training error: starts moderate, decreases and flattens near 0
function trainError(t: number) {
  return 0.08 + 0.55 * Math.exp(-5 * t);
}

// Validation error: U-shaped
function valError(t: number) {
  const optimum = 0.38;
  const base = 0.22;
  const rise = 0.55;
  return base + rise * (t - optimum) ** 2 * 6;
}

// Generate polyline points
const NUM_PTS = 120;
const tValues = Array.from({ length: NUM_PTS }, (_, i) => i / (NUM_PTS - 1));

function buildPolyline(fn: (t: number) => number) {
  return tValues
    .map((t) => {
      const e = Math.max(0.01, Math.min(0.99, fn(t)));
      return `${cx(t).toFixed(1)},${cy(e).toFixed(1)}`;
    })
    .join(" ");
}

const trainPts = buildPolyline(trainError);
const valPts = buildPolyline(valError);

// Optimal point: minimum of val error
const optT = 0.38;
const optE = valError(optT);

// Zone boundaries
const underfitEnd = 0.22;
const overfitStart = 0.56;

export default function LearningCurve() {
  // X-axis tick labels
  const xLabels = [
    { t: 0, label: "Low" },
    { t: 0.5, label: "Medium" },
    { t: 1, label: "High" },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6"
    >
      {/* Header */}
      <div className="mb-5">
        <div className="inline-flex items-center gap-2 bg-[#1e5d8a]/20 border border-[#1e5d8a]/40 rounded-full px-3 py-1 mb-2">
          <span className="text-xs font-semibold text-[#3bb4a4] uppercase tracking-wider">Section 4</span>
        </div>
        <h2 className="text-xl font-bold text-white">Bias-Variance Tradeoff & the Validation Curve</h2>
        <p className="text-sm text-[#94a3b8] mt-1">
          Error versus model complexity (a validation curve; a learning curve would
          instead plot error versus training-set size). Understand when your model
          is too simple (high bias) or too complex (high variance).
        </p>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] overflow-hidden mb-5">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          {/* Zone backgrounds */}
          {/* Underfitting */}
          <rect
            x={cx(0)}
            y={PAD.t}
            width={cx(underfitEnd) - cx(0)}
            height={CH}
            fill="#ef4444"
            opacity={0.06}
          />
          {/* Sweet spot */}
          <rect
            x={cx(underfitEnd)}
            y={PAD.t}
            width={cx(overfitStart) - cx(underfitEnd)}
            height={CH}
            fill="#22c55e"
            opacity={0.06}
          />
          {/* Overfitting */}
          <rect
            x={cx(overfitStart)}
            y={PAD.t}
            width={cx(1) - cx(overfitStart)}
            height={CH}
            fill="#f97316"
            opacity={0.06}
          />

          {/* Grid */}
          {[0.2, 0.4, 0.6, 0.8].map((e) => (
            <line
              key={e}
              x1={PAD.l}
              y1={cy(e)}
              x2={W - PAD.r}
              y2={cy(e)}
              stroke="#1e293b"
              strokeWidth="1"
            />
          ))}

          {/* Optimal complexity line */}
          <line
            x1={cx(optT)}
            y1={PAD.t}
            x2={cx(optT)}
            y2={PAD.t + CH}
            stroke="#d4af37"
            strokeWidth="2"
            strokeDasharray="5 3"
          />

          {/* Training error curve */}
          <polyline
            points={trainPts}
            fill="none"
            stroke="#3bb4a4"
            strokeWidth="2.5"
          />

          {/* Validation error curve */}
          <polyline
            points={valPts}
            fill="none"
            stroke="#ef4444"
            strokeWidth="2.5"
          />

          {/* Optimal point marker */}
          <circle
            cx={cx(optT)}
            cy={cy(optE)}
            r="5"
            fill="#d4af37"
            stroke="#0a0e1a"
            strokeWidth="2"
          />

          {/* Zone labels */}
          <text x={cx(underfitEnd / 2)} y={PAD.t + 16} fill="#ef4444" fontSize="10" textAnchor="middle" fontWeight="600" opacity={0.8}>
            Underfitting
          </text>
          <text x={cx((underfitEnd + overfitStart) / 2)} y={PAD.t + 16} fill="#22c55e" fontSize="10" textAnchor="middle" fontWeight="600" opacity={0.8}>
            Sweet Spot
          </text>
          <text x={cx((overfitStart + 1) / 2)} y={PAD.t + 16} fill="#f97316" fontSize="10" textAnchor="middle" fontWeight="600" opacity={0.8}>
            Overfitting
          </text>

          {/* Optimal label */}
          <text x={cx(optT) + 5} y={PAD.t + 30} fill="#d4af37" fontSize="9" fontWeight="600">
            Optimal
          </text>

          {/* Axes */}
          <line x1={PAD.l} y1={PAD.t + CH} x2={W - PAD.r} y2={PAD.t + CH} stroke="#334155" strokeWidth="1" />
          <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + CH} stroke="#334155" strokeWidth="1" />

          {/* X-axis labels */}
          {xLabels.map(({ t, label }) => (
            <text key={label} x={cx(t)} y={H - 8} fill="#64748b" fontSize="10" textAnchor="middle">
              {label}
            </text>
          ))}

          {/* X-axis title */}
          <text x={W / 2} y={H - PAD.b + 36} fill="#64748b" fontSize="10" textAnchor="middle">
            Model Complexity →
          </text>

          {/* Y-axis label */}
          <text
            x={14}
            y={PAD.t + CH / 2}
            fill="#64748b"
            fontSize="10"
            textAnchor="middle"
            transform={`rotate(-90, 14, ${PAD.t + CH / 2})`}
          >
            Error
          </text>

          {/* Legend */}
          <g transform={`translate(${W - PAD.r - 140}, ${PAD.t + 8})`}>
            <rect width="136" height="46" rx="4" fill="#0a0e1a" stroke="#1e293b" strokeWidth="1" />
            <line x1="8" y1="16" x2="28" y2="16" stroke="#3bb4a4" strokeWidth="2.5" />
            <text x="34" y="20" fill="#94a3b8" fontSize="10">Training Error</text>
            <line x1="8" y1="34" x2="28" y2="34" stroke="#ef4444" strokeWidth="2.5" />
            <text x="34" y="38" fill="#94a3b8" fontSize="10">Validation Error</text>
          </g>
        </svg>
      </div>

      {/* Three zone cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {[
          {
            title: "Underfitting",
            color: "#ef4444",
            bgColor: "#ef4444",
            icon: "↘",
            items: [
              "High bias, low variance",
              "Model too simple",
              "Both train & test error high",
              "Solution: increase complexity",
            ],
          },
          {
            title: "Sweet Spot",
            color: "#22c55e",
            bgColor: "#22c55e",
            icon: "✓",
            items: [
              "Balanced bias and variance",
              "Good generalization",
              "Low test error",
              "Use cross-validation to find it",
            ],
          },
          {
            title: "Overfitting",
            color: "#f97316",
            bgColor: "#f97316",
            icon: "↗",
            items: [
              "Low bias, high variance",
              "Model memorizes noise",
              "Low train, high test error",
              "Solution: regularize / simplify",
            ],
          },
        ].map(({ title, color, bgColor, icon, items }) => (
          <div
            key={title}
            className="rounded-xl border p-4"
            style={{ borderColor: `${bgColor}30`, backgroundColor: `${bgColor}08` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg font-black" style={{ color }}>
                {icon}
              </span>
              <h3 className="text-sm font-bold" style={{ color }}>
                {title}
              </h3>
            </div>
            <ul className="space-y-1.5">
              {items.map((item) => (
                <li key={item} className="flex gap-2 text-xs text-[#94a3b8]">
                  <span style={{ color }} className="shrink-0">
                    •
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bias-Variance decomposition */}
      <div className="rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-5">
        <h3 className="text-sm font-bold text-[#d4af37] mb-4">Bias-Variance Decomposition</h3>
        <div className="flex flex-wrap items-center gap-2 text-base font-mono mb-4">
          <span className="text-white font-bold">MSE</span>
          <span className="text-[#94a3b8]">=</span>
          <span className="bg-[#ef4444]/20 border border-[#ef4444]/40 text-[#ef4444] rounded-lg px-3 py-1.5 font-bold">
            Bias²
          </span>
          <span className="text-[#94a3b8]">+</span>
          <span className="bg-[#f97316]/20 border border-[#f97316]/40 text-[#f97316] rounded-lg px-3 py-1.5 font-bold">
            Variance
          </span>
          <span className="text-[#94a3b8]">+</span>
          <span className="bg-[#475569]/30 border border-[#475569]/50 text-[#94a3b8] rounded-lg px-3 py-1.5">
            Irreducible Error
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {[
            {
              term: "Bias²",
              color: "#ef4444",
              desc: "Error from wrong assumptions. A linear model fitting quadratic data has high bias.",
            },
            {
              term: "Variance",
              color: "#f97316",
              desc: "Sensitivity to fluctuations in training data. A high-degree polynomial has high variance.",
            },
            {
              term: "Irreducible Error",
              color: "#94a3b8",
              desc: "Noise inherent in the data. Cannot be reduced by any model, no matter how good.",
            },
          ].map(({ term, color, desc }) => (
            <div key={term} className="rounded-lg bg-[#0a0e1a] border border-[#1e293b] p-3">
              <span className="font-bold block mb-1" style={{ color }}>
                {term}
              </span>
              <p className="text-[#94a3b8] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
