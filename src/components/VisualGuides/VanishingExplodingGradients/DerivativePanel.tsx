"use client";

import React, { useMemo } from "react";
import {
  Activation,
  ACTIVATION_META,
  derivativeCurve,
  DerivativeCurve,
} from "./types";

interface Props {
  /** Currently selected activation in the gradient lab (highlighted here). */
  activation: Activation;
}

const W = 640;
const H = 260;
const M = { top: 18, right: 14, bottom: 36, left: 46 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;

const Z_MIN = -8;
const Z_MAX = 8;
const D_MAX = 1.08;

const ACTIVATIONS: Activation[] = ["sigmoid", "tanh", "relu"];

function toPath(curve: DerivativeCurve): string {
  const px = (z: number) => M.left + ((z - Z_MIN) / (Z_MAX - Z_MIN)) * PLOT_W;
  const py = (d: number) => M.top + ((D_MAX - d) / D_MAX) * PLOT_H;
  return curve.z
    .map((z, i) => `${i === 0 ? "M" : "L"} ${px(z).toFixed(2)} ${py(curve.d[i]).toFixed(2)}`)
    .join(" ");
}

function DerivativePanelInner({ activation }: Props) {
  const curves = useMemo(
    () =>
      Object.fromEntries(
        ACTIVATIONS.map((a) => [a, derivativeCurve(a)])
      ) as Record<Activation, DerivativeCurve>,
    []
  );

  const px = (z: number) => M.left + ((z - Z_MIN) / (Z_MAX - Z_MIN)) * PLOT_W;
  const py = (d: number) => M.top + ((D_MAX - d) / D_MAX) * PLOT_H;

  const selected = curves[activation];
  const selectedMeta = ACTIVATION_META[activation];

  const summary =
    `Line chart of activation derivatives f'(z) for z between ${Z_MIN} and ${Z_MAX}. ` +
    ACTIVATIONS.map(
      (a) =>
        `${ACTIVATION_META[a].label} peaks at ${curves[a].maxD.toFixed(3)}`
    ).join(", ") +
    `. ${selectedMeta.label} is currently selected.`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={summary}
      >
        {/* Gridlines at 0.25 steps */}
        {[0, 0.25, 0.5, 0.75, 1].map((d) => (
          <g key={d}>
            <line
              x1={M.left}
              x2={M.left + PLOT_W}
              y1={py(d)}
              y2={py(d)}
              stroke={d === 1 ? "#334155" : "#1e293b"}
              strokeWidth={1}
              strokeDasharray={d === 1 ? "4 4" : undefined}
            />
            <text
              x={M.left - 7}
              y={py(d) + 3}
              textAnchor="end"
              fontSize={10}
              fill="#475569"
              fontFamily="monospace"
            >
              {d.toFixed(2)}
            </text>
          </g>
        ))}

        {/* z axis ticks */}
        {[-8, -4, 0, 4, 8].map((z) => (
          <g key={z}>
            <line
              x1={px(z)}
              x2={px(z)}
              y1={M.top + PLOT_H}
              y2={M.top + PLOT_H + 4}
              stroke="#334155"
              strokeWidth={1}
            />
            <text
              x={px(z)}
              y={M.top + PLOT_H + 16}
              textAnchor="middle"
              fontSize={10}
              fill="#475569"
              fontFamily="monospace"
            >
              {z}
            </text>
          </g>
        ))}
        <text
          x={M.left + PLOT_W / 2}
          y={H - 4}
          textAnchor="middle"
          fontSize={10.5}
          fill="#94a3b8"
        >
          pre-activation z
        </text>

        {/* Curves: non-selected dimmed */}
        {ACTIVATIONS.map((a) => (
          <path
            key={a}
            d={toPath(curves[a])}
            fill="none"
            stroke={ACTIVATION_META[a].color}
            strokeWidth={a === activation ? 2.5 : 1.5}
            opacity={a === activation ? 1 : 0.35}
          />
        ))}

        {/* Max marker for the selected activation, computed from the sampled grid */}
        <circle
          cx={px(selected.maxZ)}
          cy={py(selected.maxD)}
          r={4}
          fill={selectedMeta.color}
          stroke="#0f172a"
          strokeWidth={1.5}
        />
        <text
          x={Math.min(px(selected.maxZ) + 8, M.left + PLOT_W - 150)}
          y={Math.max(py(selected.maxD) - 8, M.top + 10)}
          fontSize={10.5}
          fill={selectedMeta.color}
          fontFamily="monospace"
        >
          peak f&apos;(z) = {selected.maxD.toFixed(3)} at z = {selected.maxZ.toFixed(1)}
        </text>
      </svg>

      {/* Legend with computed peaks (text equivalent, color never sole indicator) */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-2">
        {ACTIVATIONS.map((a) => (
          <div key={a} className="flex items-center gap-1.5 text-[11px]">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ background: ACTIVATION_META[a].color }}
            />
            <span className={a === activation ? "text-white font-semibold" : "text-[#94a3b8]"}>
              {ACTIVATION_META[a].label}
              {a === activation ? " (selected)" : ""}: peak{" "}
              <span className="font-mono">{curves[a].maxD.toFixed(3)}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const DerivativePanel = React.memo(DerivativePanelInner);
export default DerivativePanel;
