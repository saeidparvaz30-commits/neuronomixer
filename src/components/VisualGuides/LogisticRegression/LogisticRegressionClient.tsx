"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import {
  PASS_FAIL_DATA,
  LOGISTIC_INTERCEPT,
  LOGISTIC_SLOPE,
  LINEAR_INTERCEPT,
  LINEAR_SLOPE,
  sigmoid,
  predictProb,
  computeLinearPrediction,
  computeMetrics,
  computeCalibration,
} from "./types";

// ─── constants ────────────────────────────────────────────────────────────────
const W = 520, H = 320;
const PAD = { l: 52, r: 20, t: 20, b: 44 };
const IW = W - PAD.l - PAD.r;
const IH = H - PAD.t - PAD.b;

// Map data coords → SVG pixels
function tx(hours: number): number {
  return PAD.l + (hours / 10) * IW;
}
function ty(prob: number): number {
  return PAD.t + IH - prob * IH;
}

// Static y-jitter per point id to avoid overlap
function jitterY(id: string, passed: boolean): number {
  // Deterministic hash from id string
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  const frac = (h % 1000) / 1000; // 0..1
  const base = passed ? 1.0 : 0.0;
  const range = 0.07;
  return base + (frac - 0.5) * range;
}

// Smooth S-curve path (200 samples)
function sCurvePath(b0: number, b1: number): string {
  const pts = Array.from({ length: 200 }, (_, i) => {
    const x = (i / 199) * 10;
    const p = sigmoid(b0 + b1 * x);
    return `${i === 0 ? "M" : "L"} ${tx(x).toFixed(2)} ${ty(p).toFixed(2)}`;
  });
  return pts.join(" ");
}

// Linear regression line path
function linearLinePath(): string {
  const x0 = 0, x1 = 10;
  const y0 = computeLinearPrediction(x0);
  const y1 = computeLinearPrediction(x1);
  return `M ${tx(x0)} ${ty(y0)} L ${tx(x1)} ${ty(y1)}`;
}

// ─── Section 1: Comparison scatter ────────────────────────────────────────────
function ComparisonScatterLinear() {
  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  const xTicks = [0, 2, 4, 6, 8, 10];

  // Impossible regions: y < 0 and y > 1
  const impossibleBelow = `M ${tx(0)} ${ty(0)} L ${tx(10)} ${ty(0)} L ${tx(10)} ${ty(-0.25)} L ${tx(0)} ${ty(-0.25)} Z`;
  const impossibleAbove = `M ${tx(0)} ${ty(1)} L ${tx(10)} ${ty(1)} L ${tx(10)} ${ty(1.25)} L ${tx(0)} ${ty(1.25)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H + 30}`} width="100%">
      {/* Impossible zones */}
      <path d={impossibleBelow} fill="#ef444420" />
      <path d={impossibleAbove} fill="#ef444420" />
      <text x={tx(8)} y={ty(-0.12)} fill="#ef4444" fontSize="9" textAnchor="middle">Impossible!</text>
      <text x={tx(8)} y={ty(1.15)} fill="#ef4444" fontSize="9" textAnchor="middle">Impossible!</text>

      {/* Grid */}
      {yTicks.map(t => (
        <g key={t}>
          <line x1={PAD.l} y1={ty(t)} x2={PAD.l + IW} y2={ty(t)} stroke="#1e293b" strokeWidth="1" />
          <text x={PAD.l - 6} y={ty(t) + 3} textAnchor="end" fill="#475569" fontSize="8">{t}</text>
        </g>
      ))}
      {xTicks.map(t => (
        <g key={t}>
          <line x1={tx(t)} y1={PAD.t} x2={tx(t)} y2={PAD.t + IH} stroke="#1e293b" strokeWidth="1" />
          <text x={tx(t)} y={PAD.t + IH + 14} textAnchor="middle" fill="#475569" fontSize="8">{t}</text>
        </g>
      ))}

      {/* y=0 and y=1 constraint lines */}
      <line x1={PAD.l} y1={ty(0)} x2={PAD.l + IW} y2={ty(0)} stroke="#334155" strokeWidth="1.5" />
      <line x1={PAD.l} y1={ty(1)} x2={PAD.l + IW} y2={ty(1)} stroke="#334155" strokeWidth="1.5" />

      {/* Linear regression line (red) */}
      <path d={linearLinePath()} stroke="#ef4444" strokeWidth="2.5" fill="none" />

      {/* Scatter points */}
      {PASS_FAIL_DATA.map(pt => {
        const jy = jitterY(pt.id, pt.passed);
        return (
          <circle
            key={pt.id}
            cx={tx(pt.hours)}
            cy={ty(jy)}
            r="4"
            fill={pt.passed ? "#3bb4a4" : "#ef4444"}
            opacity="0.75"
            stroke="#0f172a"
            strokeWidth="0.8"
          />
        );
      })}

      {/* Axes */}
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke="#334155" strokeWidth="1.5" />
      <line x1={PAD.l} y1={PAD.t + IH} x2={PAD.l + IW} y2={PAD.t + IH} stroke="#334155" strokeWidth="1.5" />
      <text x={PAD.l + IW / 2} y={H + 20} textAnchor="middle" fill="#94a3b8" fontSize="10">Study Hours</text>
      <text x={12} y={PAD.t + IH / 2} textAnchor="middle" fill="#94a3b8" fontSize="10"
        transform={`rotate(-90, 12, ${PAD.t + IH / 2})`}>P(Pass)</text>

      {/* Legend */}
      <line x1={tx(0.5)} y1={H + 28} x2={tx(1.5)} y2={H + 28} stroke="#ef4444" strokeWidth="2.5" />
      <text x={tx(1.7)} y={H + 32} fill="#94a3b8" fontSize="8">Linear fit</text>
    </svg>
  );
}

