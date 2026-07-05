"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import type { FunctionId, FunctionProperties } from "./types";

// ── Math functions ────────────────────────────────────────────────────────────
const EVAL: Record<FunctionId, (x: number) => number> = {
  relu: (x) => Math.max(0, x),
  sigmoid: (x) => 1 / (1 + Math.exp(-x)),
  tanh: (x) => Math.tanh(x),
  "leaky-relu": (x) => (x > 0 ? x : 0.01 * x),
};

// ── SVG dimensions & coordinate mapping ──────────────────────────────────────
const W = 480;
const H = 300;
const PAD_L = 44;
const PAD_R = 20;
const PAD_T = 16;
const PAD_B = 32;

const X_MIN = -5;
const X_MAX = 5;
const Y_MIN = -1.5;
const Y_MAX = 1.5;

function toSvgX(x: number): number {
  return PAD_L + ((x - X_MIN) / (X_MAX - X_MIN)) * (W - PAD_L - PAD_R);
}
function toSvgY(y: number): number {
  return PAD_T + ((Y_MAX - y) / (Y_MAX - Y_MIN)) * (H - PAD_T - PAD_B);
}
function fromSvgX(sx: number): number {
  return X_MIN + ((sx - PAD_L) / (W - PAD_L - PAD_R)) * (X_MAX - X_MIN);
}

// Build SVG path from 200 sampled points.
// No y-clamping: unbounded functions (ReLU, Leaky ReLU) must keep rising and
// exit the visible area, clipped by the plot-area clipPath, instead of being
// flattened into a fake saturation plateau.
function buildPath(fn: (x: number) => number): string {
  const N = 200;
  let d = "";
  for (let i = 0; i <= N; i++) {
    const x = X_MIN + (i / N) * (X_MAX - X_MIN);
    const y = fn(x);
    const sx = toSvgX(x);
    const sy = toSvgY(y);
    d += i === 0 ? `M${sx},${sy}` : ` L${sx},${sy}`;
  }
  return d;
}

interface HoverPoint {
  x: number;
  y: number;
  sx: number;
  sy: number;
}

interface FunctionPlotterProps {
  functionId: FunctionId;
  properties: FunctionProperties;
}

