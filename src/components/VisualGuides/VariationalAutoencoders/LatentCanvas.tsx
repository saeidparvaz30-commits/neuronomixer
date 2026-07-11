"use client";

import React, { useCallback, useRef } from "react";
import type { EmbeddedPoint } from "./vaeMath";
import { CLASS_NAMES } from "./vaeMath";

/** Display colors per shape class, always paired with a distinct marker shape. */
export const CLASS_COLORS: readonly string[] = [
  "#3bb4a4", // blob: filled circle
  "#a855f7", // cross: plus marker
  "var(--color-warning)", // ring: open circle
];

const SIZE = 460;
const M = 34;
const INNER = SIZE - 2 * M;

interface Props {
  points: readonly EmbeddedPoint[] | null;
  range: number;
  probe: [number, number] | null;
  a: [number, number] | null;
  b: [number, number] | null;
  /** Interpolation position along the A to B segment, or null to hide. */
  t: number | null;
  disabled: boolean;
  onProbe: (z1: number, z2: number) => void;
}

export default function LatentCanvas({
  points,
  range,
  probe,
  a,
  b,
  t,
  disabled,
  onProbe,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);

  const toPx = useCallback(
    (z: number) => M + ((z + range) / (2 * range)) * INNER,
    [range]
  );
  const toPy = useCallback(
    (z: number) => M + ((range - z) / (2 * range)) * INNER,
    [range]
  );

  const probeFromEvent = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const sx = ((e.clientX - rect.left) / rect.width) * SIZE;
      const sy = ((e.clientY - rect.top) / rect.height) * SIZE;
      const z1 = ((sx - M) / INNER) * 2 * range - range;
      const z2 = range - ((sy - M) / INNER) * 2 * range;
      const clamp = (v: number) => Math.min(range, Math.max(-range, v));
      onProbe(
        Math.round(clamp(z1) * 100) / 100,
        Math.round(clamp(z2) * 100) / 100
      );
    },
    [onProbe, range]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<SVGSVGElement>) => {
      if (disabled) return;
      const step = 0.15;
      const cur: [number, number] = probe ?? [0, 0];
      let [z1, z2] = cur;
      if (e.key === "ArrowLeft") z1 -= step;
      else if (e.key === "ArrowRight") z1 += step;
      else if (e.key === "ArrowUp") z2 += step;
      else if (e.key === "ArrowDown") z2 -= step;
      else return;
      e.preventDefault();
      const clamp = (v: number) => Math.min(range, Math.max(-range, v));
      onProbe(Math.round(clamp(z1) * 100) / 100, Math.round(clamp(z2) * 100) / 100);
    },
    [disabled, probe, onProbe, range]
  );

  const gridVals: number[] = [];
  for (let g = -Math.floor(range); g <= Math.floor(range); g++) gridVals.push(g);

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className={`w-full h-auto rounded-xl border border-[#1e293b] bg-[#0f172a] select-none ${
          disabled ? "opacity-50" : "cursor-crosshair"
        }`}
        style={{ touchAction: "none" }}
        role="img"
        aria-label={
          disabled
            ? "Latent space canvas, disabled until the models are trained."
            : "Two-dimensional latent space. Each marker is a dataset image placed at its encoder mean. Click or drag to decode any point; when focused, arrow keys move the decode probe. The z1 and z2 sliders below are an equivalent control."
        }
        tabIndex={disabled ? -1 : 0}
        onPointerDown={(e) => {
          if (disabled) return;
          draggingRef.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          probeFromEvent(e);
        }}
        onPointerMove={(e) => {
          if (disabled || !draggingRef.current) return;
          probeFromEvent(e);
        }}
        onPointerUp={() => {
          draggingRef.current = false;
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Grid */}
        {gridVals.map((g) => (
          <g key={g}>
            <line
              x1={toPx(g).toFixed(2)}
              y1={M}
              x2={toPx(g).toFixed(2)}
              y2={SIZE - M}
              stroke={g === 0 ? "#334155" : "#1e293b"}
              strokeWidth="1"
            />
            <line
              x1={M}
              y1={toPy(g).toFixed(2)}
              x2={SIZE - M}
              y2={toPy(g).toFixed(2)}
              stroke={g === 0 ? "#334155" : "#1e293b"}
              strokeWidth="1"
            />
            <text
              x={toPx(g).toFixed(2)}
              y={SIZE - M + 16}
              textAnchor="middle"
              fontSize="10"
              fill="#475569"
            >
              {g}
            </text>
            <text
              x={M - 8}
              y={(toPy(g) + 3).toFixed(2)}
              textAnchor="end"
              fontSize="10"
              fill="#475569"
            >
              {g}
            </text>
          </g>
        ))}
        <text x={SIZE - M} y={SIZE - 6} textAnchor="end" fontSize="10" fill="#334155">
          z1
        </text>
        <text x={10} y={M - 8} fontSize="10" fill="#334155">
          z2
        </text>

        {/* Dataset embeddings: color plus distinct marker shape per class */}
        {points?.map((pt, i) => {
          const x = toPx(pt.mu[0]);
          const y = toPy(pt.mu[1]);
          if (x < M - 4 || x > SIZE - M + 4 || y < M - 4 || y > SIZE - M + 4) {
            return null;
          }
          const color = CLASS_COLORS[pt.cls];
          if (pt.cls === 0) {
            return (
              <circle
                key={i}
                cx={x.toFixed(2)}
                cy={y.toFixed(2)}
                r="3"
                fill={color}
                fillOpacity="0.85"
              />
            );
          }
          if (pt.cls === 1) {
            return (
              <path
                key={i}
                d={`M${(x - 3.2).toFixed(2)},${y.toFixed(2)} H${(x + 3.2).toFixed(2)} M${x.toFixed(2)},${(y - 3.2).toFixed(2)} V${(y + 3.2).toFixed(2)}`}
                stroke={color}
                strokeWidth="1.6"
                strokeOpacity="0.9"
              />
            );
          }
          return (
            <circle
              key={i}
              cx={x.toFixed(2)}
              cy={y.toFixed(2)}
              r="3.2"
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              strokeOpacity="0.9"
            />
          );
        })}

        {/* A to B interpolation segment */}
        {a && b && (
          <g>
            <line
              x1={toPx(a[0]).toFixed(2)}
              y1={toPy(a[1]).toFixed(2)}
              x2={toPx(b[0]).toFixed(2)}
              y2={toPy(b[1]).toFixed(2)}
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeDasharray="5 4"
            />
            {([[a, "A"], [b, "B"]] as const).map(([p, label]) => (
              <g key={label}>
                <circle
                  cx={toPx(p[0]).toFixed(2)}
                  cy={toPy(p[1]).toFixed(2)}
                  r="9"
                  fill="#1e293b"
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                />
                <text
                  x={toPx(p[0]).toFixed(2)}
                  y={(toPy(p[1]) + 3.5).toFixed(2)}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill="#f1f5f9"
                >
                  {label}
                </text>
              </g>
            ))}
            {t !== null && (
              <path
                d={(() => {
                  const mx = toPx(a[0] + (b[0] - a[0]) * t);
                  const my = toPy(a[1] + (b[1] - a[1]) * t);
                  return `M${mx.toFixed(2)},${(my - 6).toFixed(2)} L${(mx + 6).toFixed(2)},${my.toFixed(2)} L${mx.toFixed(2)},${(my + 6).toFixed(2)} L${(mx - 6).toFixed(2)},${my.toFixed(2)} Z`;
                })()}
                fill="var(--color-success)"
                stroke="#0f172a"
                strokeWidth="1"
              />
            )}
          </g>
        )}

        {/* Decode probe crosshair */}
        {probe && !disabled && (
          <g>
            <line
              x1={(toPx(probe[0]) - 9).toFixed(2)}
              y1={toPy(probe[1]).toFixed(2)}
              x2={(toPx(probe[0]) + 9).toFixed(2)}
              y2={toPy(probe[1]).toFixed(2)}
              stroke="var(--color-accent)"
              strokeWidth="2"
            />
            <line
              x1={toPx(probe[0]).toFixed(2)}
              y1={(toPy(probe[1]) - 9).toFixed(2)}
              x2={toPx(probe[0]).toFixed(2)}
              y2={(toPy(probe[1]) + 9).toFixed(2)}
              stroke="var(--color-accent)"
              strokeWidth="2"
            />
            <circle
              cx={toPx(probe[0]).toFixed(2)}
              cy={toPy(probe[1]).toFixed(2)}
              r="5"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="1.5"
            />
          </g>
        )}

        {disabled && (
          <text
            x={SIZE / 2}
            y={SIZE / 2}
            textAnchor="middle"
            fontSize="13"
            fill="#475569"
          >
            Train the models to unlock the latent map
          </text>
        )}
      </svg>

      {/* Legend: name + marker shape + color */}
      <div className="flex flex-wrap items-center gap-4 mt-2 text-[11px] text-[#94a3b8]">
        {CLASS_NAMES.map((name, cls) => (
          <span key={name} className="flex items-center gap-1.5">
            <svg width="12" height="12" aria-hidden="true">
              {cls === 0 && <circle cx="6" cy="6" r="3.5" fill={CLASS_COLORS[0]} />}
              {cls === 1 && (
                <path
                  d="M1.5,6 H10.5 M6,1.5 V10.5"
                  stroke={CLASS_COLORS[1]}
                  strokeWidth="1.8"
                />
              )}
              {cls === 2 && (
                <circle
                  cx="6"
                  cy="6"
                  r="3.5"
                  fill="none"
                  stroke={CLASS_COLORS[2]}
                  strokeWidth="1.6"
                />
              )}
            </svg>
            {name}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <svg width="12" height="12" aria-hidden="true">
            <path d="M1,6 H11 M6,1 V11" stroke="var(--color-accent)" strokeWidth="2" />
          </svg>
          decode probe
        </span>
      </div>
    </div>
  );
}