function ComparisonScatterLogistic() {
  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  const xTicks = [0, 2, 4, 6, 8, 10];

  return (
    <svg viewBox={`0 0 ${W} ${H + 30}`} width="100%">
      {/* Grid */}
      {yTicks.map(t => (
        <g key={t}>
          <line x1={PAD.l} y1={ty(t)} x2={PAD.l + IW} y2={ty(t)} stroke="#1e293b" strokeWidth="1" />
          <text x={PAD.l - 6} y={ty(t) + 3} textAnchor="end" fill="#475569" fontSize="8">{t}</text>
        </g>
      ))}
      {xTicks.map(t => (
        <g key={t}>
          <line x1={tx(t)} y1={PAD.t} x2={tx(t)} y2={PAD.t + IH} stroke="#1e293b" strokeWidth="1" />
          <text x={tx(t)} y={PAD.t + IH + 14} textAnchor="middle" fill="#475569" fontSize="8">{t}</text>
        </g>
      ))}

      {/* Constraint boundaries */}
      <line x1={PAD.l} y1={ty(0)} x2={PAD.l + IW} y2={ty(0)} stroke="#334155" strokeWidth="1.5" strokeDasharray="4,3" />
      <line x1={PAD.l} y1={ty(1)} x2={PAD.l + IW} y2={ty(1)} stroke="#334155" strokeWidth="1.5" strokeDasharray="4,3" />

      {/* Logistic S-curve */}
      <path d={sCurvePath(LOGISTIC_INTERCEPT, LOGISTIC_SLOPE)} stroke="#3bb4a4" strokeWidth="2.5" fill="none" />

      {/* Scatter points */}
      {PASS_FAIL_DATA.map(pt => {
        const jy = jitterY(pt.id, pt.passed);
        return (
          <circle
            key={pt.id}
            cx={tx(pt.hours)}
            cy={ty(jy)}
            r="4"
            fill={pt.passed ? "#3bb4a4" : "#ef4444"}
            opacity="0.75"
            stroke="#0f172a"
            strokeWidth="0.8"
          />
        );
      })}

      {/* Axes */}
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke="#334155" strokeWidth="1.5" />
      <line x1={PAD.l} y1={PAD.t + IH} x2={PAD.l + IW} y2={PAD.t + IH} stroke="#334155" strokeWidth="1.5" />
      <text x={PAD.l + IW / 2} y={H + 20} textAnchor="middle" fill="#94a3b8" fontSize="10">Study Hours</text>
      <text x={12} y={PAD.t + IH / 2} textAnchor="middle" fill="#94a3b8" fontSize="10"
        transform={`rotate(-90, 12, ${PAD.t + IH / 2})`}>P(Pass)</text>

      {/* Legend */}
      <path d="M 60 316 L 100 316" stroke="#3bb4a4" strokeWidth="2.5" fill="none" />
      <text x={104} y={320} fill="#94a3b8" fontSize="8">Logistic S-curve</text>
      <text x={PAD.l + IW - 60} y={ty(1) - 6} fill="#475569" fontSize="8">Stays within [0,1]</text>
    </svg>
  );
}

