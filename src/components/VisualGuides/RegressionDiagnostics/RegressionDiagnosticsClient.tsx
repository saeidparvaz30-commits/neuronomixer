"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  DiagPoint, ModelState, DatasetSpec,
  DATASETS, fitOLS, computeDiagnostics, computeRSquared,
  normalQuantile, VIF_HEALTHY, VIF_COLLINEAR, VIFResult,
} from "./types";

const NEXT_GUIDE_SLUG = "logistic-regression";

// ── SVG helpers ────────────────────────────────────────────────────────────────

const PLOT_W = 340, PLOT_H = 260;
const PAD = { l: 46, r: 20, t: 20, b: 42 };
const IW = PLOT_W - PAD.l - PAD.r;
const IH = PLOT_H - PAD.t - PAD.b;

function toSvgX(v: number, min: number, max: number): number {
  return PAD.l + ((v - min) / (max - min || 1)) * IW;
}
function toSvgY(v: number, min: number, max: number): number {
  return PAD.t + (1 - (v - min) / (max - min || 1)) * IH;
}

function axisTicksFmt(v: number): string {
  return Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2);
}

interface AxisProps {
  xMin: number; xMax: number; yMin: number; yMax: number;
  xLabel: string; yLabel: string;
}
function PlotAxes({ xMin, xMax, yMin, yMax, xLabel, yLabel }: AxisProps) {
  const xTicks = Array.from({ length: 5 }, (_, i) => xMin + (xMax - xMin) * i / 4);
  const yTicks = Array.from({ length: 5 }, (_, i) => yMin + (yMax - yMin) * i / 4);
  return (
    <>
      {xTicks.map((v, i) => (
        <line key={`gx${i}`} x1={toSvgX(v, xMin, xMax)} y1={PAD.t} x2={toSvgX(v, xMin, xMax)} y2={PAD.t + IH} stroke="#1e293b" strokeWidth="1" />
      ))}
      {yTicks.map((v, i) => (
        <line key={`gy${i}`} x1={PAD.l} y1={toSvgY(v, yMin, yMax)} x2={PAD.l + IW} y2={toSvgY(v, yMin, yMax)} stroke="#1e293b" strokeWidth="1" />
      ))}
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke="#334155" strokeWidth="1.5" />
      <line x1={PAD.l} y1={PAD.t + IH} x2={PAD.l + IW} y2={PAD.t + IH} stroke="#334155" strokeWidth="1.5" />
      {xTicks.map((v, i) => (
        <text key={`xl${i}`} x={toSvgX(v, xMin, xMax)} y={PAD.t + IH + 14} textAnchor="middle" fontSize="8" fill="#475569" fontFamily="Inter,sans-serif">{axisTicksFmt(v)}</text>
      ))}
      {yTicks.map((v, i) => (
        <text key={`yl${i}`} x={PAD.l - 5} y={toSvgY(v, yMin, yMax) + 3} textAnchor="end" fontSize="8" fill="#475569" fontFamily="Inter,sans-serif">{axisTicksFmt(v)}</text>
      ))}
      <text x={PAD.l + IW / 2} y={PLOT_H - 4} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="Inter,sans-serif">{xLabel}</text>
      <text x={10} y={PAD.t + IH / 2} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="Inter,sans-serif" transform={`rotate(-90,10,${PAD.t + IH / 2})`}>{yLabel}</text>
    </>
  );
}

// ── Plot 1: Residuals vs Fitted ────────────────────────────────────────────────

