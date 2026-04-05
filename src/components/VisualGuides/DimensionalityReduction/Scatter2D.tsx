"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { EMBEDDED_POINTS, DIGIT_COLORS, MethodType } from "./data";

const W = 560, H = 400, PAD = 32;

function normalize(vals: number[], low: number, high: number, padded: number) {
  return vals.map(v => PAD + ((v - low) / (high - low)) * (padded));
}

export default function Scatter2D({
  method,
  hoveredDigit,
  onHoverDigit,
}: {
  method: MethodType;
  hoveredDigit: number | null;
  onHoverDigit: (d: number | null) => void;
}) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; digit: number; cx: number; cy: number } | null>(null);

  const { xs, ys } = useMemo(() => {
    const coords = EMBEDDED_POINTS.map(p => p[method]);
    const allX = coords.map(c => c[0]);
    const allY = coords.map(c => c[1]);
    const xMin = Math.min(...allX), xMax = Math.max(...allX);
    const yMin = Math.min(...allY), yMax = Math.max(...allY);
    const xPad = (xMax - xMin) * 0.08 || 1;
    const yPad = (yMax - yMin) * 0.08 || 1;
    const innerW = W - PAD * 2, innerH = H - PAD * 2;
    const xs = allX.map(v => PAD + ((v - xMin + xPad) / (xMax - xMin + 2 * xPad)) * innerW);
    const ys = allY.map(v => PAD + (1 - (v - yMin + yPad) / (yMax - yMin + 2 * yPad)) * innerH);
    return { xs, ys };
  }, [method]);

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block" style={{ maxHeight: 420 }}>
        {/* Background grid */}
        {[0.25, 0.5, 0.75].map(t => (
          <g key={t}>
            <line
              x1={PAD + t * (W - PAD * 2)} y1={PAD}
              x2={PAD + t * (W - PAD * 2)} y2={H - PAD}
              stroke="#1e293b" strokeWidth="1"
            />
            <line
              x1={PAD} y1={PAD + t * (H - PAD * 2)}
              x2={W - PAD} y2={PAD + t * (H - PAD * 2)}
              stroke="#1e293b" strokeWidth="1"
            />
          </g>
        ))}
        {/* Axes */}
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#334155" strokeWidth="1" />
        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#334155" strokeWidth="1" />

        {/* Points */}
        {EMBEDDED_POINTS.map((pt, i) => {
          const color = DIGIT_COLORS[pt.digit];
          const isHovered = hoveredDigit === pt.digit;
          const isDimmed = hoveredDigit !== null && !isHovered;

          return (
            <motion.circle
              key={pt.id}
              animate={{ cx: xs[i], cy: ys[i] }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
              r={isHovered ? 7 : 5}
              fill={color}
              opacity={isDimmed ? 0.12 : isHovered ? 1 : 0.82}
              stroke={isHovered ? "#fff" : "transparent"}
              strokeWidth={1.5}
              style={{ cursor: "pointer" }}
              onMouseEnter={(e) => {
                onHoverDigit(pt.digit);
                const rect = (e.currentTarget as SVGCircleElement).closest("svg")!.getBoundingClientRect();
                setTooltip({
                  digit: pt.digit,
                  x: pt[method][0],
                  y: pt[method][1],
                  cx: xs[i],
                  cy: ys[i],
                });
              }}
              onMouseLeave={() => {
                onHoverDigit(null);
                setTooltip(null);
              }}
            />
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <g>
            <rect
              x={Math.min(tooltip.cx + 8, W - 110)}
              y={Math.max(tooltip.cy - 30, 4)}
              width={100} height={44}
              rx={6} ry={6}
              fill="#0f172a" stroke="#334155" strokeWidth="1"
            />
            <text
              x={Math.min(tooltip.cx + 58, W - 60)}
              y={Math.max(tooltip.cy - 12, 20)}
              textAnchor="middle"
              fill={DIGIT_COLORS[tooltip.digit]}
              fontSize="11" fontWeight="700"
            >
              Digit {tooltip.digit}
            </text>
            <text
              x={Math.min(tooltip.cx + 58, W - 60)}
              y={Math.max(tooltip.cy + 4, 36)}
              textAnchor="middle"
              fill="#64748b"
              fontSize="9"
            >
              ({tooltip.x.toFixed(2)}, {tooltip.y.toFixed(2)})
            </text>
          </g>
        )}
      </svg>

      {/* Axis labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center">
        <span className="text-[10px] text-[#475569]">Component 1</span>
      </div>
      <div className="absolute top-0 bottom-0 left-0 flex items-center">
        <span className="text-[10px] text-[#475569]" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
          Component 2
        </span>
      </div>
    </div>
  );
}