// ─── Section 2: Interactive S-Curve ───────────────────────────────────────────
function InteractiveSCurve({
  b0, b1,
}: { b0: number; b1: number }) {
  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  const xTicks = [0, 2, 4, 6, 8, 10];
  const inflection = b1 === 0 ? Infinity : -b0 / b1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {/* Grid */}
      {yTicks.map(t => (
        <g key={t}>
          <line x1={PAD.l} y1={ty(t)} x2={PAD.l + IW} y2={ty(t)} stroke="#1e293b" strokeWidth="1" />
          <text x={PAD.l - 6} y={ty(t) + 3} textAnchor="end" fill="#475569" fontSize="8">{t}</text>
        </g>
      ))}
      {xTicks.map(t => (
        <g key={t}>
          <line x1={tx(t)} y1={PAD.t} x2={tx(t)} y2={PAD.t + IH} stroke="#1e293b" strokeWidth="1" />
          <text x={tx(t)} y={PAD.t + IH + 14} textAnchor="middle" fill="#475569" fontSize="8">{t}</text>
        </g>
      ))}

      {/* Constraint boundaries */}
      <line x1={PAD.l} y1={ty(0)} x2={PAD.l + IW} y2={ty(0)} stroke="#334155" strokeWidth="1" strokeDasharray="4,3" />
      <line x1={PAD.l} y1={ty(1)} x2={PAD.l + IW} y2={ty(1)} stroke="#334155" strokeWidth="1" strokeDasharray="4,3" />
      <line x1={PAD.l} y1={ty(0.5)} x2={PAD.l + IW} y2={ty(0.5)} stroke="#334155" strokeWidth="1" strokeDasharray="2,2" />

      {/* Scatter points */}
      {PASS_FAIL_DATA.map(pt => {
        const jy = jitterY(pt.id, pt.passed);
        return (
          <circle
            key={pt.id}
            cx={tx(pt.hours)}
            cy={ty(jy)}
            r="3.5"
            fill={pt.passed ? "#3bb4a4" : "#ef4444"}
            opacity="0.55"
            stroke="#0f172a"
            strokeWidth="0.5"
          />
        );
      })}

      {/* Animated S-curve */}
      <motion.path
        d={sCurvePath(b0, b1)}
        stroke="#d4af37"
        strokeWidth="2.5"
        fill="none"
        animate={{ d: sCurvePath(b0, b1) }}
        transition={{ duration: 0.25 }}
      />

      {/* Inflection vertical */}
      {inflection >= 0 && inflection <= 10 && (
        <g>
          <line
            x1={tx(inflection)} y1={ty(0.5)}
            x2={tx(inflection)} y2={ty(0.5) - 40}
            stroke="#d4af37" strokeWidth="1" strokeDasharray="3,2" opacity="0.6"
          />
          <circle cx={tx(inflection)} cy={ty(0.5)} r="4" fill="#d4af37" opacity="0.9" />
          <text x={tx(inflection) + 6} y={ty(0.5) - 12} fill="#d4af37" fontSize="8">
            50% @ {inflection.toFixed(1)}h
          </text>
        </g>
      )}

      {/* Axes */}
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke="#334155" strokeWidth="1.5" />
      <line x1={PAD.l} y1={PAD.t + IH} x2={PAD.l + IW} y2={PAD.t + IH} stroke="#334155" strokeWidth="1.5" />
      <text x={PAD.l + IW / 2} y={H - 4} textAnchor="middle" fill="#94a3b8" fontSize="10">Study Hours</text>
      <text x={12} y={PAD.t + IH / 2} textAnchor="middle" fill="#94a3b8" fontSize="10"
        transform={`rotate(-90, 12, ${PAD.t + IH / 2})`}>P(Pass)</text>
    </svg>
  );
}

// ─── Section 3: Threshold SVG ──────────────────────────────────────────────────
function ThresholdScatter({
  threshold,
  b0,
  b1,
}: { threshold: number; b0: number; b1: number }) {
  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  const xTicks = [0, 2, 4, 6, 8, 10];

  // x-position where P = threshold (logit inverse)
  const logitT = Math.log(threshold / (1 - threshold));
  const threshX = b1 === 0 ? 5 : (logitT - b0) / b1;
  const clampedThreshX = Math.max(0, Math.min(10, threshX));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {/* Grid */}
      {yTicks.map(t => (
        <g key={t}>
          <line x1={PAD.l} y1={ty(t)} x2={PAD.l + IW} y2={ty(t)} stroke="#1e293b" strokeWidth="1" />
          <text x={PAD.l - 6} y={ty(t) + 3} textAnchor="end" fill="#475569" fontSize="8">{t}</text>
        </g>
      ))}
      {xTicks.map(t => (
        <g key={t}>
          <line x1={tx(t)} y1={PAD.t} x2={tx(t)} y2={PAD.t + IH} stroke="#1e293b" strokeWidth="1" />
          <text x={tx(t)} y={PAD.t + IH + 14} textAnchor="middle" fill="#475569" fontSize="8">{t}</text>
        </g>
      ))}

      {/* S-curve */}
      <path d={sCurvePath(b0, b1)} stroke="#3bb4a4" strokeWidth="2" fill="none" opacity="0.6" />

      {/* Horizontal threshold dashed line */}
      <line
        x1={PAD.l} y1={ty(threshold)}
        x2={PAD.l + IW} y2={ty(threshold)}
        stroke="#d4af37" strokeWidth="1.5" strokeDasharray="5,3"
      />
      <text x={PAD.l + IW + 2} y={ty(threshold) + 3} fill="#d4af37" fontSize="7.5">
        {(threshold * 100).toFixed(0)}%
      </text>

      {/* Vertical threshold line */}
      {threshX >= 0 && threshX <= 10 && (
        <line
          x1={tx(clampedThreshX)} y1={PAD.t}
          x2={tx(clampedThreshX)} y2={PAD.t + IH}
          stroke="#d4af37" strokeWidth="1.5" strokeDasharray="5,3"
        />
      )}

      {/* Scatter points colored by prediction correctness */}
      {PASS_FAIL_DATA.map(pt => {
        const prob = predictProb(pt.hours, b0, b1);
        const predicted = prob >= threshold;
        const correct = predicted === pt.passed;
        const jy = jitterY(pt.id, pt.passed);

        if (correct) {
          return (
            <circle
              key={pt.id}
              cx={tx(pt.hours)}
              cy={ty(jy)}
              r="4.5"
              fill={pt.passed ? "#3bb4a4" : "#ef4444"}
              opacity="0.8"
              stroke="#0f172a"
              strokeWidth="0.8"
            />
          );
        }
        // Wrong prediction: draw X mark
        const cx = tx(pt.hours);
        const cy2 = ty(jy);
        const r = 4.5;
        return (
          <g key={pt.id}>
            <circle cx={cx} cy={cy2} r={r} fill="none"
              stroke={pt.passed ? "#3bb4a4" : "#ef4444"}
              strokeWidth="1.5" opacity="0.6" />
            <line x1={cx - r * 0.6} y1={cy2 - r * 0.6} x2={cx + r * 0.6} y2={cy2 + r * 0.6}
              stroke="#f97316" strokeWidth="1.2" />
            <line x1={cx + r * 0.6} y1={cy2 - r * 0.6} x2={cx - r * 0.6} y2={cy2 + r * 0.6}
              stroke="#f97316" strokeWidth="1.2" />
          </g>
        );
      })}

      {/* Axes */}
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke="#334155" strokeWidth="1.5" />
      <line x1={PAD.l} y1={PAD.t + IH} x2={PAD.l + IW} y2={PAD.t + IH} stroke="#334155" strokeWidth="1.5" />
      <text x={PAD.l + IW / 2} y={H - 4} textAnchor="middle" fill="#94a3b8" fontSize="10">Study Hours</text>
      <text x={12} y={PAD.t + IH / 2} textAnchor="middle" fill="#94a3b8" fontSize="10"
        transform={`rotate(-90, 12, ${PAD.t + IH / 2})`}>P(Pass)</text>
    </svg>
  );
}

