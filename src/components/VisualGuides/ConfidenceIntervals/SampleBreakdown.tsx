"use client";

import React from "react";
import { ConfidenceInterval, ConfidenceLevel, TRUE_MEAN, SAMPLE_N, T_SCORES } from "./types";

interface Props {
  interval: ConfidenceInterval;
  confidenceLevel: ConfidenceLevel;
}

const SVG_W = 400;
const SVG_H = 36;
const PAD_L = 20;
const PAD_R = 20;
const X_MIN = 75;
const X_MAX = 125;
const INNER_W = SVG_W - PAD_L - PAD_R;

function scaleX(v: number): number {
  return PAD_L + ((v - X_MIN) / (X_MAX - X_MIN)) * INNER_W;
}

export default function SampleBreakdown({ interval, confidenceLevel }: Props) {
  const t = T_SCORES[confidenceLevel];
  const se = interval.sd / Math.sqrt(SAMPLE_N);
  const me = t * se;
  const borderColor = interval.containsTruth ? "#3bb4a4" : "#ef4444";
  const valueColor = interval.containsTruth ? "#3bb4a4" : "#ef4444";

  const first10 = interval.sampleData.slice(0, 10);
  // Pair up into 2-column rows
  const rows: [number, number | null][] = [];
  for (let i = 0; i < first10.length; i += 2) {
    rows.push([first10[i], first10[i + 1] ?? null]);
  }

  const lx1 = Math.max(PAD_L, scaleX(interval.lower));
  const lx2 = Math.min(SVG_W - PAD_R, scaleX(interval.upper));
  const mcx = scaleX(interval.mean);
  const trueLine = scaleX(TRUE_MEAN);

  return (
    <div
      className="rounded-2xl border p-5 space-y-5"
      style={{ borderColor: borderColor + "40" }}
      role="region"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <h3 className="text-[13px] font-bold text-white">
          Sample #{interval.sampleId} Breakdown
        </h3>
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-lg"
          style={{
            background: borderColor + "20",
            color: borderColor,
          }}
        >
          {interval.containsTruth ? "Captures μ=100" : "Misses μ=100"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Section 1: Sample data table */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[#475569] mb-2">
            Sample Data (first 10 of {SAMPLE_N})
          </p>
          <div
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: borderColor + "40" }}
          >
            <table className="w-full text-[11px]">
              <thead>
                <tr
                  style={{ background: borderColor + "15" }}
                >
                  <th
                    scope="col"
                    className="py-1.5 px-2 text-left font-semibold"
                    style={{ color: borderColor }}
                  >
                    Obs.
                  </th>
                  <th
                    scope="col"
                    className="py-1.5 px-2 text-right font-semibold"
                    style={{ color: borderColor }}
                  >
                    Value
                  </th>
                  <th
                    scope="col"
                    className="py-1.5 px-2 text-left font-semibold"
                    style={{ color: borderColor }}
                  >
                    Obs.
                  </th>
                  <th
                    scope="col"
                    className="py-1.5 px-2 text-right font-semibold"
                    style={{ color: borderColor }}
                  >
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([a, b], rowIdx) => (
                  <tr
                    key={rowIdx}
                    className="border-t"
                    style={{ borderColor: borderColor + "20" }}
                  >
                    <td className="py-1 px-2 text-[#94a3b8]">
                      {rowIdx * 2 + 1}
                    </td>
                    <td className="py-1 px-2 text-right font-mono text-white">
                      {a.toFixed(2)}
                    </td>
                    <td className="py-1 px-2 text-[#94a3b8]">
                      {b !== null ? rowIdx * 2 + 2 : ""}
                    </td>
                    <td className="py-1 px-2 text-right font-mono text-white">
                      {b !== null ? b.toFixed(2) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[9px] text-[#334155] px-2 py-1 border-t" style={{ borderColor: borderColor + "20" }}>
              + {SAMPLE_N - 10} more values not shown
            </p>
          </div>
        </div>

        {/* Section 2: Calculation steps */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[#475569] mb-2">
            Calculation Steps
          </p>
          <div className="space-y-2">
            <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-3 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[#475569]">Sample Mean (x̄)</span>
                <span
                  className="text-[12px] font-black font-mono"
                  style={{ color: valueColor }}
                >
                  {interval.mean.toFixed(3)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[#475569]">Sample SD (s)</span>
                <span className="text-[12px] font-black font-mono text-white">
                  {interval.sd.toFixed(3)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[#475569]">
                  SE = s / √{SAMPLE_N}
                </span>
                <span className="text-[12px] font-black font-mono text-white">
                  {se.toFixed(3)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[#475569]">
                  ME = t(29) × SE = {t.toFixed(3)} × SE
                </span>
                <span className="text-[12px] font-black font-mono text-white">
                  {me.toFixed(3)}
                </span>
              </div>
            </div>

            {/* CI result gold box */}
            <div
              className="rounded-xl p-3 text-center"
              style={{ background: "#d4af3715", border: "1px solid #d4af3740" }}
            >
              <p className="text-[10px] text-[#94a3b8] mb-0.5">
                {confidenceLevel}% Confidence Interval
              </p>
              <p className="text-[14px] font-black font-mono text-[#d4af37]">
                [{interval.lower.toFixed(3)}, {interval.upper.toFixed(3)}]
              </p>
            </div>

            {/* Containment verdict */}
            <div
              className="rounded-xl p-3 flex items-center gap-3"
              style={{
                background: borderColor + "10",
                border: `1px solid ${borderColor}30`,
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: borderColor + "25" }}
              >
                {interval.containsTruth ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={borderColor} strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={borderColor} strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-[10px] text-[#475569]">Contains μ = {TRUE_MEAN}?</p>
                <p
                  className="text-[12px] font-black"
                  style={{ color: borderColor }}
                >
                  {interval.containsTruth ? "YES — interval captures truth" : "NO — interval misses truth"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Mini number line */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[#475569] mb-2">
          Number Line View
        </p>
        <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-3">
          <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="100%" style={{ display: "block" }}>
            {/* Axis */}
            <line
              x1={PAD_L}
              y1={SVG_H / 2}
              x2={SVG_W - PAD_R}
              y2={SVG_H / 2}
              stroke="#1e293b"
              strokeWidth="1"
            />
            {/* CI bar */}
            <rect
              x={lx1}
              y={SVG_H / 2 - 5}
              width={Math.max(2, lx2 - lx1)}
              height={10}
              fill={borderColor}
              opacity="0.75"
              rx="2"
            />
            {/* Mean dot */}
            <circle cx={mcx} cy={SVG_H / 2} r={4} fill="white" />
            {/* True mean line */}
            <line
              x1={trueLine}
              y1={4}
              x2={trueLine}
              y2={SVG_H - 4}
              stroke="#d4af37"
              strokeWidth="1.5"
            />
            {/* Labels */}
            <text x={mcx} y={SVG_H - 4} textAnchor="middle" fill="#94a3b8" fontSize="7">
              x̄={interval.mean.toFixed(1)}
            </text>
            <text x={trueLine + 2} y={10} fill="#d4af37" fontSize="7">
              μ=100
            </text>
            <text x={lx1} y={SVG_H / 2 - 7} textAnchor="middle" fill={borderColor} fontSize="7">
              {interval.lower.toFixed(1)}
            </text>
            <text x={lx2} y={SVG_H / 2 - 7} textAnchor="middle" fill={borderColor} fontSize="7">
              {interval.upper.toFixed(1)}
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
