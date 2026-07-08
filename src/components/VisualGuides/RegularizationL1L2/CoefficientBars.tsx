"use client";

import React from "react";
import { DEGREE } from "./types";

interface Props {
  weights: number[];
  color: string;
  zeroCount: number;
  modeLabel: string;
}

const W = 560;
const H = 230;
const PAD = { l: 30, r: 10, t: 26, b: 28 };

function CoefficientBarsInner({ weights, color, zeroCount, modeLabel }: Props) {
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const zeroY = PAD.t + innerH / 2;
  const maxAbs = Math.max(0.5, ...weights.map((w) => Math.abs(w)));
  const slot = innerW / DEGREE;
  const barW = slot * 0.52;

  const summary =
    `Bar chart of the ${DEGREE} standardized polynomial coefficients for ${modeLabel}. ` +
    `${zeroCount} of ${DEGREE} are exactly zero. Values: ` +
    weights.map((w, j) => `w${j + 1} = ${w.toFixed(3)}`).join(", ") +
    ".";

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={summary}>
        {/* Scale reference lines */}
        {[maxAbs, -maxAbs].map((v) => {
          const y = zeroY - (v / maxAbs) * (innerH / 2);
          return (
            <g key={v}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} stroke="#1e293b" strokeWidth={1} />
              <text x={PAD.l - 4} y={y + 3} textAnchor="end" fontSize={9} fill="#475569">
                {v > 0 ? maxAbs.toFixed(1) : `-${maxAbs.toFixed(1)}`}
              </text>
            </g>
          );
        })}
        {/* Zero line */}
        <line x1={PAD.l} x2={W - PAD.r} y1={zeroY} y2={zeroY} stroke="#334155" strokeWidth={1.5} />
        <text x={PAD.l - 4} y={zeroY + 3} textAnchor="end" fontSize={9} fill="#475569">
          0
        </text>

        {weights.map((w, j) => {
          const cx = PAD.l + slot * j + slot / 2;
          const isZero = w === 0;
          const h = (Math.abs(w) / maxAbs) * (innerH / 2);
          const y = w >= 0 ? zeroY - h : zeroY;
          return (
            <g key={j}>
              {!isZero && (
                <rect
                  x={cx - barW / 2}
                  y={y}
                  width={barW}
                  height={Math.max(h, 0.5)}
                  rx={2}
                  fill={color}
                  opacity={0.85}
                />
              )}
              {isZero && (
                <circle
                  cx={cx}
                  cy={zeroY}
                  r={4.5}
                  fill="none"
                  strokeWidth={2}
                  style={{ stroke: "var(--color-success)" }}
                />
              )}
              {/* Value label */}
              <text
                x={cx}
                y={isZero ? zeroY - 9 : w >= 0 ? y - 5 : y + h + 11}
                textAnchor="middle"
                fontSize={9}
                fill={isZero ? undefined : "#94a3b8"}
                style={isZero ? { fill: "var(--color-success)" } : undefined}
                fontWeight={isZero ? 700 : 400}
              >
                {isZero ? "0" : w.toFixed(2)}
              </text>
              {/* Feature label */}
              <text x={cx} y={H - 10} textAnchor="middle" fontSize={10} fill="#475569">
                {`x^${j + 1}`}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-[10px] text-[#475569]">
        Weights are in standardized feature space (bar scale adapts to the largest
        weight). Circled 0 marks a coefficient that is exactly zero.
      </p>
    </div>
  );
}

const CoefficientBars = React.memo(CoefficientBarsInner);
export default CoefficientBars;
