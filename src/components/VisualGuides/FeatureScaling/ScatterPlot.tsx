"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ScalingMethod, RAW_DATA, METHOD_META, scale } from "./types";

type Props = {
  method: ScalingMethod;
  selectedPair: [number, number] | null;
  onSelectPoint: (idx: number) => void;
};

const W = 440, H = 380, PAD = { l: 52, r: 20, t: 16, b: 48 };
const IW = W - PAD.l - PAD.r;
const IH = H - PAD.t - PAD.b;

function lerp(v: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  return outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin);
}

function niceNum(v: number, method: ScalingMethod): string {
  if (method === "raw") {
    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}k`;
    return v.toFixed(0);
  }
  if (method === "normalized") return v.toFixed(2);
  return v.toFixed(1);
}

function ScatterPlotInner({ method, selectedPair, onSelectPoint }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const meta = METHOD_META[method];

  function toSvgX(v: number) { return lerp(v, meta.xMin, meta.xMax, PAD.l, PAD.l + IW); }
  function toSvgY(v: number) { return lerp(v, meta.yMin, meta.yMax, PAD.t + IH, PAD.t); }

  // Ticks
  function makeTicks(min: number, max: number, n = 5) {
    return Array.from({ length: n }, (_, i) => min + ((max - min) / (n - 1)) * i);
  }
  const xTicks = makeTicks(meta.xMin, meta.xMax);
  const yTicks = makeTicks(meta.yMin, meta.yMax);

  return (
    <div role="img" aria-label={`Scatter plot of Age vs Salary using ${meta.label} scaling`}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block">
        {/* Grid */}
        {xTicks.map((v) => (
          <line key={`gx-${v}`} x1={toSvgX(v)} y1={PAD.t} x2={toSvgX(v)} y2={PAD.t + IH} stroke="#1e293b" strokeWidth="1" />
        ))}
        {yTicks.map((v) => (
          <line key={`gy-${v}`} x1={PAD.l} y1={toSvgY(v)} x2={PAD.l + IW} y2={toSvgY(v)} stroke="#1e293b" strokeWidth="1" />
        ))}

        {/* Zero lines for standardized */}
        {method === "standardized" && (
          <>
            <line x1={toSvgX(0)} y1={PAD.t} x2={toSvgX(0)} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" strokeDasharray="4 3" />
            <line x1={PAD.l} y1={toSvgY(0)} x2={PAD.l + IW} y2={toSvgY(0)} stroke="#334155" strokeWidth="1" strokeDasharray="4 3" />
          </>
        )}

        {/* Axes */}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke="#334155" strokeWidth="1.5" />
        <line x1={PAD.l} y1={PAD.t + IH} x2={PAD.l + IW} y2={PAD.t + IH} stroke="#334155" strokeWidth="1.5" />

        {/* Tick labels */}
        {xTicks.map((v) => (
          <text key={`xl-${v}`} x={toSvgX(v)} y={PAD.t + IH + 17} textAnchor="middle" fontSize="14" fill="#475569" fontFamily="Inter,sans-serif">
            {niceNum(v, method)}
          </text>
        ))}
        {yTicks.map((v) => (
          <text key={`yl-${v}`} x={PAD.l - 6} y={toSvgY(v) + 4} textAnchor="end" fontSize="14" fill="#475569" fontFamily="Inter,sans-serif">
            {niceNum(v, method)}
          </text>
        ))}

        {/* Axis labels */}
        <text x={PAD.l + IW / 2} y={H - 4} textAnchor="middle" fontSize="15" fill="#94a3b8" fontFamily="Inter,sans-serif">{meta.xLabel}</text>
        <text x={12} y={PAD.t + IH / 2} textAnchor="middle" fontSize="15" fill="#94a3b8" fontFamily="Inter,sans-serif" transform={`rotate(-90,12,${PAD.t + IH / 2})`}>{meta.yLabel}</text>

        {/* Ghost raw points (shown when not in raw mode) */}
        {method !== "raw" && RAW_DATA.map((pt, i) => {
          const rawScaled = scale(pt, "raw");
          const rawMeta   = METHOD_META["raw"];
          const gx = lerp(rawScaled.x, rawMeta.xMin, rawMeta.xMax, PAD.l, PAD.l + IW);
          const gy = lerp(rawScaled.y, rawMeta.yMin, rawMeta.yMax, PAD.t + IH, PAD.t);
          return <circle key={`ghost-${i}`} cx={gx} cy={gy} r="4" fill="#3b82f6" opacity="0.07" />;
        })}

        {/* Active points */}
        {RAW_DATA.map((pt, i) => {
          const sc      = scale(pt, method);
          const cx      = toSvgX(sc.x);
          const cy      = toSvgY(sc.y);
          const isHov   = hoveredIdx === i;
          const isSel   = selectedPair?.includes(i) ?? false;
          const selIdx  = selectedPair ? selectedPair.indexOf(i) : -1;

          return (
            <g key={i}>
              {/* Selection ring */}
              {isSel && (
                <motion.circle cx={cx} cy={cy} r={14} fill="none" stroke="var(--color-accent)"
                  strokeWidth="2" opacity="0.7"
                  animate={{ r: [12, 14, 12] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}

              <motion.circle
                cx={cx} cy={cy}
                r={isHov || isSel ? 8 : 6}
                fill={isSel ? "var(--color-accent)" : "#3b82f6"}
                stroke={isSel ? "#fff" : isHov ? "var(--color-accent)" : "rgba(255,255,255,0.3)"}
                strokeWidth={isSel ? "2" : "1"}
                animate={{ cx, cy, r: isHov || isSel ? 8 : 6 }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
                style={{ cursor: "pointer" }}
                onClick={() => onSelectPoint(i)}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                aria-label={`Select point ${i + 1}: Age ${pt.age}, Salary $${pt.salary.toLocaleString()}`}
              >
                <title>{`Point ${i + 1}: Age ${pt.age}, Salary $${pt.salary.toLocaleString()}`}</title>
              </motion.circle>

              {/* Selection label */}
              {isSel && (
                <text cx={cx} cy={cy - 14} textAnchor="middle" fontSize="14" fill="var(--color-accent)" fontFamily="Inter,sans-serif">
                  <tspan x={cx} dy={-14}>{selIdx === 0 ? "A" : "B"}</tspan>
                </text>
              )}

              {/* Hover tooltip */}
              {isHov && !isSel && (
                <g>
                  <rect x={cx - 50} y={cy - 52} width="100" height="42" rx="5" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                  <text x={cx} y={cy - 36} textAnchor="middle" fontSize="14" fill="#f1f5f9" fontFamily="Inter,sans-serif">
                    Age: {pt.age}
                  </text>
                  <text x={cx} y={cy - 16} textAnchor="middle" fontSize="14" fill="#f1f5f9" fontFamily="Inter,sans-serif">
                    ${(pt.salary / 1000).toFixed(0)}k
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      <p className="text-[10px] text-[#475569] mt-1 text-center">Click two points to compare distances across scaling methods</p>
    </div>
  );
}

const ScatterPlot = React.memo(ScatterPlotInner);
export default ScatterPlot;
