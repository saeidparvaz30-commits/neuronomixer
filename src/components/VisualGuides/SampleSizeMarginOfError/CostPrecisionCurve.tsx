"use client";

import React, { useRef, useCallback, useMemo } from "react";
import { ConfidenceLevel, computeMOE } from "./types";

interface Props {
  currentN: number;
  confidenceLevel: ConfidenceLevel;
  p: number;
  onNChange: (n: number) => void;
}

interface CurvePoint {
  n: number;
  moe: number;
  x: number;
  y: number;
}

const SVG_W = 520;
const SVG_H = 260;
const PAD_L = 46;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 38;

const N_MIN = 50;
const N_MAX = 3000;
const MOE_MIN = 0;
const MOE_MAX = 12;

const ANNOTATIONS = [
  { n: 100, label: "n=100: MOE≈10%" },
  { n: 400, label: "n=400: MOE≈5%" },
  { n: 1600, label: "n=1600: MOE≈2.5%" },
];

function nToX(n: number): number {
  return PAD_L + ((n - N_MIN) / (N_MAX - N_MIN)) * (SVG_W - PAD_L - PAD_R);
}

function moeToY(moe: number): number {
  return PAD_T + ((MOE_MAX - moe) / (MOE_MAX - MOE_MIN)) * (SVG_H - PAD_T - PAD_B);
}

function xToN(x: number): number {
  const ratio = (x - PAD_L) / (SVG_W - PAD_L - PAD_R);
  return Math.round(Math.max(N_MIN, Math.min(N_MAX, N_MIN + ratio * (N_MAX - N_MIN))));
}

