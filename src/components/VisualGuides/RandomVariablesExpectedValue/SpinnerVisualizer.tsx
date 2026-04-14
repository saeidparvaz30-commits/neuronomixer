"use client";

import React, { useState, useRef } from "react";
import type { PayoutRow } from "./types";
import { probabilitiesValid, sampleOutcome } from "./types";

interface SpinnerVisualizerProps {
  rows: PayoutRow[];
}

const CX = 100;
const CY = 100;
const R = 80;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${cx} ${cy}`,
    `L ${start.x.toFixed(2)} ${start.y.toFixed(2)}`,
    `A ${r} ${r} 0 ${largeArc} 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function segmentColor(outcome: number): string {
  if (outcome > 0) return "#3bb4a4";
  if (outcome < 0) return "#ef4444";
  return "#475569";
}

export default function SpinnerVisualizer({ rows }: SpinnerVisualizerProps) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [landedOutcome, setLandedOutcome] = useState<number | null>(null);
  const spinRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isValid = probabilitiesValid(rows);

  function spin() {
    if (isSpinning || !isValid) return;
    setIsSpinning(true);
    setLandedOutcome(null);

    const extra = 2 + Math.floor(Math.random() * 3); // 2-4 full rotations
    const randomStop = Math.random() * 360;
    const totalDeg = extra * 360 + randomStop;

    setRotation((prev) => prev + totalDeg);

    if (spinRef.current) clearTimeout(spinRef.current);
    spinRef.current = setTimeout(() => {
      setIsSpinning(false);
      // Determine where the pointer (top = 0°) lands
      const finalAngle = ((rotation + totalDeg) % 360 + 360) % 360;
      // The pointer is at top (270° in our arc system = angle 0)
      const pointerAngle = (360 - finalAngle + 360) % 360;
      // Find which segment contains pointerAngle
      let cum = 0;
      let landed = rows[rows.length - 1].outcome;
      for (const row of rows) {
        const segDeg = row.probability * 360;
        if (pointerAngle >= cum && pointerAngle < cum + segDeg) {
          landed = row.outcome;
          break;
        }
        cum += segDeg;
      }
      setLandedOutcome(landed);
    }, 3000);
  }

  // Build segments
  const segments: { path: string; color: string; midAngle: number; outcome: number }[] = [];
  let cumAngle = 0;
  for (const row of rows) {
    const spanDeg = row.probability * 360;
    const midAngle = cumAngle + spanDeg / 2;
    segments.push({
      path: describeArc(CX, CY, R, cumAngle, cumAngle + spanDeg),
      color: segmentColor(row.outcome),
      midAngle,
      outcome: row.outcome,
    });
    cumAngle += spanDeg;
  }

  // Label positions (only if segment > 15°)
  const MIN_LABEL_DEG = 15;

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-4">
        Distribution Spinner
      </p>

      <div className="flex flex-col items-center gap-4">
        <div className="relative" style={{ width: 200, height: 210 }}>
          {/* Pointer at top */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-1 z-10">
            <svg width={14} height={18} viewBox="0 0 14 18">
              <polygon points="7,18 0,0 14,0" fill="#d4af37" />
            </svg>
          </div>

          <svg
            viewBox="0 0 200 200"
            width={200}
            height={200}
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? "transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
              transformOrigin: "center",
            }}
            aria-label="Probability spinner"
          >
            {isValid ? (
              segments.map((seg, i) => {
                const spanDeg = rows[i].probability * 360;
                const labelPos = polarToCartesian(CX, CY, R * 0.62, seg.midAngle);
                return (
                  <g key={i}>
                    <path d={seg.path} fill={seg.color} opacity={0.85} stroke="#0f172a" strokeWidth={1.5} />
                    {spanDeg >= MIN_LABEL_DEG && (
                      <text
                        x={labelPos.x}
                        y={labelPos.y + 4}
                        textAnchor="middle"
                        fill="white"
                        fontSize={spanDeg >= 40 ? 12 : 9}
                        fontWeight="700"
                      >
                        {seg.outcome >= 0 ? "+" : ""}
                        {seg.outcome}
                      </text>
                    )}
                  </g>
                );
              })
            ) : (
              <circle cx={CX} cy={CY} r={R} fill="#1e293b" />
            )}
            {/* Center cap */}
            <circle cx={CX} cy={CY} r={8} fill="#0f172a" stroke="#334155" strokeWidth={2} />
          </svg>
        </div>

        {/* Spin button */}
        <button
          disabled={isSpinning || !isValid}
          onClick={spin}
          className="px-6 py-2.5 rounded-xl text-[13px] font-semibold border border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37] hover:text-[#0a0e1a] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {isSpinning ? "Spinning…" : "Spin!"}
        </button>

        {/* Result */}
        {landedOutcome !== null && !isSpinning && (
          <div
            className={`text-center px-4 py-2 rounded-xl border ${
              landedOutcome > 0
                ? "border-[#3bb4a4]/30 bg-[#3bb4a4]/10 text-[#3bb4a4]"
                : landedOutcome < 0
                ? "border-[#ef4444]/30 bg-[#ef4444]/10 text-[#ef4444]"
                : "border-[#334155] text-[#94a3b8]"
            }`}
          >
            <p className="text-[11px] text-[#94a3b8] mb-0.5">Result</p>
            <p className="text-[18px] font-black font-mono">
              {landedOutcome >= 0 ? "+" : ""}
              {landedOutcome}
            </p>
          </div>
        )}

        {!isValid && (
          <p className="text-[11px] text-[#f97316]">Fix probabilities to enable spinner</p>
        )}
      </div>
    </div>
  );
}