export default function FunctionPlotter({
  functionId,
  properties,
}: FunctionPlotterProps) {
  const [hoverPoint, setHoverPoint] = useState<HoverPoint | null>(null);
  const [pathKey, setPathKey] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  // Re-trigger path animation when function changes
  useEffect(() => {
    setPathKey((k) => k + 1);
    setHoverPoint(null);
  }, [functionId]);

  const fn = EVAL[functionId];
  const pathD = buildPath(fn);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const rawSx = (e.clientX - rect.left) * (W / rect.width);
      if (rawSx < PAD_L || rawSx > W - PAD_R) {
        setHoverPoint(null);
        return;
      }
      const x = fromSvgX(rawSx);
      const clampedX = Math.max(X_MIN, Math.min(X_MAX, x));
      const y = fn(clampedX);
      const clampedY = Math.max(Y_MIN, Math.min(Y_MAX, y));
      setHoverPoint({
        x: clampedX,
        y,
        sx: toSvgX(clampedX),
        sy: toSvgY(clampedY),
      });
    },
    [fn]
  );

  const handleMouseLeave = useCallback(() => setHoverPoint(null), []);

  // Grid lines
  const xGridLines = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
  const yGridLines = [-1, -0.5, 0, 0.5, 1];

  // Annotations
  const showDeadZone = functionId === "relu";
  const showVanishingZones =
    functionId === "sigmoid" || functionId === "tanh";

  const deadZoneX2 = toSvgX(0);
  const deadZoneX1 = toSvgX(X_MIN);
  const deadZoneWidth = deadZoneX2 - deadZoneX1;

  return (
    <div className="bg-[#0f172a] rounded-xl border border-[#1e293b] overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full cursor-crosshair select-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <clipPath id="fn-plot-area">
            <rect
              x={PAD_L}
              y={PAD_T}
              width={W - PAD_L - PAD_R}
              height={H - PAD_T - PAD_B}
            />
          </clipPath>
        </defs>

        {/* Dead zone annotation (ReLU) */}
        {showDeadZone && (
          <rect
            x={deadZoneX1}
            y={PAD_T}
            width={deadZoneWidth}
            height={H - PAD_T - PAD_B}
            fill="#ef4444"
            opacity={0.06}
          />
        )}

        {/* Vanishing gradient zones (Sigmoid/Tanh) */}
        {showVanishingZones && (
          <>
            <rect
              x={toSvgX(X_MIN)}
              y={PAD_T}
              width={toSvgX(-3) - toSvgX(X_MIN)}
              height={H - PAD_T - PAD_B}
              fill="#3bb4a4"
              opacity={0.05}
            />
            <rect
              x={toSvgX(3)}
              y={PAD_T}
              width={toSvgX(X_MAX) - toSvgX(3)}
              height={H - PAD_T - PAD_B}
              fill="#3bb4a4"
              opacity={0.05}
            />
          </>
        )}

        {/* Grid lines */}
        {xGridLines.map((gx) => (
          <line
            key={`gx-${gx}`}
            x1={toSvgX(gx)}
            y1={PAD_T}
            x2={toSvgX(gx)}
            y2={H - PAD_B}
            stroke="#1e293b"
            strokeWidth="1"
          />
        ))}
        {yGridLines.map((gy) => (
          <line
            key={`gy-${gy}`}
            x1={PAD_L}
            y1={toSvgY(gy)}
            x2={W - PAD_R}
            y2={toSvgY(gy)}
            stroke="#1e293b"
            strokeWidth="1"
          />
        ))}

        {/* Axis lines */}
        <line
          x1={PAD_L}
          y1={toSvgY(0)}
          x2={W - PAD_R}
          y2={toSvgY(0)}
          stroke="#334155"
          strokeWidth="1.5"
        />
        <line
          x1={toSvgX(0)}
          y1={PAD_T}
          x2={toSvgX(0)}
          y2={H - PAD_B}
          stroke="#334155"
          strokeWidth="1.5"
        />

        {/* Axis tick labels */}
        {[-4, -2, 0, 2, 4].map((v) => (
          <text
            key={`xtick-${v}`}
            x={toSvgX(v)}
            y={H - PAD_B + 12}
            fill="#475569"
            fontSize="8"
            textAnchor="middle"
          >
            {v}
          </text>
        ))}
        {[-1, -0.5, 0.5, 1].map((v) => (
          <text
            key={`ytick-${v}`}
            x={PAD_L - 4}
            y={toSvgY(v) + 3}
            fill="#475569"
            fontSize="8"
            textAnchor="end"
          >
            {v}
          </text>
        ))}

        {/* Axis labels */}
        <text
          x={(PAD_L + W - PAD_R) / 2}
          y={H - 4}
          fill="#64748b"
          fontSize="9"
          textAnchor="middle"
        >
          x
        </text>
        <text
          x={9}
          y={(PAD_T + H - PAD_B) / 2}
          fill="#64748b"
          fontSize="9"
          textAnchor="middle"
          transform={`rotate(-90, 9, ${(PAD_T + H - PAD_B) / 2})`}
        >
          f(x)
        </text>

        {/* Dead zone annotation label */}
        {showDeadZone && (
          <>
            <line
              x1={toSvgX(-2.5)}
              y1={toSvgY(0)}
              x2={toSvgX(-2.5)}
              y2={toSvgY(0.8)}
              stroke="#ef4444"
              strokeWidth="1"
              strokeDasharray="3 2"
              opacity={0.7}
            />
            <text
              x={toSvgX(-3.8)}
              y={toSvgY(0.9)}
              fill="#ef4444"
              fontSize="8"
              opacity={0.8}
            >
              Dead zone (x&lt;0)
            </text>
          </>
        )}

        {/* Vanishing gradient annotation */}
        {showVanishingZones && (
          <>
            <text
              x={toSvgX(-4.5)}
              y={toSvgY(0.35)}
              fill="#3bb4a4"
              fontSize="7.5"
              opacity={0.75}
            >
              ~0 grad
            </text>
            <text
              x={toSvgX(3.2)}
              y={toSvgY(0.35)}
              fill="#3bb4a4"
              fontSize="7.5"
              opacity={0.75}
            >
              ~0 grad
            </text>
          </>
        )}

        {/* Function curve with pathLength animation */}
        <motion.path
          key={pathKey}
          clipPath="url(#fn-plot-area)"
          d={pathD}
          fill="none"
          stroke={properties.color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />

        {/* Hover crosshair */}
        {hoverPoint && (
          <>
            <line
              x1={hoverPoint.sx}
              y1={PAD_T}
              x2={hoverPoint.sx}
              y2={H - PAD_B}
              stroke="#475569"
              strokeWidth="1"
              strokeDasharray="3 2"
            />
            <circle
              cx={hoverPoint.sx}
              cy={hoverPoint.sy}
              r={5}
              fill="#d4af37"
              stroke="#0f172a"
              strokeWidth="1.5"
            />
            {/* Tooltip */}
            <g
              transform={`translate(${
                hoverPoint.sx > W - 110 ? hoverPoint.sx - 108 : hoverPoint.sx + 8
              }, ${
                hoverPoint.sy < PAD_T + 36 ? hoverPoint.sy + 6 : hoverPoint.sy - 36
              })`}
            >
              <rect
                width="96"
                height="26"
                rx="5"
                fill="#1e293b"
                stroke="#334155"
                strokeWidth="1"
              />
              <text x="8" y="11" fill="#94a3b8" fontSize="8">
                x ={" "}
                <tspan fill="white" fontWeight="bold">
                  {hoverPoint.x.toFixed(2)}
                </tspan>
              </text>
              <text x="8" y="21" fill="#94a3b8" fontSize="8">
                f(x) ={" "}
                <tspan fill={properties.color} fontWeight="bold">
                  {hoverPoint.y.toFixed(4)}
                </tspan>
              </text>
            </g>
          </>
        )}
      </svg>
    </div>
  );
}
