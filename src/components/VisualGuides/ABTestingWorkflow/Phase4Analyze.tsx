"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Phase4Props, twoProportionZTest, normalCDF } from "./types";

// SVG chart dimensions
const W = 480;
const H = 200;
const PAD = { l: 20, r: 20, t: 20, b: 32 };

function normalPDF(x: number, mu: number, sigma: number) {
  return (
    Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI))
  );
}

interface Props extends Phase4Props {
  onBack: () => void;
}

export default function Phase4Analyze({
  controlConversions,
  treatmentConversions,
  controlN,
  treatmentN,
  alpha,
  baselineRate,
  mde,
  direction,
  onBack,
}: Props) {
  const { z, pValue, ciLow, ciHigh, cohenH } = useMemo(
    () => twoProportionZTest(controlConversions, controlN, treatmentConversions, treatmentN),
    [controlConversions, controlN, treatmentConversions, treatmentN]
  );

  const isSignificant = pValue < alpha;
  const p1 = controlConversions / controlN;
  const p2 = treatmentConversions / treatmentN;
  const diff = p2 - p1;

  // Practical significance: observed lift >= 50% of MDE
  const isPracticallySignificant = Math.abs(diff) >= mde * 0.5;

  // Z-distribution visualization
  const zMin = -4;
  const zMax = 4;
  const steps = 200;
  const mu = 0;
  const sigma = 1;

  // Critical value
  const zCrit = direction === "two-tailed" ? 1.96 : 1.645;

  // Build distribution points
  const pts = Array.from({ length: steps + 1 }, (_, i) => {
    const x = zMin + ((zMax - zMin) * i) / steps;
    const y = normalPDF(x, mu, sigma);
    return { x, y };
  });
  const maxPDF = normalPDF(0, 0, 1);

  function toSvgX(x: number) {
    return PAD.l + ((x - zMin) / (zMax - zMin)) * (W - PAD.l - PAD.r);
  }
  function toSvgY(y: number) {
    return PAD.t + (1 - y / (maxPDF * 1.15)) * (H - PAD.t - PAD.b);
  }

  const curvePath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${toSvgX(p.x).toFixed(1)},${toSvgY(p.y).toFixed(1)}`)
    .join(" ");

  // Rejection region fill (right tail or both tails)
  function buildTailPath(from: number, to: number) {
    const tailPts = pts.filter((p) => p.x >= from && p.x <= to);
    if (tailPts.length < 2) return "";
    const linePts = tailPts
      .map((p, i) => `${i === 0 ? "M" : "L"}${toSvgX(p.x).toFixed(1)},${toSvgY(p.y).toFixed(1)}`)
      .join(" ");
    const lastX = toSvgX(tailPts[tailPts.length - 1].x);
    const firstX = toSvgX(tailPts[0].x);
    const baseY = toSvgY(0);
    return `${linePts} L${lastX},${baseY} L${firstX},${baseY} Z`;
  }

  const rightTailPath = buildTailPath(zCrit, zMax);
  const leftTailPath = direction === "two-tailed" ? buildTailPath(zMin, -zCrit) : "";

  // Z-stat position (clamped for display)
  const zDisplay = Math.max(zMin + 0.2, Math.min(zMax - 0.2, z));
  const zSvgX = toSvgX(zDisplay);

  // Effect size label
  const absH = Math.abs(cohenH);
  const hLabel =
    absH < 0.2 ? "Small" : absH < 0.5 ? "Medium" : absH < 0.8 ? "Large" : "Very Large";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Decision banner */}
      <div
        className={`rounded-2xl border p-6 ${
          isSignificant
            ? "border-[#3bb4a4]/60 bg-[#3bb4a4]/5"
            : "border-[#ef4444]/60 bg-[#ef4444]/5"
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
              isSignificant ? "bg-[#3bb4a4]/20" : "bg-[#ef4444]/20"
            }`}
          >
            {isSignificant ? "✓" : "✗"}
          </div>
          <div>
            <p
              className={`text-lg font-bold mb-1 ${
                isSignificant ? "text-[#3bb4a4]" : "text-[#ef4444]"
              }`}
            >
              {isSignificant
                ? "Reject H₀ — Statistically Significant"
                : "Fail to Reject H₀ — Not Statistically Significant"}
            </p>
            <p className="text-[13px] text-[#94a3b8]">
              {isSignificant
                ? `p = ${pValue < 0.001 ? "< 0.001" : pValue.toFixed(4)} is below α = ${alpha.toFixed(2)}. The observed difference is unlikely due to chance.`
                : `p = ${pValue < 0.001 ? "< 0.001" : pValue.toFixed(4)} is above α = ${alpha.toFixed(2)}. Insufficient evidence to conclude a real effect exists.`}
            </p>
          </div>
        </div>
      </div>

      {/* Z-distribution chart */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
        <h3 className="text-sm font-semibold text-white mb-4">
          Z-Distribution &amp; Critical Regions
        </h3>
        <div className="overflow-x-auto">
          <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full max-w-[480px]"
          >
            {/* Rejection region fills */}
            {rightTailPath && (
              <path d={rightTailPath} fill={isSignificant && z > 0 ? "#3bb4a4" : "#ef4444"} fillOpacity={0.25} />
            )}
            {leftTailPath && (
              <path d={leftTailPath} fill={isSignificant && z < 0 ? "#3bb4a4" : "#ef4444"} fillOpacity={0.25} />
            )}

            {/* Curve */}
            <path
              d={curvePath}
              fill="none"
              stroke="#1e5d8a"
              strokeWidth={2}
              strokeLinejoin="round"
            />

            {/* Critical value lines */}
            <line
              x1={toSvgX(zCrit)}
              y1={PAD.t}
              x2={toSvgX(zCrit)}
              y2={H - PAD.b}
              stroke="#ef4444"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            {direction === "two-tailed" && (
              <line
                x1={toSvgX(-zCrit)}
                y1={PAD.t}
                x2={toSvgX(-zCrit)}
                y2={H - PAD.b}
                stroke="#ef4444"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
            )}

            {/* Z statistic line */}
            <line
              x1={zSvgX}
              y1={PAD.t}
              x2={zSvgX}
              y2={H - PAD.b}
              stroke={isSignificant ? "#3bb4a4" : "#d4af37"}
              strokeWidth={2}
            />

            {/* Labels on chart */}
            <text
              x={toSvgX(zCrit) + 4}
              y={PAD.t + 12}
              fontSize={9}
              fill="#ef4444"
            >
              z={zCrit.toFixed(2)}
            </text>
            {direction === "two-tailed" && (
              <text
                x={toSvgX(-zCrit) - 4}
                y={PAD.t + 12}
                fontSize={9}
                fill="#ef4444"
                textAnchor="end"
              >
                z={(-zCrit).toFixed(2)}
              </text>
            )}
            <text
              x={zSvgX + 4}
              y={PAD.t + 24}
              fontSize={9}
              fill={isSignificant ? "#3bb4a4" : "#d4af37"}
            >
              z={z.toFixed(2)}
            </text>

            {/* X axis */}
            <line
              x1={PAD.l}
              y1={H - PAD.b}
              x2={W - PAD.r}
              y2={H - PAD.b}
              stroke="#1e293b"
              strokeWidth={1}
            />

            {/* X axis ticks */}
            {[-3, -2, -1, 0, 1, 2, 3].map((v) => (
              <text
                key={v}
                x={toSvgX(v)}
                y={H - PAD.b + 14}
                textAnchor="middle"
                fontSize={9}
                fill="#475569"
              >
                {v}
              </text>
            ))}

            {/* X axis label */}
            <text x={W / 2} y={H - 2} textAnchor="middle" fontSize={9} fill="#475569">
              z-statistic
            </text>
          </svg>
        </div>
        <div className="flex items-center gap-4 mt-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-0.5 bg-[#ef4444] rounded-full" style={{ borderTop: "1.5px dashed #ef4444", background: "none" }} />
            <span className="text-[11px] text-[#94a3b8]">Critical value (α = {alpha.toFixed(2)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-0.5 rounded-full" style={{ background: isSignificant ? "#3bb4a4" : "#d4af37" }} />
            <span className="text-[11px] text-[#94a3b8]">Observed z = {z.toFixed(3)}</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Control Rate", value: `${(p1 * 100).toFixed(2)}%`, color: "#1e5d8a" },
          { label: "Treatment Rate", value: `${(p2 * 100).toFixed(2)}%`, color: "#3bb4a4" },
          { label: "Absolute Lift", value: `${diff >= 0 ? "+" : ""}${(diff * 100).toFixed(2)}%`, color: diff >= 0 ? "#3bb4a4" : "#ef4444" },
          { label: "Relative Lift", value: p1 > 0 ? `${((diff / p1) * 100).toFixed(1)}%` : "—", color: "#d4af37" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl bg-[#1e293b] p-4 text-center">
            <p className="text-[10px] text-[#94a3b8] mb-1">{label}</p>
            <p className="text-lg font-bold tabular-nums" style={{ color }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Test statistics */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Test Statistics</h3>
        <div className="space-y-3">
          {[
            {
              label: "Z-statistic",
              value: z.toFixed(4),
              formula: "z = (p₂ − p₁) / √(p̂(1−p̂)(1/n₁ + 1/n₂))",
            },
            {
              label: "p-value (two-tailed)",
              value: pValue < 0.0001 ? "< 0.0001" : pValue.toFixed(4),
              formula: "p = 2 × Φ(−|z|)",
            },
            {
              label: "95% CI for Difference",
              value: `[${(ciLow * 100).toFixed(2)}%, ${(ciHigh * 100).toFixed(2)}%]`,
              formula: "(p₂−p₁) ± 1.96 × SE_diff",
            },
            {
              label: "Cohen's h (Effect Size)",
              value: `${cohenH.toFixed(4)} (${hLabel})`,
              formula: "h = 2·arcsin(√p₂) − 2·arcsin(√p₁)",
            },
          ].map(({ label, value, formula }) => (
            <div key={label} className="rounded-xl bg-[#1e293b] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] text-[#94a3b8] mb-0.5">{label}</p>
                  <p className="font-mono text-[11px] text-[#475569]">{formula}</p>
                </div>
                <p className="text-sm font-bold text-white tabular-nums flex-shrink-0">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confidence interval bar */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
        <h3 className="text-sm font-semibold text-white mb-4">95% Confidence Interval</h3>
        <div className="relative">
          {(() => {
            const range = 0.1;
            const center = 0;
            const pxMin = -range;
            const pxMax = range;
            const toBarX = (v: number) =>
              ((v - pxMin) / (pxMax - pxMin)) * 100;

            const ciLowPct = Math.max(0, Math.min(100, toBarX(ciLow)));
            const ciHighPct = Math.max(0, Math.min(100, toBarX(ciHigh)));
            const diffPct = Math.max(0, Math.min(100, toBarX(diff)));
            const zeroPct = toBarX(0);

            return (
              <div>
                <div className="relative h-8 rounded-lg bg-[#1e293b] overflow-hidden">
                  {/* CI band */}
                  <div
                    className={`absolute top-0 h-full ${isSignificant ? "bg-[#3bb4a4]" : "bg-[#1e5d8a]"} opacity-30`}
                    style={{
                      left: `${Math.min(ciLowPct, ciHighPct)}%`,
                      width: `${Math.abs(ciHighPct - ciLowPct)}%`,
                    }}
                  />
                  {/* Zero line */}
                  <div
                    className="absolute top-0 h-full w-0.5 bg-white/30"
                    style={{ left: `${zeroPct}%` }}
                  />
                  {/* Point estimate */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#d4af37]"
                    style={{ left: `calc(${diffPct}% - 6px)` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-[#475569]">
                  <span>{(pxMin * 100).toFixed(0)}%</span>
                  <span className="text-white/50">0% (no difference)</span>
                  <span>{(pxMax * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-center gap-4 mt-2 text-[11px] text-[#94a3b8]">
                  <span>
                    Lower: <span className="text-white font-semibold">{(ciLow * 100).toFixed(2)}%</span>
                  </span>
                  <span>
                    Estimate: <span className="text-[#d4af37] font-semibold">{(diff * 100).toFixed(2)}%</span>
                  </span>
                  <span>
                    Upper: <span className="text-white font-semibold">{(ciHigh * 100).toFixed(2)}%</span>
                  </span>
                </div>
                {isSignificant && ciLow > 0 && (
                  <p className="text-[11px] text-[#3bb4a4] text-center mt-2">
                    CI excludes zero — confirms significant positive lift
                  </p>
                )}
                {!isSignificant && ciLow <= 0 && ciHigh >= 0 && (
                  <p className="text-[11px] text-[#94a3b8] text-center mt-2">
                    CI includes zero — consistent with no effect
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Practical vs statistical significance */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
        <h3 className="text-sm font-semibold text-white mb-4">
          Practical vs. Statistical Significance
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div
            className={`rounded-xl p-4 border ${
              isSignificant
                ? "border-[#3bb4a4]/40 bg-[#3bb4a4]/5"
                : "border-[#ef4444]/40 bg-[#ef4444]/5"
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-2">
              Statistical Significance
            </p>
            <p className={`text-sm font-bold ${isSignificant ? "text-[#3bb4a4]" : "text-[#ef4444]"}`}>
              {isSignificant ? "Significant" : "Not Significant"}
            </p>
            <p className="text-[11px] text-[#94a3b8] mt-1">
              p = {pValue < 0.001 ? "< 0.001" : pValue.toFixed(3)} (α = {alpha.toFixed(2)})
            </p>
          </div>
          <div
            className={`rounded-xl p-4 border ${
              isPracticallySignificant
                ? "border-[#d4af37]/40 bg-[#d4af37]/5"
                : "border-[#475569]/40 bg-[#475569]/5"
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-2">
              Practical Significance
            </p>
            <p
              className={`text-sm font-bold ${
                isPracticallySignificant ? "text-[#d4af37]" : "text-[#94a3b8]"
              }`}
            >
              {isPracticallySignificant ? "Meaningful" : "Marginal"}
            </p>
            <p className="text-[11px] text-[#94a3b8] mt-1">
              Lift {(Math.abs(diff) * 100).toFixed(2)}% vs MDE {(mde * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-[#1e293b] p-4">
          <p className="text-[12px] text-[#94a3b8] leading-relaxed">
            <span className="text-white font-semibold">Interpretation: </span>
            {isSignificant && isPracticallySignificant
              ? "The result is both statistically and practically significant. The observed lift exceeds the MDE you planned for — a strong case to ship the treatment."
              : isSignificant && !isPracticallySignificant
              ? "The result is statistically significant, but the effect size may be smaller than business-relevant. Consider whether the observed lift justifies implementation costs."
              : !isSignificant && isPracticallySignificant
              ? "The effect size looks promising but was not detected with statistical confidence, possibly due to low power. Consider running longer or with a larger sample."
              : "No statistically significant difference was found, and the observed effect is below the MDE. Maintain the control variant."}
          </p>
        </div>
      </div>

      {/* Sample size check */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-[11px] text-[#94a3b8]">Sample collected per group</p>
            <p className="text-lg font-bold text-white">
              {Math.floor((controlN + treatmentN) / 2).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#94a3b8]">Conversions (control/treatment)</p>
            <p className="text-lg font-bold text-white">
              {controlConversions.toLocaleString()} / {treatmentConversions.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#94a3b8]">Cohen's h</p>
            <p className="text-lg font-bold text-[#d4af37]">
              {cohenH.toFixed(3)} ({hLabel})
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl font-semibold text-sm border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
        >
          ← Back to Collection
        </button>
      </div>
    </motion.div>
  );
}
