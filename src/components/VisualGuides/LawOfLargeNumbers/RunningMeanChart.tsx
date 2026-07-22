"use client";

import React from "react";
import { fmt } from "./types";

const W = 640;
const PAD = { l: 64, r: 18, t: 14, b: 54 };

/** Opacity ramp: oldest run faintest, newest run fully opaque. */
const RUN_OPACITY = [0.25, 0.35, 0.5, 0.7, 1];

interface Props {
  /** Running-mean series per run, oldest first; last entry is the active run. */
  series: number[][];
  color: string;
  /** Population mean to mark, or null when undefined (Cauchy: mark median 0). */
  trueMean: number | null;
  /** Percentile-clamp the y-axis so heavy-tail spikes stay readable. */
  clampAxis: boolean;
  distLabel: string;
  height?: number;
}

function sampleIndices(len: number): number[] {
  const S = 400;
  const logMax = Math.log10(Math.max(len, 1));
  const set = new Set<number>();
  for (let k = 0; k <= S; k++) {
    const n = Math.round(Math.pow(10, (k / S) * logMax));
    set.add(Math.min(len, Math.max(1, n)));
  }
  set.add(1);
  set.add(len);
  return [...set].sort((a, b) => a - b);
}

export default function RunningMeanChart({
  series,
  color,
  trueMean,
  clampAxis,
  distLabel,
  height = 280,
}: Props) {
  const H = height;
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const nonEmpty = series.filter((s) => s.length > 0);
  const maxN = nonEmpty.length
    ? Math.max(...nonEmpty.map((s) => s.length))
    : 0;

  if (maxN === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-[#334155] text-[12px] text-[#475569]"
        style={{ height: H }}
      >
        No draws yet. Press a Draw button to start sampling.
      </div>
    );
  }

  const xLogMax = Math.log10(Math.max(maxN, 10));
  const xPos = (n: number) =>
    PAD.l + (Math.log10(Math.max(n, 1)) / xLogMax) * innerW;

  // ── Y domain ──────────────────────────────────────────────────────────────
  let yMin = Infinity;
  let yMax = -Infinity;
  let clipped = 0;

  if (clampAxis) {
    const all: number[] = [];
    for (const s of nonEmpty) for (const v of s) all.push(v);
    all.sort((a, b) => a - b);
    const q = (p: number) =>
      all[Math.min(all.length - 1, Math.max(0, Math.floor(p * (all.length - 1))))];
    yMin = Math.min(q(0.02), 0);
    yMax = Math.max(q(0.98), 0);
    if (yMax - yMin < 1e-9) {
      yMin -= 1;
      yMax += 1;
    }
    const pad = (yMax - yMin) * 0.1;
    yMin -= pad;
    yMax += pad;
    for (const v of all) if (v < yMin || v > yMax) clipped++;
  } else {
    for (const s of nonEmpty) {
      for (const v of s) {
        if (v < yMin) yMin = v;
        if (v > yMax) yMax = v;
      }
    }
    if (trueMean !== null) {
      yMin = Math.min(yMin, trueMean);
      yMax = Math.max(yMax, trueMean);
    }
    if (yMax - yMin < 1e-9) {
      yMin -= 1;
      yMax += 1;
    }
    const pad = (yMax - yMin) * 0.1;
    yMin -= pad;
    yMax += pad;
  }

  const yPos = (v: number) => {
    const c = Math.min(yMax, Math.max(yMin, v));
    return PAD.t + ((yMax - c) / (yMax - yMin)) * innerH;
  };

  // ── Ticks ─────────────────────────────────────────────────────────────────
  const xTicks: number[] = [];
  for (let p = 1; p <= maxN; p *= 10) xTicks.push(p);
  const lastPow = xTicks[xTicks.length - 1];
  if (maxN > lastPow * 1.3) xTicks.push(maxN);

  const yTicks = Array.from(
    { length: 5 },
    (_, i) => yMin + (i * (yMax - yMin)) / 4
  );

  // ── Paths ─────────────────────────────────────────────────────────────────
  const paths = nonEmpty.map((s) => {
    const idx = sampleIndices(s.length);
    return idx
      .map(
        (n, i) => `${i === 0 ? "M" : "L"} ${xPos(n).toFixed(2)} ${yPos(s[n - 1]).toFixed(2)}`
      )
      .join(" ");
  });

  const refY = trueMean !== null ? yPos(trueMean) : yPos(0);
  const active = nonEmpty[nonEmpty.length - 1];
  const ariaLabel =
    `Running mean chart for ${distLabel}. ${nonEmpty.length} run${nonEmpty.length === 1 ? "" : "s"} shown on a logarithmic x-axis of draw count. ` +
    `Latest run: ${active.length} draws, running mean ${fmt(active[active.length - 1])}. ` +
    (trueMean !== null
      ? `True mean ${fmt(trueMean)} is marked with a dashed line.`
      : "This distribution has no defined mean; the dashed line marks the median 0.");

  const opacities = RUN_OPACITY.slice(RUN_OPACITY.length - nonEmpty.length);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={ariaLabel} style={{ display: "block" }}>
        <rect
          x={PAD.l}
          y={PAD.t}
          width={innerW}
          height={innerH}
          fill="#0f172a"
          stroke="#1e293b"
          strokeWidth={1}
        />

        {yTicks.map((t, i) => (
          <g key={`y-${i}`}>
            <line
              x1={PAD.l}
              y1={yPos(t)}
              x2={W - PAD.r}
              y2={yPos(t)}
              stroke="#1e293b"
              strokeWidth={1}
            />
            <text
              x={PAD.l - 6}
              y={yPos(t) + 7}
              textAnchor="end"
              fill="#475569"
              fontSize={20}
            >
              {fmt(t, Math.abs(yMax - yMin) >= 20 ? 0 : 2)}
            </text>
          </g>
        ))}

        {xTicks.map((n) => (
          <g key={`x-${n}`}>
            <line
              x1={xPos(n)}
              y1={PAD.t}
              x2={xPos(n)}
              y2={H - PAD.b}
              stroke="#1e293b"
              strokeWidth={1}
            />
            <text
              x={xPos(n)}
              y={H - PAD.b + 22}
              textAnchor="middle"
              fill="#475569"
              fontSize={20}
            >
              {n >= 1000 ? `${n / 1000}k` : n}
            </text>
          </g>
        ))}
        <text
          x={PAD.l + innerW / 2}
          y={H - 6}
          textAnchor="middle"
          fill="#475569"
          fontSize={20}
        >
          n = number of draws (log scale)
        </text>

        {/* Reference line: true mean, or median 0 for Cauchy */}
        <line
          x1={PAD.l}
          y1={refY}
          x2={W - PAD.r}
          y2={refY}
          stroke={trueMean !== null ? "var(--color-success)" : "#475569"}
          strokeWidth={1.5}
          strokeDasharray="5,4"
        />
        <text
          x={W - PAD.r - 4}
          y={refY - 5}
          textAnchor="end"
          fill={trueMean !== null ? "var(--color-success)" : "#94a3b8"}
          fontSize={20}
          fontWeight={600}
        >
          {trueMean !== null
            ? `true mean = ${fmt(trueMean)}`
            : "median 0 (mean undefined)"}
        </text>

        {/* Axes */}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="#334155" strokeWidth={1.5} />
        <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="#334155" strokeWidth={1.5} />

        {/* One running-mean path per run */}
        {paths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={i === paths.length - 1 ? 2.2 : 1.6}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={opacities[i]}
          />
        ))}
      </svg>

      {clipped > 0 && (
        <p className="mt-2 text-[11px]" style={{ color: "var(--color-warning)" }}>
          Axis clamped for readability: {clipped} running-mean point{clipped === 1 ? "" : "s"} spike
          beyond the visible range and are drawn at the edge.
        </p>
      )}

      {/* Text equivalent of the chart, per run */}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {nonEmpty.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
            <span
              className="inline-block w-3 h-[3px] rounded-full"
              style={{ background: color, opacity: opacities[i] }}
            />
            <span>
              Run {i + 1}: n = {s.length.toLocaleString()}, mean = {fmt(s[s.length - 1])}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