// ─── Section 6: Calibration Plot ──────────────────────────────────────────────
function CalibrationPlot({ b0, b1 }: { b0: number; b1: number }) {
  const CW = 400, CH = 300;
  const CP = { l: 50, r: 20, t: 20, b: 50 };
  const CIW = CW - CP.l - CP.r;
  const CIH = CH - CP.t - CP.b;

  const ctxP = (v: number) => CP.l + v * CIW;
  const ctyP = (v: number) => CP.t + CIH - v * CIH;

  const calibData = computeCalibration(PASS_FAIL_DATA, b0, b1);
  const ticks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <svg viewBox={`0 0 ${CW} ${CH}`} width="100%">
      {/* Grid */}
      {ticks.map(t => (
        <g key={t}>
          <line x1={CP.l} y1={ctyP(t)} x2={CP.l + CIW} y2={ctyP(t)} stroke="#1e293b" strokeWidth="1" />
          <line x1={ctxP(t)} y1={CP.t} x2={ctxP(t)} y2={CP.t + CIH} stroke="#1e293b" strokeWidth="1" />
          <text x={CP.l - 5} y={ctyP(t) + 3} textAnchor="end" fill="#475569" fontSize="8">{t.toFixed(1)}</text>
          <text x={ctxP(t)} y={CP.t + CIH + 14} textAnchor="middle" fill="#475569" fontSize="8">{t.toFixed(1)}</text>
        </g>
      ))}

      {/* Perfect calibration diagonal */}
      <line
        x1={ctxP(0)} y1={ctyP(0)}
        x2={ctxP(1)} y2={ctyP(1)}
        stroke="#475569" strokeWidth="1.5" strokeDasharray="5,3"
      />
      <text x={ctxP(0.75)} y={ctyP(0.82)} fill="#475569" fontSize="7.5" transform={`rotate(-45, ${ctxP(0.75)}, ${ctyP(0.82)})`}>
        Perfect
      </text>

      {/* Calibration dots */}
      {calibData.map((d, i) => (
        <g key={i}>
          <line
            x1={ctxP(d.predicted)} y1={ctyP(d.predicted)}
            x2={ctxP(d.predicted)} y2={ctyP(d.actual)}
            stroke="#d4af37" strokeWidth="1" opacity="0.4"
          />
          <circle
            cx={ctxP(d.predicted)}
            cy={ctyP(d.actual)}
            r="6"
            fill="#d4af37"
            opacity="0.85"
            stroke="#0f172a"
            strokeWidth="1"
          />
          <text x={ctxP(d.predicted)} y={ctyP(d.actual) - 9} textAnchor="middle" fill="#d4af37" fontSize="7">
            {(d.actual * 100).toFixed(0)}%
          </text>
        </g>
      ))}

      {/* Axes */}
      <line x1={CP.l} y1={CP.t} x2={CP.l} y2={CP.t + CIH} stroke="#334155" strokeWidth="1.5" />
      <line x1={CP.l} y1={CP.t + CIH} x2={CP.l + CIW} y2={CP.t + CIH} stroke="#334155" strokeWidth="1.5" />
      <text x={CP.l + CIW / 2} y={CH - 6} textAnchor="middle" fill="#94a3b8" fontSize="9">Mean Predicted Probability</text>
      <text x={13} y={CP.t + CIH / 2} textAnchor="middle" fill="#94a3b8" fontSize="9"
        transform={`rotate(-90, 13, ${CP.t + CIH / 2})`}>Actual Fraction Passed</text>
    </svg>
  );
}

