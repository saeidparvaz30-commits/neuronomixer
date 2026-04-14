"use client";

import React from "react";
import { motion } from "framer-motion";
import { computeZ, normalPDF } from "./types";

// ── SVG dimensions ────────────────────────────────────────────────────────────
const VW = 480;
const VH = 120;
const PAD = { l: 16, r: 16, t: 16, b: 32 };
const IW = VW - PAD.l - PAD.r;
const IH = VH - PAD.t - PAD.b;
const CURVE_POINTS = 200;

interface ScoreInputProps {
  label: string;
  color: string;
  value: number;
  mean: number;
  stdDev: number;
  onValueChange: (v: number) => void;
  onMeanChange: (v: number) => void;
  onStdDevChange: (v: number) => void;
  onUsed: () => void;
}

function ScoreInput({ label, color, value, mean, stdDev, onValueChange, onMeanChange, onStdDevChange, onUsed }: ScoreInputProps) {
  const z = computeZ(value, mean, stdDev);
  const inputClass =
    "w-full bg-[#0f172a] border border-[#1e293b] rounded-lg px-2.5 py-1.5 text-[12px] text-white focus:outline-none focus:border-[#1e5d8a] transition-colors";
  const labelClass = "text-[9px] font-semibold uppercase tracking-[1px] text-[#475569] mb-1 block";

  function handleChange(setter: (v: number) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        setter(val);
        onUsed();
      }
    };
  }

  return (
    <div className="flex-1 min-w-[140px] rounded-xl border p-3" style={{ borderColor: color + "40" }}>
      <p className="text-[11px] font-bold mb-3" style={{ color }}>{label}</p>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <label className={labelClass}>Score</label>
          <input type="number" value={value} onChange={handleChange(onValueChange)} className={inputClass} step="1" />
        </div>
        <div>
          <label className={labelClass}>Mean</label>
          <input type="number" value={mean} onChange={handleChange(onMeanChange)} className={inputClass} step="1" />
        </div>
        <div>
          <label className={labelClass}>SD</label>
          <input type="number" value={stdDev} onChange={handleChange(onStdDevChange)} className={inputClass} step="0.5" min="0.1" />
        </div>
      </div>
      <div className="text-[11px] text-[#94a3b8]">
        z ={" "}
        <span className="font-bold" style={{ color }}>
          {stdDev === 0 ? "∞" : z.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

interface Props {
  testA_value: number;
  testA_mean: number;
  testA_stdDev: number;
  testB_value: number;
  testB_mean: number;
  testB_stdDev: number;
  onTestAValue: (v: number) => void;
  onTestAMean: (v: number) => void;
  onTestAStdDev: (v: number) => void;
  onTestBValue: (v: number) => void;
  onTestBMean: (v: number) => void;
  onTestBStdDev: (v: number) => void;
  onUsed: () => void;
  onReset: () => void;
}

export default function ComparisonTool({
  testA_value, testA_mean, testA_stdDev,
  testB_value, testB_mean, testB_stdDev,
  onTestAValue, onTestAMean, onTestAStdDev,
  onTestBValue, onTestBMean, onTestBStdDev,
  onUsed, onReset,
}: Props) {
  const zA = computeZ(testA_value, testA_mean, testA_stdDev);
  const zB = computeZ(testB_value, testB_mean, testB_stdDev);

  const winner = zA === zB ? "tie" : zA > zB ? "A" : "B";

  // ── Shared standard-normal SVG curve ─────────────────────────────────────────
  const zMin = -4;
  const zMax = 4;
  const zRange = zMax - zMin;

  const curvePoints: { x: number; y: number }[] = [];
  const maxPDF = normalPDF(0, 0, 1);

  for (let i = 0; i <= CURVE_POINTS; i++) {
    const z = zMin + (i / CURVE_POINTS) * zRange;
    const pdf = normalPDF(z, 0, 1);
    const svgX = PAD.l + ((z - zMin) / zRange) * IW;
    const svgY = PAD.t + IH - (pdf / maxPDF) * IH;
    curvePoints.push({ x: svgX, y: svgY });
  }

  const curvePath = curvePoints
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" ");
  const baselineY = PAD.t + IH;
  const curveClosedPath = `${curvePath} L${curvePoints[curvePoints.length - 1].x.toFixed(2)},${baselineY} L${curvePoints[0].x.toFixed(2)},${baselineY} Z`;

  function zToSvgX(z: number): number {
    return PAD.l + ((Math.max(zMin, Math.min(zMax, z)) - zMin) / zRange) * IW;
  }

  const zA_x = zToSvgX(zA);
  const zB_x = zToSvgX(zB);

  // x-axis ticks
  const xTicks = [-3, -2, -1, 0, 1, 2, 3];

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[13px] font-bold text-white">Score Comparison Tool</h3>
        <button
          onClick={onReset}
          className="text-[10px] text-[#475569] hover:text-[#94a3b8] transition-colors px-2 py-1 rounded-lg border border-[#1e293b] hover:border-[#334155]"
        >
          Reset defaults
        </button>
      </div>
      <p className="text-[11px] text-[#475569] mb-4">
        Compare scores from different tests using z-scores
      </p>

      {/* Inputs */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <ScoreInput
          label="Test A"
          color="#3bb4a4"
          value={testA_value}
          mean={testA_mean}
          stdDev={testA_stdDev}
          onValueChange={onTestAValue}
          onMeanChange={onTestAMean}
          onStdDevChange={onTestAStdDev}
          onUsed={onUsed}
        />
        <ScoreInput
          label="Test B"
          color="#f97316"
          value={testB_value}
          mean={testB_mean}
          stdDev={testB_stdDev}
          onValueChange={onTestBValue}
          onMeanChange={onTestBMean}
          onStdDevChange={onTestBStdDev}
          onUsed={onUsed}
        />
      </div>

      {/* Shared standard normal SVG */}
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[#475569] mb-2">
          Standard Normal — Both Scores
        </p>
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          width="100%"
          role="img"
          aria-label="Standard normal curve with both z-scores marked"
          className="block"
        >
          {/* Curve fill */}
          <path d={curveClosedPath} fill="#1e5d8a" opacity={0.12} />
          {/* Curve stroke */}
          <path d={curvePath} fill="none" stroke="#1e5d8a" strokeWidth="1.5" />
          {/* Baseline */}
          <line x1={PAD.l} y1={baselineY} x2={VW - PAD.r} y2={baselineY} stroke="#334155" strokeWidth="1" />

          {/* X-axis ticks */}
          {xTicks.map(v => {
            const sx = zToSvgX(v);
            return (
              <g key={v}>
                <line x1={sx} y1={baselineY} x2={sx} y2={baselineY + 3} stroke="#334155" strokeWidth="1" />
                <text x={sx} y={baselineY + 11} textAnchor="middle" fill="#334155" fontSize="7.5">
                  {v}
                </text>
              </g>
            );
          })}

          {/* Test A marker */}
          {isFinite(zA) && (
            <g>
              <line x1={zA_x} y1={PAD.t} x2={zA_x} y2={baselineY} stroke="#3bb4a4" strokeWidth="2" strokeDasharray="3 2" />
              <circle cx={zA_x} cy={PAD.t + 8} r={5} fill="#3bb4a4" stroke="#0f172a" strokeWidth="1.5" />
              <text x={zA_x} y={PAD.t - 2} textAnchor="middle" fill="#3bb4a4" fontSize="8" fontWeight="bold">
                A
              </text>
            </g>
          )}

          {/* Test B marker */}
          {isFinite(zB) && (
            <g>
              <line x1={zB_x} y1={PAD.t} x2={zB_x} y2={baselineY} stroke="#f97316" strokeWidth="2" strokeDasharray="3 2" />
              <circle cx={zB_x} cy={PAD.t + 8} r={5} fill="#f97316" stroke="#0f172a" strokeWidth="1.5" />
              <text x={zB_x} y={PAD.t - 2} textAnchor="middle" fill="#f97316" fontSize="8" fontWeight="bold">
                B
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Conclusion */}
      <motion.div
        key={`${zA.toFixed(2)}-${zB.toFixed(2)}`}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-xl border border-[#1e293b] p-3"
      >
        <p className="text-[11px] text-[#94a3b8] leading-relaxed">
          <span className="text-[#3bb4a4] font-semibold">Score A:</span> z = {isFinite(zA) ? zA.toFixed(2) : "∞"} &nbsp;|&nbsp;{" "}
          <span className="text-[#f97316] font-semibold">Score B:</span> z = {isFinite(zB) ? zB.toFixed(2) : "∞"}
        </p>
        {winner === "tie" && (
          <p className="text-[12px] font-semibold text-[#d4af37] mt-1.5">
            Both scores are equally strong relative to their distributions.
          </p>
        )}
        {winner === "A" && (
          <p className="text-[12px] font-semibold text-[#3bb4a4] mt-1.5">
            Score A performs better — higher z-score means further above the mean.
          </p>
        )}
        {winner === "B" && (
          <p className="text-[12px] font-semibold text-[#f97316] mt-1.5">
            Score B performs better — higher z-score means further above the mean.
          </p>
        )}
      </motion.div>
    </div>
  );
}
