"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import type { OptimizerConfig, TrajectoryPoint } from "./types";

// SVG dimensions
const SVG_W = 500;
const SVG_H = 392;
const PAD_L = 36;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 44;

const PLOT_W = SVG_W - PAD_L - PAD_R;
const PLOT_H = SVG_H - PAD_T - PAD_B;

// Domain
const X_MIN = -4;
const X_MAX = 4;
const Y_MIN = -3;
const Y_MAX = 3;

function toSvgX(x: number): number {
  return PAD_L + ((x - X_MIN) / (X_MAX - X_MIN)) * PLOT_W;
}
function toSvgY(y: number): number {
  return PAD_T + ((Y_MAX - y) / (Y_MAX - Y_MIN)) * PLOT_H;
}

// Loss function
function lossAt(x: number, y: number): number {
  return 0.1 * x * x + 2 * y * y;
}

// Contour level → ellipse radii
// L(x,y) = 0.1x² + 2y² = L
// x²/(L/0.1) + y²/(L/2) = 1
// semi-axes: a = sqrt(L/0.1), b = sqrt(L/2)
const CONTOUR_LEVELS = [0.05, 0.1, 0.5, 1, 2, 4, 8, 14];

// Interpolate between two hex colors
function lerpColor(t: number): string {
  // outer (high loss): #334155 bluish-gray
  // inner (low loss): #0f4f5e teal-dark
  const r1 = 51, g1 = 65, b1 = 85;   // #334155
  const r2 = 30, g2 = 180, b2 = 164; // #1eb4a4 teal
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

// Heatmap grid for the background
const HEAT_RES = 60;

interface Props {
  currentStep: number;
  configs: OptimizerConfig[];
  trajectories: Record<string, TrajectoryPoint[]>;
}

export default function LossLandscape({ currentStep, configs, trajectories }: Props) {
  // Build heatmap cells
  const heatCells = useMemo(() => {
    const cells: { x: number; y: number; w: number; h: number; fill: string }[] = [];
    const cellW = PLOT_W / HEAT_RES;
    const cellH = PLOT_H / HEAT_RES;
    const maxLoss = lossAt(X_MAX, Y_MAX);

    for (let row = 0; row < HEAT_RES; row++) {
      for (let col = 0; col < HEAT_RES; col++) {
        const wx = X_MIN + (col / HEAT_RES) * (X_MAX - X_MIN);
        const wy = Y_MAX - (row / HEAT_RES) * (Y_MAX - Y_MIN);
        const l = lossAt(wx, wy);
        const norm = Math.min(l / (maxLoss * 0.6), 1);
        const r = Math.round(15 + norm * 40);
        const g = Math.round(30 + norm * 50 - (1 - norm) * 10);
        const b = Math.round(42 + norm * 60);
        cells.push({
          x: PAD_L + col * cellW,
          y: PAD_T + row * cellH,
          w: cellW + 0.5,
          h: cellH + 0.5,
          fill: `rgb(${r},${g},${b})`,
        });
      }
    }
    return cells;
  }, []);

  // Build contour ellipses
  const contours = useMemo(() => {
    return CONTOUR_LEVELS.map((level, i) => {
      const a = Math.sqrt(level / 0.1); // semi-axis in x (world units)
      const b = Math.sqrt(level / 2);   // semi-axis in y (world units)
      // Convert to SVG coordinates
      const cx = toSvgX(0);
      const cy = toSvgY(0);
      const rx = (a / (X_MAX - X_MIN)) * PLOT_W;
      const ry = (b / (Y_MAX - Y_MIN)) * PLOT_H;
      const t = i / (CONTOUR_LEVELS.length - 1);
      const color = lerpColor(1 - t);
      const opacity = 0.15 + t * 0.45;
      return { cx, cy, rx, ry, color, opacity, level };
    });
  }, []);

  // Build path strings for trajectories
  const trajectoryPaths = useMemo(() => {
    return configs.map((cfg) => {
      const traj = trajectories[cfg.id];
      if (!traj || traj.length < 2) return null;
      const pts = traj
        .map((pt) => `${toSvgX(pt.x).toFixed(2)},${toSvgY(pt.y).toFixed(2)}`)
        .join(" L ");
      return { id: cfg.id, color: cfg.color, enabled: cfg.enabled, path: `M ${pts}`, traj };
    });
  }, [configs, trajectories]);

  // Axis ticks
  const xTicks = [-4, -2, 0, 2, 4];
  const yTicks = [-3, -1.5, 0, 1.5, 3];

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full max-w-[500px] mx-auto"
        style={{ minWidth: 320 }}
      >
        {/* Background */}
        <rect x={PAD_L} y={PAD_T} width={PLOT_W} height={PLOT_H} fill="#0f172a" />

        {/* Heatmap */}
        {heatCells.map((c, i) => (
          <rect key={i} x={c.x} y={c.y} width={c.w} height={c.h} fill={c.fill} />
        ))}

        {/* Contour lines */}
        {contours.map((c) => (
          <ellipse
            key={c.level}
            cx={c.cx}
            cy={c.cy}
            rx={c.rx}
            ry={c.ry}
            fill="none"
            stroke={c.color}
            strokeWidth={1.2}
            opacity={c.opacity}
          />
        ))}

        {/* Clip path for trajectories */}
        <defs>
          <clipPath id="plotClip">
            <rect x={PAD_L} y={PAD_T} width={PLOT_W} height={PLOT_H} />
          </clipPath>
        </defs>

        {/* Trajectories */}
        {trajectoryPaths.map((tp) => {
          if (!tp || !tp.enabled) return null;
          return (
            <g key={tp.id} clipPath="url(#plotClip)">
              {/* Full path (dim) */}
              <path
                d={tp.path}
                fill="none"
                stroke={tp.color}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.25}
                strokeDasharray="4 3"
              />
              {/* Animated path up to currentStep */}
              <motion.path
                d={tp.path}
                fill="none"
                stroke={tp.color}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{
                  pathLength: tp.traj.length > 1
                    ? Math.min(currentStep, tp.traj.length - 1) / (tp.traj.length - 1)
                    : 0,
                }}
                transition={{ duration: 0.15, ease: "linear" }}
                opacity={0.9}
              />
              {/* Current position dot */}
              {currentStep > 0 && tp.traj[Math.min(currentStep, tp.traj.length - 1)] && (() => {
                const pt = tp.traj[Math.min(currentStep, tp.traj.length - 1)];
                const sx = toSvgX(pt.x);
                const sy = toSvgY(pt.y);
                if (sx < PAD_L || sx > PAD_L + PLOT_W || sy < PAD_T || sy > PAD_T + PLOT_H) return null;
                return (
                  <motion.circle
                    key={`dot-${tp.id}`}
                    cx={sx}
                    cy={sy}
                    r={5}
                    fill={tp.color}
                    stroke="white"
                    strokeWidth={1.5}
                    animate={{ cx: sx, cy: sy }}
                    transition={{ duration: 0.1 }}
                  />
                );
              })()}
            </g>
          );
        })}

        {/* Starting point */}
        <circle
          cx={toSvgX(-3)}
          cy={toSvgY(2)}
          r={5}
          fill="white"
          stroke="#94a3b8"
          strokeWidth={1.5}
          opacity={0.9}
        />
        <text
          x={toSvgX(-3) + 8}
          y={toSvgY(2) + 4}
          fill="#94a3b8"
          fontSize="16"
          fontFamily="monospace"
        >
          start
        </text>

        {/* Minimum star marker */}
        {(() => {
          const cx = toSvgX(0);
          const cy = toSvgY(0);
          const r = 6;
          const points = Array.from({ length: 5 }, (_, i) => {
            const outer = (Math.PI / 2) + (i * 4 * Math.PI) / 5;
            const inner = outer + (2 * Math.PI) / 10;
            return [
              `${(cx + r * Math.cos(outer)).toFixed(1)},${(cy - r * Math.sin(outer)).toFixed(1)}`,
              `${(cx + (r * 0.45) * Math.cos(inner)).toFixed(1)},${(cy - (r * 0.45) * Math.sin(inner)).toFixed(1)}`,
            ];
          }).flat().join(" ");
          return (
            <>
              <polygon
                points={points}
                fill="var(--color-accent)"
                stroke="var(--color-accent)"
                strokeWidth={0.5}
                opacity={0.95}
              />
              <text
                x={toSvgX(0) + 10}
                y={toSvgY(0) + 4}
                fill="var(--color-accent)"
                fontSize="16"
                fontFamily="monospace"
              >
                min
              </text>
            </>
          );
        })()}

        {/* Axes */}
        <line x1={PAD_L} y1={PAD_T + PLOT_H} x2={PAD_L + PLOT_W} y2={PAD_T + PLOT_H} stroke="#334155" strokeWidth={1} />
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + PLOT_H} stroke="#334155" strokeWidth={1} />

        {/* X axis ticks */}
        {xTicks.map((v) => (
          <g key={`xt-${v}`}>
            <line
              x1={toSvgX(v)} y1={PAD_T + PLOT_H}
              x2={toSvgX(v)} y2={PAD_T + PLOT_H + 4}
              stroke="#475569" strokeWidth={1}
            />
            <text
              x={toSvgX(v)} y={PAD_T + PLOT_H + 17}
              fill="#475569" fontSize="16" textAnchor="middle"
            >
              {v}
            </text>
          </g>
        ))}

        {/* Y axis ticks */}
        {yTicks.map((v) => (
          <g key={`yt-${v}`}>
            <line
              x1={PAD_L - 4} y1={toSvgY(v)}
              x2={PAD_L} y2={toSvgY(v)}
              stroke="#475569" strokeWidth={1}
            />
            <text
              x={PAD_L - 6} y={toSvgY(v) + 5}
              fill="#475569" fontSize="16" textAnchor="end"
            >
              {v}
            </text>
          </g>
        ))}

        {/* Axis labels */}
        <text
          x={PAD_L + PLOT_W / 2}
          y={SVG_H - 4}
          fill="#475569"
          fontSize="26"
          textAnchor="middle"
        >
          x
        </text>
        <text
          x={14}
          y={PAD_T + PLOT_H / 2}
          fill="#475569"
          fontSize="26"
          textAnchor="middle"
          transform={`rotate(-90, 14, ${PAD_T + PLOT_H / 2})`}
        >
          y
        </text>

        {/* Border */}
        <rect
          x={PAD_L} y={PAD_T}
          width={PLOT_W} height={PLOT_H}
          fill="none"
          stroke="#1e293b"
          strokeWidth={1}
        />
      </svg>
    </div>
  );
}