// ─── Progress Dots ─────────────────────────────────────────────────────────────
function ProgressDots({ steps }: { steps: { label: string; done: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-8">
      {steps.map(({ label, done }) => (
        <div key={label} className="flex items-center gap-1.5">
          <motion.div
            className="w-2.5 h-2.5 rounded-full"
            animate={{ backgroundColor: done ? "#3bb4a4" : "#1e293b" }}
            transition={{ duration: 0.4 }}
          />
          <span className={`text-[11px] transition-colors ${done ? "text-white" : "text-[#475569]"}`}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Slider ────────────────────────────────────────────────────────────────────
function Slider({
  label, value, min, max, step, onChange, color = "#d4af37",
}: {
  label: string; value: number; min: number; max: number;
  step: number; onChange: (v: number) => void; color?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-[11px] text-[#94a3b8]">{label}</span>
        <span className="text-[12px] font-mono" style={{ color }}>{value.toFixed(2)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: color }}
      />
    </div>
  );
}

// ─── MetricCard ────────────────────────────────────────────────────────────────
function MetricCard({ label, value, desc, color }: { label: string; value: string; desc: string; color: string }) {
  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color }}>{label}</p>
      <motion.p
        className="text-xl font-black font-mono mb-1"
        style={{ color }}
        key={value}
        animate={{ opacity: [0.5, 1] }}
        transition={{ duration: 0.3 }}
      >
        {value}
      </motion.p>
      <p className="text-[10px] text-[#475569] leading-relaxed">{desc}</p>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function LogisticRegressionClient() {
  const { data: session } = useSession();

  // Section 2 sliders
  const [b0, setB0] = useState(LOGISTIC_INTERCEPT);
  const [b1, setB1] = useState(LOGISTIC_SLOPE);

  // Section 3 threshold
  const [threshold, setThreshold] = useState(0.5);

  // Progress tracking
  const [comparisonViewed, setComparisonViewed]   = useState(false);
  const [thresholdAdjusted, setThresholdAdjusted] = useState(false);
  const [sensitivitySpecificityObserved, setSensitivitySpecificityObserved] = useState(false);
  const [oddsRatioInterpreted, setOddsRatioInterpreted] = useState(false);
  const [calibrationViewed, setCalibrationViewed] = useState(false);

  const completionFired = useRef(false);

  // Sensitivity / specificity baseline for tracking change
  const baselineMetrics = useRef<{ sens: number; spec: number } | null>(null);

  const metrics = computeMetrics(PASS_FAIL_DATA, threshold, b0, b1);

  // IntersectionObserver refs
  const comparisonRef  = useRef<HTMLDivElement>(null);
  const calibrationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observerOptions = { threshold: 0.3 };
    const compObs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setComparisonViewed(true);
    }, observerOptions);
    const calObs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setCalibrationViewed(true);
    }, observerOptions);
    if (comparisonRef.current) compObs.observe(comparisonRef.current);
    if (calibrationRef.current) calObs.observe(calibrationRef.current);
    return () => { compObs.disconnect(); calObs.disconnect(); };
  }, []);

  // Track threshold adjustment and metric changes
  const handleThresholdChange = useCallback((v: number) => {
    setThreshold(v);
    setThresholdAdjusted(true);

    if (!baselineMetrics.current) {
      baselineMetrics.current = { sens: metrics.sensitivity, spec: metrics.specificity };
    } else {
      const newMetrics = computeMetrics(PASS_FAIL_DATA, v, b0, b1);
      const sensDelta = Math.abs(newMetrics.sensitivity - baselineMetrics.current.sens);
      const specDelta = Math.abs(newMetrics.specificity - baselineMetrics.current.spec);
      if (sensDelta > 0.05 && specDelta > 0.05) {
        setSensitivitySpecificityObserved(true);
      }
    }
  }, [metrics.sensitivity, metrics.specificity, b0, b1]);

  // Completion effect
  const allComplete = comparisonViewed && thresholdAdjusted && sensitivitySpecificityObserved && oddsRatioInterpreted && calibrationViewed;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "logistic-regression", score: 8 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  // Derived values
  const inflection = b1 === 0 ? Infinity : -b0 / b1;
  const oddsRatio  = Math.exp(b1);
  const oddsRatioDisplay = oddsRatio.toFixed(3);
  const oddsRatioIncrease = ((oddsRatio - 1) * 100).toFixed(0);

  const progressSteps = [
    { label: "Linear vs logistic comparison viewed", done: comparisonViewed },
    { label: "Threshold adjusted",                   done: thresholdAdjusted },
    { label: "Sensitivity/specificity trade-off observed", done: sensitivitySpecificityObserved },
    { label: "Odds ratio interpreted",               done: oddsRatioInterpreted },
    { label: "Calibration plot examined",            done: calibrationViewed },
  ];

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Logistic Regression</span>
        </nav>

        {/* Hero */}
        <motion.section
          className="mb-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[#d4af37]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#d4af37]">
              UNIT 11: GENERALIZED MODELS
            </span>
            <span className="w-6 h-px bg-[#d4af37]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Logistic Regression:{" "}
            <span className="text-[#d4af37]">Predicting Yes or No</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[680px]">
            Linear regression fails at binary outcomes. The logistic S-curve keeps predictions
            between 0 and 1. Adjust the curve, tune the threshold, and read the confusion matrix in real time.
          </p>
        </motion.section>

        {/* Progress */}
        <ProgressDots steps={progressSteps} />
        {!session?.user && (
          <p className="text-[11px] text-[#475569] mb-6">
            <Link href="/auth/sign-in" className="underline underline-offset-2 hover:text-[#94a3b8]">
              Sign in
            </Link>{" "}
            to save your progress
          </p>
        )}
        <AnimatePresence>
          {allComplete && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-center gap-2 text-[12px] font-semibold text-[#3bb4a4]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Guide complete! Great work.
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Section 1: Linear vs Logistic ──────────────────────────────────── */}
        <motion.section
          ref={comparisonRef}
          className="mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <h2 className="text-lg font-bold text-white mb-1">
            1. The Problem with Linear Regression
          </h2>
          <p className="text-[13px] text-[#94a3b8] mb-5 max-w-[640px]">
            When the outcome is binary (pass/fail), linear regression can predict impossible values
            outside [0, 1]. The logistic function solves this.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Linear */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 rounded-full bg-[#ef4444]" />
                <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#ef4444]">
                  Linear Regression
                </p>
              </div>
              <ComparisonScatterLinear />
            </div>
            {/* Logistic */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 rounded-full bg-[#3bb4a4]" />
                <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#3bb4a4]">
                  Logistic Regression
                </p>
              </div>
              <ComparisonScatterLogistic />
            </div>
          </div>

          {/* Caption cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="rounded-xl border border-[#ef4444]/30 bg-[#ef444410] p-4">
              <p className="text-[12px] text-[#ef4444] font-semibold mb-1">Linear: Breaks the rules</p>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                Linear regression predicts negative probabilities and values above 1 — both mathematically impossible for a probability.
              </p>
            </div>
            <div className="rounded-xl border border-[#3bb4a4]/30 bg-[#3bb4a410] p-4">
              <p className="text-[12px] text-[#3bb4a4] font-semibold mb-1">Logistic: Stays bounded</p>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                The sigmoid function squashes any real-valued linear combination into the (0, 1) interval — always a valid probability.
              </p>
            </div>
          </div>
        </motion.section>

        {/* ── Section 2: Interactive S-Curve ─────────────────────────────────── */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <h2 className="text-lg font-bold text-white mb-1">2. Shape the S-Curve</h2>
          <p className="text-[13px] text-[#94a3b8] mb-5 max-w-[640px]">
            Adjust the intercept and slope to explore how the logistic curve fits the data.
            The gold dot marks the 50% inflection point.
          </p>

          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
            {/* Equation */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <p className="text-[12px] font-mono text-white">
                P(Pass) = 1 / (1 + e<sup>−(β₀ + β₁ × Hours)</sup>)
              </p>
              <span className="text-[#475569] text-[11px]">
                = 1 / (1 + e<sup>−({b0.toFixed(2)} + {b1.toFixed(2)} × Hours)</sup>)
              </span>
            </div>

            <div className="mb-4">
              <InteractiveSCurve b0={b0} b1={b1} />
            </div>

            {/* Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-4">
              <Slider
                label="Intercept (β₀)"
                value={b0}
                min={-10} max={0} step={0.1}
                onChange={setB0}
                color="#3bb4a4"
              />
              <Slider
                label="Slope (β₁)"
                value={b1}
                min={0.1} max={3.0} step={0.05}
                onChange={setB1}
                color="#d4af37"
              />
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-[11px] text-[#475569]">
                Inflection point (50% probability):{" "}
                <span className="text-[#d4af37] font-semibold font-mono">
                  {isFinite(inflection) ? `${inflection.toFixed(2)} hours` : "—"}
                </span>
              </p>
              <button
                onClick={() => { setB0(LOGISTIC_INTERCEPT); setB1(LOGISTIC_SLOPE); }}
                className="px-3 py-1.5 rounded-xl text-[11px] font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
              >
                Reset to fit
              </button>
            </div>
          </div>
        </motion.section>

        {/* ── Section 3: Threshold Slider ────────────────────────────────────── */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <h2 className="text-lg font-bold text-white mb-1">3. Choose a Decision Threshold</h2>
          <p className="text-[13px] text-[#94a3b8] mb-5 max-w-[640px]">
            Points whose predicted probability is at or above the threshold are classified as PASS.
            Drag the slider to see how predictions change. Incorrect predictions are shown with an X mark.
          </p>

          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
            <div className="mb-4">
              <ThresholdScatter threshold={threshold} b0={b0} b1={b1} />
            </div>

            <div className="mb-4">
              <Slider
                label={`Decision Threshold: ${(threshold * 100).toFixed(0)}%`}
                value={threshold}
                min={0.01} max={0.99} step={0.01}
                onChange={handleThresholdChange}
                color="#d4af37"
              />
            </div>

            {/* Live counts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "True Pos (TP)", value: metrics.tp, color: "#3bb4a4" },
                { label: "False Pos (FP)", value: metrics.fp, color: "#ef4444" },
                { label: "True Neg (TN)", value: metrics.tn, color: "#3bb4a4" },
                { label: "False Neg (FN)", value: metrics.fn, color: "#ef4444" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl border border-[#1e293b] p-3 text-center">
                  <p className="text-[10px] text-[#475569] mb-1">{label}</p>
                  <motion.p
                    className="text-2xl font-black font-mono"
                    style={{ color }}
                    key={value}
                    animate={{ opacity: [0.4, 1] }}
                    transition={{ duration: 0.25 }}
                  >
                    {value}
                  </motion.p>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-3 text-[10px] text-[#475569]">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full bg-[#3bb4a4] opacity-80" />
                Teal = PASS class
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full bg-[#ef4444] opacity-80" />
                Red = FAIL class
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-[#f97316]">✕</span>
                Wrong prediction
              </span>
            </div>
          </div>
        </motion.section>

        {/* ── Section 4: Performance Metrics ────────────────────────────────── */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <h2 className="text-lg font-bold text-white mb-1">4. Performance Metrics</h2>
          <p className="text-[13px] text-[#94a3b8] mb-5 max-w-[640px]">
            All metrics update automatically as you adjust the threshold above.
            Notice that sensitivity and specificity trade off against each other.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Metrics */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-4">
                Classification Metrics
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <MetricCard
                  label="Sensitivity"
                  value={`${(metrics.sensitivity * 100).toFixed(1)}%`}
                  desc={`Of actual passes, correctly caught ${metrics.tp} out of ${metrics.tp + metrics.fn}`}
                  color="#3bb4a4"
                />
                <MetricCard
                  label="Specificity"
                  value={`${(metrics.specificity * 100).toFixed(1)}%`}
                  desc={`Of actual fails, correctly rejected ${metrics.tn} out of ${metrics.tn + metrics.fp}`}
                  color="#60a5fa"
                />
                <MetricCard
                  label="Precision"
                  value={`${(metrics.precision * 100).toFixed(1)}%`}
                  desc="Of predicted passes, fraction truly passed"
                  color="#a855f7"
                />
                <MetricCard
                  label="F1 Score"
                  value={metrics.f1.toFixed(3)}
                  desc="Harmonic mean of precision and sensitivity"
                  color="#d4af37"
                />
              </div>
              <div className="mt-3 pt-3 border-t border-[#1e293b] flex justify-between items-center">
                <span className="text-[11px] text-[#475569]">Accuracy</span>
                <motion.span
                  className="text-[14px] font-black font-mono text-white"
                  key={metrics.accuracy.toFixed(3)}
                  animate={{ opacity: [0.5, 1] }}
                  transition={{ duration: 0.25 }}
                >
                  {(metrics.accuracy * 100).toFixed(1)}%
                </motion.span>
              </div>
            </div>

            {/* Confusion Matrix */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-4">
                Confusion Matrix
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-center text-[11px] border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 text-[#475569] font-normal" />
                      <th className="p-2 text-[#3bb4a4] font-semibold">Actual PASS</th>
                      <th className="p-2 text-[#ef4444] font-semibold">Actual FAIL</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 text-[#3bb4a4] font-semibold text-left">Predicted PASS</td>
                      <td className="p-2">
                        <motion.div
                          key={metrics.tp}
                          animate={{ opacity: [0.4, 1] }}
                          transition={{ duration: 0.25 }}
                          className="rounded-lg bg-[#3bb4a4]/20 border border-[#3bb4a4]/30 py-2 px-3"
                        >
                          <p className="text-[18px] font-black font-mono text-[#3bb4a4]">{metrics.tp}</p>
                          <p className="text-[9px] text-[#3bb4a4]/70">True Positive</p>
                        </motion.div>
                      </td>
                      <td className="p-2">
                        <motion.div
                          key={metrics.fp}
                          animate={{ opacity: [0.4, 1] }}
                          transition={{ duration: 0.25 }}
                          className="rounded-lg bg-[#ef4444]/20 border border-[#ef4444]/30 py-2 px-3"
                        >
                          <p className="text-[18px] font-black font-mono text-[#ef4444]">{metrics.fp}</p>
                          <p className="text-[9px] text-[#ef4444]/70">False Positive</p>
                        </motion.div>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 text-[#ef4444] font-semibold text-left">Predicted FAIL</td>
                      <td className="p-2">
                        <motion.div
                          key={metrics.fn}
                          animate={{ opacity: [0.4, 1] }}
                          transition={{ duration: 0.25 }}
                          className="rounded-lg bg-[#ef4444]/20 border border-[#ef4444]/30 py-2 px-3"
                        >
                          <p className="text-[18px] font-black font-mono text-[#ef4444]">{metrics.fn}</p>
                          <p className="text-[9px] text-[#ef4444]/70">False Negative</p>
                        </motion.div>
                      </td>
                      <td className="p-2">
                        <motion.div
                          key={metrics.tn}
                          animate={{ opacity: [0.4, 1] }}
                          transition={{ duration: 0.25 }}
                          className="rounded-lg bg-[#3bb4a4]/20 border border-[#3bb4a4]/30 py-2 px-3"
                        >
                          <p className="text-[18px] font-black font-mono text-[#3bb4a4]">{metrics.tn}</p>
                          <p className="text-[9px] text-[#3bb4a4]/70">True Negative</p>
                        </motion.div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-[#475569] mt-3 leading-relaxed">
                Adjust the threshold slider (Section 3) to see how the matrix changes in real time.
              </p>
            </div>
          </div>
        </motion.section>

        {/* ── Section 5: Odds Ratio ──────────────────────────────────────────── */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <h2 className="text-lg font-bold text-white mb-1">5. Odds Ratio &amp; Interpretation</h2>
          <p className="text-[13px] text-[#94a3b8] mb-5 max-w-[640px]">
            The coefficient β₁ tells us how the log-odds changes per unit increase in study hours.
          </p>

          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
              <div className="rounded-xl border border-[#1e293b] p-4">
                <p className="text-[10px] text-[#475569] uppercase tracking-widest mb-2">Log-Odds Formula</p>
                <p className="text-[12px] font-mono text-white leading-relaxed">
                  log(p / (1−p))<br />
                  = β₀ + β₁ × Hours<br />
                  = {b0.toFixed(2)} + {b1.toFixed(2)} × Hours
                </p>
              </div>

              <div className="rounded-xl border border-[#d4af37]/30 bg-[#d4af3710] p-4">
                <p className="text-[10px] text-[#d4af37] uppercase tracking-widest mb-2">β₁ (Slope)</p>
                <p className="text-3xl font-black font-mono text-[#d4af37]">{b1.toFixed(3)}</p>
                <p className="text-[10px] text-[#94a3b8] mt-1">
                  Per-hour change in log-odds
                </p>
              </div>

              <div className="rounded-xl border border-[#3bb4a4]/30 bg-[#3bb4a410] p-4">
                <p className="text-[10px] text-[#3bb4a4] uppercase tracking-widest mb-2">Odds Ratio = e^β₁</p>
                <p className="text-3xl font-black font-mono text-[#3bb4a4]">{oddsRatioDisplay}</p>
                <p className="text-[10px] text-[#94a3b8] mt-1">
                  Odds multiply by this each hour
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[#1e293b] p-4 mb-4">
              <p className="text-[12px] text-white font-semibold mb-2">Interpretation</p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                For each additional study hour, the <strong className="text-white">odds of passing multiply by {oddsRatioDisplay}</strong>.
                This represents a <strong className="text-[#d4af37]">{oddsRatioIncrease}% increase</strong> in the odds of passing.
              </p>
            </div>

            <div className="rounded-xl border border-[#f97316]/20 bg-[#f9731610] p-4 mb-5">
              <p className="text-[11px] text-[#f97316] font-semibold mb-1">Common Misconception</p>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                An odds ratio of {oddsRatioDisplay} does <em>not</em> mean the probability of passing is {oddsRatioDisplay}×
                higher. Odds and probability are different quantities. The odds ratio applies to the ratio
                p/(1−p), not to p itself.
              </p>
            </div>

            {!oddsRatioInterpreted ? (
              <button
                onClick={() => setOddsRatioInterpreted(true)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity"
              >
                Mark as read
              </button>
            ) : (
              <div className="flex items-center gap-2 text-[12px] text-[#3bb4a4] font-semibold">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Odds ratio section read
              </div>
            )}
          </div>
        </motion.section>

        {/* ── Section 6: Calibration Plot ───────────────────────────────────── */}
        <motion.section
          ref={calibrationRef}
          className="mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <h2 className="text-lg font-bold text-white mb-1">6. Calibration Plot</h2>
          <p className="text-[13px] text-[#94a3b8] mb-5 max-w-[640px]">
            A well-calibrated model: if it says 70% probability, roughly 70% of those cases actually pass.
            Points near the diagonal indicate good calibration.
          </p>

          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
            <div className="max-w-[440px] mx-auto">
              <CalibrationPlot b0={b0} b1={b1} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              {[
                { title: "On the diagonal", desc: "Predicted probability matches actual fraction. Perfect calibration.", color: "#3bb4a4" },
                { title: "Below diagonal", desc: "Model is overconfident — predicted too high relative to actual outcomes.", color: "#ef4444" },
                { title: "Above diagonal", desc: "Model is underconfident — actual rate exceeds the predicted probability.", color: "#60a5fa" },
              ].map(({ title, desc, color }) => (
                <div key={title} className="rounded-xl border border-[#1e293b] p-3">
                  <p className="text-[11px] font-semibold mb-1" style={{ color }}>{title}</p>
                  <p className="text-[10px] text-[#475569] leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-[#475569] mt-3 leading-relaxed">
              Note: with only 60 data points and 5 bins, calibration estimates have high variance.
              Real-world calibration plots use larger datasets and often show confidence bands.
            </p>
          </div>
        </motion.section>

        {/* ── Key Concepts ──────────────────────────────────────────────────── */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <h2 className="text-lg font-bold text-white mb-4">Key Concepts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                title: "Sigmoid Function",
                body: "σ(z) = 1/(1+e^−z). Maps any real number to (0,1). The S-shaped curve that gives logistic regression its name.",
                color: "#3bb4a4",
              },
              {
                title: "Maximum Likelihood",
                body: "Logistic regression is fitted by maximizing the log-likelihood of observed outcomes, not by minimizing squared error.",
                color: "#d4af37",
              },
              {
                title: "Log-Odds (Logit)",
                body: "The model is linear in the log-odds: log(p/(1−p)) = β₀ + β₁x. This is why it's called a generalized linear model.",
                color: "#a855f7",
              },
              {
                title: "Threshold Choice",
                body: "The 0.5 default threshold is not always optimal. Use ROC curves or domain knowledge to pick the right trade-off for your context.",
                color: "#60a5fa",
              },
            ].map(({ title, body, color }) => (
              <div key={title} className="rounded-xl border border-[#1e293b] p-4">
                <p className="text-[11px] font-semibold mb-2" style={{ color }}>{title}</p>
                <p className="text-[11px] text-[#94a3b8] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Footer Nav ────────────────────────────────────────────────────── */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link
            href="/visual-guides/regression-diagnostics"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            ← Regression Diagnostics
          </Link>
          <Link
            href="/visual-guides/count-models-poisson"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            Count Models: Poisson →
          </Link>
        </div>

      </div>
    </div>
  );
}