export default function CostPrecisionCurve({
  currentN,
  confidenceLevel,
  p,
  onNChange,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  // Pre-compute curve points
  const points = useMemo<CurvePoint[]>(() => {
    const pts: CurvePoint[] = [];
    for (let n = N_MIN; n <= N_MAX; n += 50) {
      const moe = computeMOE(n, confidenceLevel, p);
      pts.push({ n, moe, x: nToX(n), y: moeToY(moe) });
    }
    return pts;
  }, [confidenceLevel, p]);

  const pathD = useMemo(() => {
    if (points.length === 0) return "";
    const [first, ...rest] = points;
    return (
      `M ${first.x} ${first.y} ` +
      rest.map((pt) => `L ${pt.x} ${pt.y}`).join(" ")
    );
  }, [points]);

  const currentMOE = computeMOE(
    Math.max(N_MIN, Math.min(N_MAX, currentN)),
    confidenceLevel,
    p
  );
  const dotX = nToX(Math.max(N_MIN, Math.min(N_MAX, currentN)));
  const dotY = moeToY(currentMOE);

  const getSVGX = useCallback(
    (clientX: number): number => {
      if (!svgRef.current) return 0;
      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = SVG_W / rect.width;
      return (clientX - rect.left) * scaleX;
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragging.current) return;
      const svgX = getSVGX(e.clientX);
      const n = xToN(svgX);
      onNChange(n);
    },
    [getSVGX, onNChange]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      dragging.current = true;
      (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
      const svgX = getSVGX(e.clientX);
      const n = xToN(svgX);
      onNChange(n);
    },
    [getSVGX, onNChange]
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // X-axis ticks
  const xTicks = [0, 500, 1000, 1500, 2000, 2500, 3000];
  // Y-axis ticks
  const yTicks = [0, 2, 4, 6, 8, 10, 12];

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <p className="text-[13px] font-bold text-white mb-1">
        Cost-Precision Curve
      </p>
      <p className="text-[11px] text-[#94a3b8] mb-4">
        Drag the gold dot to explore how sample size affects margin of error
      </p>

      <div className="w-full overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full max-w-full cursor-crosshair select-none touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          role="img"
          aria-label={`MOE vs sample size curve. Current: n=${currentN}, MOE=${currentMOE}%`}
        >
          {/* Grid lines */}
          {yTicks.map((t) => (
            <line
              key={`ygrid-${t}`}
              x1={PAD_L}
              y1={moeToY(t)}
              x2={SVG_W - PAD_R}
              y2={moeToY(t)}
              stroke="#1e293b"
              strokeWidth={1}
            />
          ))}
          {xTicks.map((t) => (
            <line
              key={`xgrid-${t}`}
              x1={nToX(t || N_MIN)}
              y1={PAD_T}
              x2={nToX(t || N_MIN)}
              y2={SVG_H - PAD_B}
              stroke="#1e293b"
              strokeWidth={1}
            />
          ))}

          {/* Y-axis labels */}
          {yTicks.map((t) => (
            <text
              key={`ylabel-${t}`}
              x={PAD_L - 6}
              y={moeToY(t) + 4}
              textAnchor="end"
              fontSize={9}
              fill="#475569"
            >
              {t}%
            </text>
          ))}

          {/* X-axis labels */}
          {xTicks.map((t) => (
            <text
              key={`xlabel-${t}`}
              x={nToX(t === 0 ? N_MIN : t)}
              y={SVG_H - PAD_B + 14}
              textAnchor="middle"
              fontSize={9}
              fill="#475569"
            >
              {t === 0 ? "50" : t >= 1000 ? `${t / 1000}K` : t}
            </text>
          ))}

          {/* Axis labels */}
          <text
            x={PAD_L + (SVG_W - PAD_L - PAD_R) / 2}
            y={SVG_H - 4}
            textAnchor="middle"
            fontSize={10}
            fill="#94a3b8"
          >
            Sample Size (n)
          </text>
          <text
            x={10}
            y={PAD_T + (SVG_H - PAD_T - PAD_B) / 2}
            textAnchor="middle"
            fontSize={10}
            fill="#94a3b8"
            transform={`rotate(-90, 10, ${PAD_T + (SVG_H - PAD_T - PAD_B) / 2})`}
          >
            MOE (%)
          </text>

          {/* Curve */}
          <path
            d={pathD}
            fill="none"
            stroke="#3bb4a4"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Annotations */}
          {ANNOTATIONS.map(({ n, label }) => {
            const moe = computeMOE(n, confidenceLevel, p);
            const ax = nToX(n);
            const ay = moeToY(moe);
            return (
              <g key={`ann-${n}`}>
                <circle cx={ax} cy={ay} r={3} fill="#1e5d8a" />
                <text
                  x={ax}
                  y={ay - 8}
                  textAnchor="middle"
                  fontSize={8}
                  fill="#475569"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Vertical guide line at current N */}
          <line
            x1={dotX}
            y1={PAD_T}
            x2={dotX}
            y2={SVG_H - PAD_B}
            stroke="var(--color-accent)"
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.5}
          />

          {/* Current dot */}
          <circle
            cx={dotX}
            cy={dotY}
            r={7}
            fill="var(--color-accent)"
            className="cursor-grab"
          />
          <circle cx={dotX} cy={dotY} r={4} fill="#0f172a" />

          {/* Tooltip bubble */}
          {currentN >= N_MIN && currentN <= N_MAX && (
            <g>
              <rect
                x={Math.min(dotX - 36, SVG_W - PAD_R - 72)}
                y={dotY - 34}
                width={72}
                height={22}
                rx={4}
                fill="#1e293b"
                stroke="var(--color-accent)"
                strokeWidth={0.8}
              />
              <text
                x={Math.min(dotX, SVG_W - PAD_R - 36)}
                y={dotY - 18}
                textAnchor="middle"
                fontSize={9}
                fill="var(--color-accent)"
                fontWeight="bold"
              >
                {currentN} → ±{currentMOE}%
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Key message */}
      <p className="text-[11px] text-[#94a3b8] mt-3 border-t border-white/[0.06] pt-3">
        <span className="text-[var(--color-accent)] font-semibold">Key insight:</span>{" "}
        Notice the curve flattens: diminishing returns after ~n=400. Doubling
        sample size beyond that barely shrinks the MOE.
      </p>
    </div>
  );
}