interface ResidualsPlotProps {
  points: DiagPoint[];
  modelState: ModelState;
}
function ResidualsVsFitted({ points, modelState }: ResidualsPlotProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const active = points.filter(p => !p.removed);
  if (active.length === 0) return null;

  const fittedVals = active.map(p => p.fitted);
  const resVals    = active.map(p => p.residual);
  const xMin = Math.min(...fittedVals) - 1;
  const xMax = Math.max(...fittedVals) + 1;
  const yAbs = Math.max(...resVals.map(Math.abs)) * 1.2;
  const yMin = -yAbs, yMax = yAbs;

  const interpretations: Record<ModelState, { icon: string; text: string; color: string }> = {
    healthy:          { icon: "✓", text: "Random scatter around zero: linearity assumption met.", color: "#3bb4a4" },
    heteroscedastic:  { icon: "⚠", text: "Fan shape: variance increases with fitted values.", color: "var(--color-warning)" },
    nonlinear:        { icon: "⚠", text: "Curved pattern indicates non-linearity in the true relationship.", color: "#ef4444" },
    outlier:          { icon: "⚠", text: "Extreme residuals pull the fitted line away from the bulk of data.", color: "#ef4444" },
  };
  const interp = interpretations[modelState];

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${PLOT_W} ${PLOT_H}`} className="block">
        <PlotAxes xMin={xMin} xMax={xMax} yMin={yMin} yMax={yMax} xLabel="Fitted Values" yLabel="Residuals" />
        {/* y=0 reference line */}
        <line
          x1={PAD.l} y1={toSvgY(0, yMin, yMax)}
          x2={PAD.l + IW} y2={toSvgY(0, yMin, yMax)}
          stroke="#94a3b8" strokeWidth="1" strokeDasharray="5 3" opacity="0.5"
        />
        {active.map(pt => {
          const cx = toSvgX(pt.fitted, xMin, xMax);
          const cy = toSvgY(pt.residual, yMin, yMax);
          const isHov = hoverId === pt.id;
          const fill = pt.residual > 0 ? "#3bb4a4" : "#ef4444";
          return (
            <g key={pt.id}>
              {pt.isHighLeverage && (
                <circle cx={cx} cy={cy} r={isHov ? 10 : 8} fill="none" stroke="var(--color-accent)" strokeWidth="1.5" />
              )}
              <circle cx={cx} cy={cy} r={isHov ? 6 : 4.5}
                fill={fill} stroke="rgba(255,255,255,0.2)" strokeWidth="0.8"
                style={{ cursor: "default", transition: "r 0.1s" }}
                onMouseEnter={() => setHoverId(pt.id)}
                onMouseLeave={() => setHoverId(null)}
              />
              {isHov && (
                <g style={{ pointerEvents: "none" }}>
                  <rect x={cx - 44} y={cy - 36} width="88" height="22" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                  <text x={cx} y={cy - 22} textAnchor="middle" fontSize="8" fill="#f1f5f9" fontFamily="Inter,sans-serif">
                    Fitted={pt.fitted.toFixed(1)}, Res={pt.residual.toFixed(2)}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex items-start gap-1.5 mt-2 px-1">
        <span className="text-[13px] font-bold" style={{ color: interp.color }}>{interp.icon}</span>
        <p className="text-[11px] text-[#94a3b8] leading-snug">{interp.text}</p>
      </div>
    </div>
  );
}

// ── Plot 2: Normal Q-Q ─────────────────────────────────────────────────────────

interface QQPlotProps {
  points: DiagPoint[];
  modelState: ModelState;
}
function QQPlot({ points, modelState }: QQPlotProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const active = points.filter(p => !p.removed);
  if (active.length === 0) return null;

  const n = active.length;
  const sorted = [...active].sort((a, b) => a.stdResidual - b.stdResidual);
  const qqPts = sorted.map((pt, i) => ({
    id: pt.id,
    theoretical: normalQuantile((i + 1) / (n + 1)),
    observed:    pt.stdResidual,
  }));

  const theoMin = qqPts[0].theoretical, theoMax = qqPts[n - 1].theoretical;
  const obsMin  = Math.min(...qqPts.map(p => p.observed));
  const obsMax  = Math.max(...qqPts.map(p => p.observed));
  const xPad = (theoMax - theoMin) * 0.12;
  const yPad = (obsMax - obsMin) * 0.15;
  const xMin = theoMin - xPad, xMax = theoMax + xPad;
  const yMin = Math.min(obsMin, theoMin) - yPad;
  const yMax = Math.max(obsMax, theoMax) + yPad;

  const interps: Record<ModelState, { icon: string; text: string; color: string }> = {
    healthy:         { icon: "✓", text: "Points near the diagonal: residuals approximately normal.", color: "#3bb4a4" },
    heteroscedastic: { icon: "⚠", text: "S-curve deviation: heavy tails in residual distribution.", color: "var(--color-warning)" },
    nonlinear:       { icon: "⚠", text: "Systematic departure from normality due to model misfit.", color: "#ef4444" },
    outlier:         { icon: "⚠", text: "Points at ends deviate sharply: outliers visible in both tails.", color: "#ef4444" },
  };
  const interp = interps[modelState];

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${PLOT_W} ${PLOT_H}`} className="block">
        <PlotAxes xMin={xMin} xMax={xMax} yMin={yMin} yMax={yMax} xLabel="Theoretical Quantiles" yLabel="Std. Residuals" />
        {/* 45° reference line */}
        <line
          x1={toSvgX(xMin, xMin, xMax)} y1={toSvgY(xMin, yMin, yMax)}
          x2={toSvgX(xMax, xMin, xMax)} y2={toSvgY(xMax, yMin, yMax)}
          stroke="#94a3b8" strokeWidth="1" strokeDasharray="5 3" opacity="0.5"
        />
        {qqPts.map(pt => {
          const cx = toSvgX(pt.theoretical, xMin, xMax);
          const cy = toSvgY(pt.observed, yMin, yMax);
          const isHov = hoverId === pt.id;
          return (
            <g key={pt.id}>
              <circle cx={cx} cy={cy} r={isHov ? 6 : 4}
                fill="#3bb4a4" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8"
                style={{ cursor: "default", transition: "r 0.1s" }}
                onMouseEnter={() => setHoverId(pt.id)}
                onMouseLeave={() => setHoverId(null)}
              />
              {isHov && (
                <g style={{ pointerEvents: "none" }}>
                  <rect x={cx - 44} y={cy - 36} width="88" height="22" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                  <text x={cx} y={cy - 22} textAnchor="middle" fontSize="8" fill="#f1f5f9" fontFamily="Inter,sans-serif">
                    Th={pt.theoretical.toFixed(2)}, Obs={pt.observed.toFixed(2)}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex items-start gap-1.5 mt-2 px-1">
        <span className="text-[13px] font-bold" style={{ color: interp.color }}>{interp.icon}</span>
        <p className="text-[11px] text-[#94a3b8] leading-snug">{interp.text}</p>
      </div>
    </div>
  );
}

// ── Plot 3: Scale-Location ─────────────────────────────────────────────────────

interface ScaleLocationProps {
  points: DiagPoint[];
  modelState: ModelState;
}
function ScaleLocation({ points, modelState }: ScaleLocationProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const active = points.filter(p => !p.removed);
  if (active.length === 0) return null;

  const sqrtAbsStd = active.map(p => Math.sqrt(Math.abs(p.stdResidual)));
  const meanY      = sqrtAbsStd.reduce((a, b) => a + b, 0) / sqrtAbsStd.length;

  const fittedVals = active.map(p => p.fitted);
  const xMin = Math.min(...fittedVals) - 1;
  const xMax = Math.max(...fittedVals) + 1;
  const yMax = Math.max(...sqrtAbsStd) * 1.25;
  const yMin = 0;

  const interps: Record<ModelState, { icon: string; text: string; color: string }> = {
    healthy:         { icon: "✓", text: "Horizontal band: constant variance (homoscedasticity) confirmed.", color: "#3bb4a4" },
    heteroscedastic: { icon: "⚠", text: "Rising trend: variance grows with fitted values (heteroscedasticity).", color: "var(--color-warning)" },
    nonlinear:       { icon: "⚠", text: "Systematic pattern due to model misspecification.", color: "#ef4444" },
    outlier:         { icon: "⚠", text: "Spike at outlier location elevates the spread locally.", color: "#ef4444" },
  };
  const interp = interps[modelState];

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${PLOT_W} ${PLOT_H}`} className="block">
        <PlotAxes xMin={xMin} xMax={xMax} yMin={yMin} yMax={yMax} xLabel="Fitted Values" yLabel="√|Std. Residuals|" />
        {/* Mean reference line */}
        <line
          x1={PAD.l} y1={toSvgY(meanY, yMin, yMax)}
          x2={PAD.l + IW} y2={toSvgY(meanY, yMin, yMax)}
          stroke="#94a3b8" strokeWidth="1" strokeDasharray="5 3" opacity="0.5"
        />
        {active.map((pt, i) => {
          const cx = toSvgX(pt.fitted, xMin, xMax);
          const cy = toSvgY(sqrtAbsStd[i], yMin, yMax);
          const isHov = hoverId === pt.id;
          const fill = pt.residual > 0 ? "#3bb4a4" : "#ef4444";
          return (
            <g key={pt.id}>
              <circle cx={cx} cy={cy} r={isHov ? 6 : 4.5}
                fill={fill} stroke="rgba(255,255,255,0.2)" strokeWidth="0.8"
                style={{ cursor: "default", transition: "r 0.1s" }}
                onMouseEnter={() => setHoverId(pt.id)}
                onMouseLeave={() => setHoverId(null)}
              />
              {isHov && (
                <g style={{ pointerEvents: "none" }}>
                  <rect x={cx - 44} y={cy - 36} width="88" height="22" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                  <text x={cx} y={cy - 22} textAnchor="middle" fontSize="8" fill="#f1f5f9" fontFamily="Inter,sans-serif">
                    Fitted={pt.fitted.toFixed(1)}, √|r|={sqrtAbsStd[i].toFixed(2)}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex items-start gap-1.5 mt-2 px-1">
        <span className="text-[13px] font-bold" style={{ color: interp.color }}>{interp.icon}</span>
        <p className="text-[11px] text-[#94a3b8] leading-snug">{interp.text}</p>
      </div>
    </div>
  );
}

// ── Plot 4: Leverage vs Residuals ─────────────────────────────────────────────

interface LeveragePlotProps {
  points: DiagPoint[];
  modelState: ModelState;
  onTogglePoint: (id: string) => void;
}
function LeveragePlot({ points, modelState, onTogglePoint }: LeveragePlotProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const active = points.filter(p => !p.removed);
  if (active.length === 0) return null;

  const n = points.length;
  const levThreshold = 4 / n;

  const leverageVals  = active.map(p => p.leverage);
  const stdResVals    = active.map(p => p.stdResidual);
  const xMin = 0;
  const xMax = Math.max(...leverageVals) * 1.3;
  const yAbs = Math.max(Math.max(...stdResVals.map(Math.abs)) * 1.2, 2.5);
  const yMin = -yAbs, yMax = yAbs;

  // Cook's distance contour: D=0.5 line  →  std_res = sqrt(D * p * (1-h)² / h)  where p=2, D=0.5
  const cookContourX = Array.from({ length: 50 }, (_, i) => xMin + (xMax - xMin) * (i + 1) / 50);
  const cookLine = (h: number, d: number) => {
    const val = Math.sqrt(d * 2 * ((1 - h) * (1 - h)) / (h === 0 ? 0.0001 : h));
    return isFinite(val) ? val : null;
  };
  const cook05Pos = cookContourX.map(h => cookLine(h, 0.5)).filter((v): v is number => v !== null && v <= yMax);

  void modelState; // used by parent for interpretations

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${PLOT_W} ${PLOT_H}`} className="block">
        <PlotAxes xMin={xMin} xMax={xMax} yMin={yMin} yMax={yMax} xLabel="Leverage (h_ii)" yLabel="Std. Residuals" />
        {/* Horizontal ±2 outlier lines */}
        {[2, -2].map(v => (
          <line key={v}
            x1={PAD.l} y1={toSvgY(v, yMin, yMax)}
            x2={PAD.l + IW} y2={toSvgY(v, yMin, yMax)}
            stroke="#ef4444" strokeWidth="1" strokeDasharray="4 3" opacity="0.5"
          />
        ))}
        <text x={PAD.l + IW - 2} y={toSvgY(2, yMin, yMax) - 3} textAnchor="end" fontSize="8" fill="#ef4444" opacity="0.7" fontFamily="Inter,sans-serif">+2</text>
        <text x={PAD.l + IW - 2} y={toSvgY(-2, yMin, yMax) + 10} textAnchor="end" fontSize="8" fill="#ef4444" opacity="0.7" fontFamily="Inter,sans-serif">-2</text>
        {/* Vertical leverage threshold line */}
        <line
          x1={toSvgX(levThreshold, xMin, xMax)} y1={PAD.t}
          x2={toSvgX(levThreshold, xMin, xMax)} y2={PAD.t + IH}
          stroke="var(--color-accent)" strokeWidth="1" strokeDasharray="5 3" opacity="0.6"
        />
        <text x={toSvgX(levThreshold, xMin, xMax) + 2} y={PAD.t + 10} fontSize="7" fill="var(--color-accent)" opacity="0.7" fontFamily="Inter,sans-serif">Lev threshold</text>
        {/* Cook's D=0.5 contour (positive side) */}
        {cook05Pos.length > 1 && cookContourX.slice(0, cook05Pos.length).map((h, i) => {
          if (i === 0) return null;
          const y1v = cook05Pos[i - 1], y2v = cook05Pos[i];
          return (
            <line key={`cook-p-${i}`}
              x1={toSvgX(cookContourX[i - 1], xMin, xMax)} y1={toSvgY(y1v, yMin, yMax)}
              x2={toSvgX(h, xMin, xMax)} y2={toSvgY(y2v, yMin, yMax)}
              stroke="var(--color-warning)" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.4"
            />
          );
        })}
        {/* Points */}
        {active.map(pt => {
          const cx = toSvgX(pt.leverage, xMin, xMax);
          const cy = toSvgY(pt.stdResidual, yMin, yMax);
          const isHov = hoverId === pt.id;
          const flagged = pt.isOutlier || pt.isHighLeverage;
          const fill = flagged ? "#ef4444" : "#3bb4a4";
          return (
            <g key={pt.id}
              style={{ cursor: flagged ? "pointer" : "default" }}
              onClick={() => flagged && onTogglePoint(pt.id)}
              onMouseEnter={() => setHoverId(pt.id)}
              onMouseLeave={() => setHoverId(null)}
            >
              {flagged && (
                <circle cx={cx} cy={cy} r={isHov ? 11 : 9} fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.5" />
              )}
              <circle cx={cx} cy={cy} r={isHov ? 6 : 4.5}
                fill={fill} stroke="rgba(255,255,255,0.2)" strokeWidth="0.8"
                style={{ transition: "r 0.1s" }}
              />
              {flagged && (
                <text x={cx + 6} y={cy - 5} fontSize="8" fill="#ef4444" fontFamily="Inter,sans-serif">#{pt.id}</text>
              )}
              {isHov && (
                <g style={{ pointerEvents: "none" }}>
                  <rect x={cx - 50} y={cy - 38} width="100" height="22" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                  <text x={cx} y={cy - 24} textAnchor="middle" fontSize="8" fill="#f1f5f9" fontFamily="Inter,sans-serif">
                    h={pt.leverage.toFixed(3)}, D={pt.cooksD.toFixed(3)}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex items-start gap-1.5 mt-2 px-1">
        <span className="text-[8px] font-semibold text-[var(--color-accent)] mt-0.5">TIP</span>
        <p className="text-[11px] text-[#94a3b8] leading-snug">Click highlighted points to remove them and see how the model changes.</p>
      </div>
    </div>
  );
}

// ── VIF Table ──────────────────────────────────────────────────────────────────

function VIFTable({ data }: { data: VIFResult[] }) {
  const statusConfig = {
    good:        { label: "GOOD",        color: "#3bb4a4", bg: "rgba(59,180,164,0.12)" },
    acceptable:  { label: "ACCEPTABLE",  color: "var(--color-accent)", bg: "rgba(212,175,55,0.12)" },
    problematic: { label: "PROBLEMATIC", color: "#ef4444", bg: "rgba(239,68,68,0.12)"  },
  };
  return (
    <table className="w-full text-[12px]">
      <thead>
        <tr className="border-b border-[#1e293b]">
          <th className="text-left py-2 text-[#94a3b8] font-semibold">Variable</th>
          <th className="text-right py-2 text-[#94a3b8] font-semibold">VIF</th>
          <th className="text-right py-2 text-[#94a3b8] font-semibold">Status</th>
        </tr>
      </thead>
      <tbody>
        {data.map(row => {
          const cfg = statusConfig[row.status];
          return (
            <tr key={row.variable} className="border-b border-[#1e293b]/50">
              <td className="py-2.5 text-white">{row.variable}</td>
              <td className="py-2.5 text-right font-mono text-white">{row.vif.toFixed(2)}</td>
              <td className="py-2.5 text-right">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
                  style={{ color: cfg.color, background: cfg.bg }}>
                  {cfg.label}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── Assumption Card ────────────────────────────────────────────────────────────

function AssumptionSummary({ modelState }: { modelState: ModelState }) {
  const assumptions = [
    {
      label: "Linearity",
      desc: "Residuals vs Fitted shows no systematic pattern",
      passed: modelState === "healthy",
    },
    {
      label: "Homoscedasticity",
      desc: "Scale-Location plot shows a horizontal band",
      passed: modelState === "healthy" || modelState === "outlier" || modelState === "nonlinear",
    },
    {
      label: "Normality of Residuals",
      desc: "Q-Q plot points lie near the diagonal",
      passed: modelState === "healthy",
    },
    {
      label: "No Influential Outliers",
      desc: "No points with high Cook's distance in leverage plot",
      passed: modelState === "healthy" || modelState === "heteroscedastic" || modelState === "nonlinear",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {assumptions.map(({ label, desc, passed }) => (
        <div key={label} className={`rounded-xl border p-4 ${passed ? "border-[#3bb4a4]/30 bg-[#3bb4a4]/5" : "border-[#ef4444]/30 bg-[#ef4444]/5"}`}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-base font-bold ${passed ? "text-[#3bb4a4]" : "text-[#ef4444]"}`}>
              {passed ? "✓" : "✗"}
            </span>
            <span className="text-[13px] font-semibold text-white">{label}</span>
          </div>
          <p className="text-[11px] text-[#94a3b8] leading-snug">{desc}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function RegressionDiagnosticsClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();
  const completionFired = useRef(false);

  // ─ State ────────────────────────────────────────────────────────────────────
  const [modelState, setModelState] = useState<ModelState>("healthy");
  const [removedIds,  setRemovedIds]  = useState<Set<string>>(new Set());
  const [vifMode,    setVifMode]    = useState<"healthy" | "collinear">("healthy");

  // Progress tracking
  const [viewedHealthy,      setViewedHealthy]      = useState(false);
  const [viewedProblematic,  setViewedProblematic]  = useState(false);
  const [removedAnyOutlier,  setRemovedAnyOutlier]  = useState(false);
  const [vifChecked,         setVifChecked]         = useState(false);
  const [plotsViewed,        setPlotsViewed]        = useState<Set<number>>(new Set());

  // ─ Dataset / diagnostics ───────────────────────────────────────────────────

  const dataset: DatasetSpec = DATASETS[modelState];

  const fit = useMemo(() => fitOLS(dataset.points), [dataset.points]);

  const diagPoints: DiagPoint[] = useMemo(() => {
    const pts = computeDiagnostics(dataset.points, fit);
    return pts.map(p => ({ ...p, removed: removedIds.has(p.id) }));
  }, [dataset.points, fit, removedIds]);

  // Without-outliers model (for before/after stats)
  const activeRaw = useMemo(
    () => dataset.points.filter((_, i) => !removedIds.has(String(i + 1))),
    [dataset.points, removedIds]
  );
  const fitClean     = useMemo(() => fitOLS(activeRaw), [activeRaw]);
  const r2Original   = useMemo(() => computeRSquared(dataset.points, fit), [dataset.points, fit]);
  const r2Clean      = useMemo(() => computeRSquared(activeRaw, fitClean), [activeRaw, fitClean]);

  const flaggedPoints = diagPoints.filter(p => (p.isOutlier || p.isHighLeverage) && !p.removed);

  // ─ Handlers ────────────────────────────────────────────────────────────────

  const handleModelSwitch = useCallback((state: ModelState) => {
    setModelState(state);
    setRemovedIds(new Set());
    if (state === "healthy") setViewedHealthy(true);
    else setViewedProblematic(true);
  }, []);

  const handleTogglePoint = useCallback((id: string) => {
    setRemovedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else { next.add(id); setRemovedAnyOutlier(true); }
      return next;
    });
  }, []);

  const handlePlotViewed = useCallback((plotIdx: number) => {
    setPlotsViewed(prev => new Set([...prev, plotIdx]));
  }, []);

  const handleVifSwitch = useCallback((mode: "healthy" | "collinear") => {
    setVifMode(mode);
    setVifChecked(true);
  }, []);

  const handleReset = useCallback(() => {
    setModelState("healthy");
    setRemovedIds(new Set());
    setVifMode("healthy");
    setViewedHealthy(true); // mirrors the on-mount effect: healthy is visible again
    setViewedProblematic(false);
    setRemovedAnyOutlier(false);
    setVifChecked(false);
    setPlotsViewed(new Set());
  }, []);

  // Mark healthy on mount
  useEffect(() => { setViewedHealthy(true); }, []);

  // ─ Completion ──────────────────────────────────────────────────────────────

  const allComplete = viewedHealthy && viewedProblematic && removedAnyOutlier && vifChecked && plotsViewed.size >= 4;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "regression-diagnostics", score: 100 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  const progress = [
    { label: "Viewed healthy model",       done: viewedHealthy },
    { label: "Viewed problematic model",   done: viewedProblematic },
    { label: "Removed at least one outlier", done: removedAnyOutlier },
    { label: "Checked VIF table",          done: vifChecked },
    { label: `All 4 plots examined (${plotsViewed.size}/4)`, done: plotsViewed.size >= 4 },
  ];

  const modelButtons: { state: ModelState; label: string }[] = [
    { state: "healthy",         label: "Healthy Model"    },
    { state: "heteroscedastic", label: "Heteroscedastic"  },
    { state: "nonlinear",       label: "Nonlinear"        },
    { state: "outlier",         label: "Outliers Present" },
  ];

  const plotTitles = [
    "Plot 1: Residuals vs Fitted",
    "Plot 2: Normal Q-Q",
    "Plot 3: Scale-Location",
    "Plot 4: Leverage vs Residuals",
  ];

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Regression Diagnostics</span>
        </nav>

        {/* Hero */}
        <motion.section className="mb-10"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">UNIT 10: REGRESSION FOUNDATIONS</span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Regression Diagnostics:{" "}
            <span className="text-[var(--color-accent)]">When the Model Breaks</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[640px]">
            Every regression model rests on assumptions. Learn to detect violations (non-linearity, heteroscedasticity,
            non-normal residuals, and influential outliers) using the four core diagnostic plots.
          </p>
        </motion.section>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {progress.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full transition-colors ${done ? "bg-[#3bb4a4]" : "bg-[#1e293b]"}`} />
              <span className={`text-[11px] ${done ? "text-white" : "text-[#475569]"}`}>{label}</span>
            </div>
          ))}
          {!session?.user && (
            <p className="text-[11px] text-[#475569] ml-auto">
              <Link href="/auth/sign-in" className="underline underline-offset-2 hover:text-[#94a3b8]">Sign in</Link>
              {" "}to track progress
            </p>
          )}
          <AnimatePresence>
            {allComplete && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="ml-auto text-[11px] font-semibold text-[#3bb4a4] flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Model Toggle */}
        <section className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">Select Dataset</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Select dataset">
            {modelButtons.map(({ state, label }) => (
              <button key={state}
                role="radio"
                aria-checked={modelState === state}
                onClick={() => handleModelSwitch(state)}
                className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                  modelState === state
                    ? "bg-[var(--color-accent)] text-[#0a0e1a]"
                    : "border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37]"
                }`}>
                {label}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.p key={modelState}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-3 text-[13px] text-[#94a3b8] max-w-[640px]">
              {dataset.problemDescription}
            </motion.p>
          </AnimatePresence>
        </section>

        {/* 4 Diagnostic Plots */}
        <section className="mb-10">
          <h2 className="text-[20px] font-bold text-white mb-5">Diagnostic Plots</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Plot 1 */}
            <motion.div
              className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}
              onViewportEnter={() => handlePlotViewed(0)}>
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">{plotTitles[0]}</p>
              <ResidualsVsFitted points={diagPoints} modelState={modelState} />
            </motion.div>

            {/* Plot 2 */}
            <motion.div
              className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
              onViewportEnter={() => handlePlotViewed(1)}>
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">{plotTitles[1]}</p>
              <QQPlot points={diagPoints} modelState={modelState} />
            </motion.div>

            {/* Plot 3 */}
            <motion.div
              className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}
              onViewportEnter={() => handlePlotViewed(2)}>
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">{plotTitles[2]}</p>
              <ScaleLocation points={diagPoints} modelState={modelState} />
            </motion.div>

            {/* Plot 4 */}
            <motion.div
              className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
              onViewportEnter={() => handlePlotViewed(3)}>
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">{plotTitles[3]}</p>
              <LeveragePlot points={diagPoints} modelState={modelState} onTogglePoint={handleTogglePoint} />
            </motion.div>
          </div>
        </section>

        {/* Point Removal Section */}
        <AnimatePresence>
          {(flaggedPoints.length > 0 || removedIds.size > 0) && (
            <motion.section className="mb-10"
              key="removal-section"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}>
              <h2 className="text-[20px] font-bold text-white mb-2">Outlier & Leverage Point Removal</h2>
              <p className="text-[13px] text-[#94a3b8] mb-5">
                Toggle flagged points to see how they affect the fitted model. Points with |standardized residual| &gt; 2 or leverage &gt; 4/n are flagged.
              </p>

              <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 mb-5">
                <div className="space-y-2 mb-4">
                  {diagPoints.filter(p => p.isOutlier || p.isHighLeverage).map(pt => {
                    const isRemoved = removedIds.has(pt.id);
                    return (
                      <div key={pt.id}
                        className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
                          isRemoved ? "border-[#ef4444]/40 bg-[#ef4444]/5" : "border-[#1e293b]"
                        }`}>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" id={`pt-${pt.id}`}
                            checked={isRemoved}
                            onChange={() => handleTogglePoint(pt.id)}
                            className="w-4 h-4 accent-[var(--color-accent)] cursor-pointer"
                          />
                          <label htmlFor={`pt-${pt.id}`} className="cursor-pointer">
                            <span className="text-[13px] font-semibold text-white">Point #{pt.id}</span>
                            <span className="text-[11px] text-[#94a3b8] ml-2">x={pt.x}, y={pt.y.toFixed(1)}</span>
                          </label>
                        </div>
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="text-[#94a3b8]">Leverage: <span className="font-mono text-white">{pt.leverage.toFixed(3)}</span></span>
                          <span className="text-[#94a3b8]">Cook&apos;s D: <span className={`font-mono ${pt.cooksD > 1 ? "text-[#ef4444]" : "text-white"}`}>{pt.cooksD.toFixed(3)}</span></span>
                          <span className="text-[#94a3b8]">Std. Res: <span className={`font-mono ${Math.abs(pt.stdResidual) > 2 ? "text-[#ef4444]" : "text-white"}`}>{pt.stdResidual.toFixed(2)}</span></span>
                          {pt.isOutlier     && <span className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-[#ef4444]/15 text-[#ef4444]">OUTLIER</span>}
                          {pt.isHighLeverage && <span className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-[#d4af37]/15 text-[var(--color-accent)]">HIGH LEV</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const allFlagged = diagPoints.filter(p => p.isOutlier || p.isHighLeverage).map(p => p.id);
                      setRemovedIds(new Set(allFlagged));
                      setRemovedAnyOutlier(true);
                    }}
                    className="px-4 py-2 rounded-xl text-[12px] font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
                    Remove All Flagged
                  </button>
                  <button
                    onClick={() => setRemovedIds(new Set())}
                    className="px-4 py-2 rounded-xl text-[12px] font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors">
                    Reset All
                  </button>
                </div>
              </div>

              {/* Before/after comparison */}
              {removedIds.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                  className="rounded-2xl border border-[#1e293b] bg-[#0f172a] overflow-hidden">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b border-[#1e293b]">
                        <th className="text-left px-5 py-3 text-[#94a3b8] font-semibold">Metric</th>
                        <th className="text-right px-5 py-3 text-[#94a3b8] font-semibold">Original ({dataset.points.length} pts)</th>
                        <th className="text-right px-5 py-3 text-[#3bb4a4] font-semibold">Without Outliers ({activeRaw.length} pts)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: "R²",    orig: r2Original.toFixed(3),         clean: r2Clean.toFixed(3),         better: r2Clean > r2Original },
                        { label: "RMSE",  orig: fit.rmse.toFixed(3),           clean: fitClean.rmse.toFixed(3),   better: fitClean.rmse < fit.rmse },
                        { label: "Slope", orig: fit.slope.toFixed(3),          clean: fitClean.slope.toFixed(3),  better: false },
                        { label: "Intercept", orig: fit.intercept.toFixed(3),  clean: fitClean.intercept.toFixed(3), better: false },
                      ].map(({ label, orig, clean, better }) => (
                        <tr key={label} className="border-b border-[#1e293b]/50">
                          <td className="px-5 py-3 text-white font-semibold">{label}</td>
                          <td className="px-5 py-3 text-right font-mono text-[#94a3b8]">{orig}</td>
                          <td className={`px-5 py-3 text-right font-mono font-semibold ${better ? "text-[#3bb4a4]" : "text-white"}`}>
                            {clean}
                            {better && <span className="ml-1.5 text-[10px] text-[#3bb4a4]">improved</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </motion.div>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* Multicollinearity / VIF Section */}
        <section className="mb-10" onClick={() => setVifChecked(true)}>
          <h2 className="text-[20px] font-bold text-white mb-2">Multicollinearity Check (VIF)</h2>
          <p className="text-[13px] text-[#94a3b8] mb-5 max-w-[640px]">
            The <strong className="text-white">Variance Inflation Factor (VIF)</strong> measures how much a predictor&apos;s variance is inflated due to correlation with other predictors.
            VIF &gt; 10 suggests a predictor is nearly a linear combination of others.
          </p>

          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
            <div className="flex gap-2 mb-5" role="radiogroup" aria-label="Multicollinearity scenario">
              {(["healthy", "collinear"] as const).map(mode => (
                <button key={mode}
                  role="radio"
                  aria-checked={vifMode === mode}
                  onClick={() => handleVifSwitch(mode)}
                  className={`px-4 py-2 rounded-xl text-[12px] font-semibold transition-all ${
                    vifMode === mode
                      ? "bg-[var(--color-accent)] text-[#0a0e1a]"
                      : "border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37]"
                  }`}>
                  {mode === "healthy" ? "No Multicollinearity" : "High Multicollinearity"}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={vifMode}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}>
                <VIFTable data={vifMode === "healthy" ? VIF_HEALTHY : VIF_COLLINEAR} />
              </motion.div>
            </AnimatePresence>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { range: "VIF < 5",   label: "Good",        color: "#3bb4a4", desc: "No meaningful correlation with other predictors." },
                { range: "5 – 10",    label: "Acceptable",  color: "var(--color-accent)", desc: "Moderate correlation; monitor but usually acceptable." },
                { range: "VIF > 10",  label: "Problematic", color: "#ef4444", desc: "High collinearity: standard errors are inflated." },
              ].map(({ range, label, color, desc }) => (
                <div key={label} className="rounded-xl border border-[#1e293b] p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold" style={{ color }}>{range}</span>
                    <span className="text-[10px] font-semibold text-white">{label}</span>
                  </div>
                  <p className="text-[10px] text-[#94a3b8] leading-snug">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Assumption Summary */}
        <section className="mb-10">
          <h2 className="text-[20px] font-bold text-white mb-2">Assumption Check Summary</h2>
          <p className="text-[13px] text-[#94a3b8] mb-5">Status for the currently selected dataset.</p>
          <AssumptionSummary modelState={modelState} />
        </section>

        {/* Quick Reference */}
        <section className="mb-10">
          <h2 className="text-[20px] font-bold text-white mb-4">Diagnostic Quick Reference</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                plot: "Residuals vs Fitted",
                lookFor: "Random cloud around y=0",
                badSign: "Curved or funnel-shaped pattern",
                color: "#3bb4a4",
              },
              {
                plot: "Normal Q-Q",
                lookFor: "Points along the diagonal",
                badSign: "S-curve or systematic departure",
                color: "#3bb4a4",
              },
              {
                plot: "Scale-Location",
                lookFor: "Horizontal flat band",
                badSign: "Rising or falling trend",
                color: "#3bb4a4",
              },
              {
                plot: "Leverage / Cook's D",
                lookFor: "No points outside ±2 or high leverage",
                badSign: "Points with Cook's D > 1 or h >> 4/n",
                color: "#3bb4a4",
              },
            ].map(({ plot, lookFor, badSign, color }) => (
              <div key={plot} className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
                <p className="text-[11px] font-bold mb-3" style={{ color }}>{plot}</p>
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] font-semibold text-[#3bb4a4]">✓ Look for</span>
                    <p className="text-[10px] text-[#94a3b8] mt-0.5">{lookFor}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-[#ef4444]">✗ Bad sign</span>
                    <p className="text-[10px] text-[#94a3b8] mt-0.5">{badSign}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Completion card */}
        <AnimatePresence>
          {allComplete && (
            <motion.div
              variants={card}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="mt-8 rounded-2xl border border-white/[0.08] bg-[#0f172a] overflow-hidden"
            >
              <div className="px-6 pt-6 pb-4 border-b border-white/[0.07]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-px bg-[var(--color-accent)]" />
                  <span className="text-[10px] font-semibold uppercase tracking-[2px] text-[var(--color-accent)]">
                    Guide Complete
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">
                  You Can Spot a Broken Model
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You compared healthy and violated fits, read all four
                  diagnostic plots, removed influential points, and checked VIF
                  for hidden collinearity.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Diagnostic plots examined
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {plotsViewed.size} of 4
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      residuals, Q-Q, scale, leverage
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Current dataset R²
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {r2Original.toFixed(3)}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      {removedIds.size > 0
                        ? `${r2Clean.toFixed(3)} with ${removedIds.size} removed`
                        : `RMSE ${fit.rmse.toFixed(3)}`}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Model scenarios explored
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {(viewedHealthy ? 1 : 0) + (viewedProblematic ? 1 : 0)} of 2
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      healthy and assumption-violating
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;A regression will happily fit data that violates every
                    assumption behind it; the four diagnostic plots are how you
                    catch the lie before you trust the coefficients.&quot;
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-3">
                <Link
                  href="/visual-guides"
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
                >
                  ← All Guides
                </Link>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
                  >
                    Try Again
                  </button>
                  <Link
                    href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
                    className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
                  >
                    Next Guide →
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer nav (pre-completion) */}
        {!allComplete && (
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
            <Link href="/visual-guides/multiple-regression-confounding"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors">
              ← Multiple Regression
            </Link>
            <Link href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
              Logistic Regression →
            </Link>
          </div>
        )}

        <GuideCompletion isComplete={allComplete} guideSlug="regression-diagnostics" score={100} />
      </div>
    </div>
  );
}
