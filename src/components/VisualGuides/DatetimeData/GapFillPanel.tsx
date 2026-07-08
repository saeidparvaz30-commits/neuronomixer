"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  FillPolicy,
  GAP1_END,
  GAP1_START,
  GAP2_END,
  GAP2_START,
  HOUR_MS,
  READINGS,
  READINGS_END,
  READINGS_START,
  applyFillPolicy,
  applyGaps,
  fmtDate,
  partsFromMs,
  resample,
  utcMs,
} from "./timeModel";

type Props = {
  gapOn: boolean;
  onToggleGap: () => void;
  policy: FillPolicy;
  onPolicyChange: (p: FillPolicy) => void;
  policiesCompared: ReadonlySet<FillPolicy>;
};

const POLICIES: Array<{ id: FillPolicy; label: string }> = [
  { id: "nan", label: "Leave missing" },
  { id: "ffill", label: "Forward-fill" },
  { id: "zero", label: "Zero-fill" },
];

const BUCKET_MS = 6 * HOUR_MS;
const W = 720;
const H = 210;
const M = { top: 14, right: 10, bottom: 24, left: 40 };

export default function GapFillPanel({
  gapOn,
  onToggleGap,
  policy,
  onPolicyChange,
  policiesCompared,
}: Props) {
  const readings = useMemo(() => (gapOn ? applyGaps(READINGS) : [...READINGS]), [gapOn]);
  const grid = useMemo(() => resample(readings, BUCKET_MS), [readings]);
  const filled = useMemo(() => applyFillPolicy(grid, policy), [grid, policy]);

  const missing = grid.filter((b) => b.mean === null).length;
  const meanNan = useMemo(() => applyFillPolicy(grid, "nan").mean, [grid]);
  const meanFfill = useMemo(() => applyFillPolicy(grid, "ffill").mean, [grid]);
  const meanZero = useMemo(() => applyFillPolicy(grid, "zero").mean, [grid]);
  const zeroDropPct = meanNan > 0 ? ((meanNan - meanZero) / meanNan) * 100 : 0;

  const yMax =
    Math.ceil(Math.max(...grid.map((b) => b.mean ?? 0)) / 100) * 100 || 100;
  const innerW = W - M.left - M.right;
  const innerH = H - M.top - M.bottom;
  const span = READINGS_END - READINGS_START;
  const xOf = (t: number) => M.left + ((t - READINGS_START) / span) * innerW;
  const yOf = (v: number) => M.top + innerH - (v / yMax) * innerH;
  const xMid = (i: number) => xOf(grid[i].start + BUCKET_MS / 2);

  // Build polyline segments: break the line at nulls (nan policy)
  const segments: string[] = [];
  let current: string[] = [];
  filled.values.forEach((v, i) => {
    if (v === null) {
      if (current.length > 0) segments.push(current.join(" "));
      current = [];
    } else {
      current.push(`${xMid(i).toFixed(1)},${yOf(v).toFixed(1)}`);
    }
  });
  if (current.length > 0) segments.push(current.join(" "));

  const fabricatedSet = new Set(filled.filledIdx);
  const ticks = [utcMs(2024, 3, 25), utcMs(2024, 3, 29), utcMs(2024, 4, 1), utcMs(2024, 4, 5)];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          onClick={onToggleGap}
          aria-pressed={gapOn}
          className={`px-4 py-2 rounded-xl text-[12px] font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
            gapOn
              ? "border-[var(--color-warning)] text-[var(--color-warning)]"
              : "border-[#1e293b] text-[#94a3b8] hover:text-white"
          }`}
        >
          {gapOn ? "Collector outages: ON (2 windows dropped)" : "Inject collector outages"}
        </button>

        <div
          role="radiogroup"
          aria-label="Gap fill policy"
          className="inline-flex rounded-xl border border-[#1e293b] bg-[#0f172a] p-1 gap-1"
        >
          {POLICIES.map((p) => {
            const isActive = p.id === policy;
            const seen = policiesCompared.has(p.id);
            return (
              <button
                key={p.id}
                role="radio"
                aria-checked={isActive}
                onClick={() => onPolicyChange(p.id)}
                className={`relative px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                  isActive ? "text-[#0a0e1a]" : "text-[#94a3b8] hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="dt-fill-pill"
                    className="absolute inset-0 rounded-lg bg-[var(--color-accent)]"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative">
                  {p.label}
                  {seen && gapOn ? " ✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-3 overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto min-w-[560px]"
          role="img"
          aria-label={`Line chart of 6-hour mean requests per minute. ${
            gapOn
              ? `${missing} of ${grid.length} buckets are missing; the ${
                  policy === "nan"
                    ? "line breaks over the gaps"
                    : policy === "ffill"
                      ? "gaps are filled with the last observed value"
                      : "gaps are filled with zeros"
                }.`
              : "No gaps injected yet; all buckets contain data."
          }`}
        >
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line
                x1={M.left}
                x2={W - M.right}
                y1={yOf(f * yMax)}
                y2={yOf(f * yMax)}
                stroke="#1e293b"
                strokeWidth={1}
              />
              <text x={M.left - 6} y={yOf(f * yMax) + 3} textAnchor="end" fontSize={9} fill="#475569">
                {Math.round(f * yMax)}
              </text>
            </g>
          ))}
          {ticks.map((t) => (
            <text key={t} x={xOf(t)} y={H - 8} textAnchor="middle" fontSize={9} fill="#475569">
              {fmtDate(partsFromMs(t))}
            </text>
          ))}
          {/* outage windows */}
          {gapOn &&
            [
              [GAP1_START, GAP1_END],
              [GAP2_START, GAP2_END],
            ].map(([s, e]) => (
              <rect
                key={s}
                x={xOf(s)}
                y={M.top}
                width={xOf(e) - xOf(s)}
                height={innerH}
                fill="#1e293b"
                opacity={0.5}
              />
            ))}
          {/* series */}
          {segments.map((pts, i) => (
            <polyline
              key={i}
              points={pts}
              fill="none"
              stroke="#3bb4a4"
              strokeWidth={1.5}
            />
          ))}
          {/* fabricated points highlighted */}
          {filled.values.map((v, i) => {
            if (v === null) return null;
            if (!fabricatedSet.has(i)) return null;
            return (
              <circle
                key={i}
                cx={xMid(i)}
                cy={yOf(v)}
                r={3}
                fill={policy === "zero" ? "#ef4444" : "#a855f7"}
              />
            );
          })}
        </svg>
        <p className="text-[10px] text-[#475569] mt-1 px-1">
          {gapOn
            ? policy === "nan"
              ? "Broken line = honestly missing. Shaded bands mark the two dropped windows (20 h and 36 h)."
              : policy === "ffill"
                ? "Purple dots are fabricated buckets: the last pre-gap value repeated as if the world froze."
                : "Red dots are fabricated zeros: the chart now claims traffic collapsed during the outage."
            : "Toggle the outages to drop readings from two windows, then compare fill policies."}
        </p>
      </div>

      {/* Consequences, computed */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        <div className={`rounded-xl border p-4 bg-[#0f172a] ${policy === "nan" && gapOn ? "border-[var(--color-accent)]" : "border-[#1e293b]"}`}>
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">Leave missing</p>
          <p className="text-xl font-black font-mono text-white">{gapOn ? meanNan.toFixed(1) : "-"}</p>
          <p className="text-[10px] text-[#475569] mt-1">
            {gapOn
              ? `mean over the ${grid.length - missing} observed buckets; ${missing} buckets stay honestly empty`
              : "inject the outages to compute"}
          </p>
        </div>
        <div className={`rounded-xl border p-4 bg-[#0f172a] ${policy === "ffill" && gapOn ? "border-[var(--color-accent)]" : "border-[#1e293b]"}`}>
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">Forward-fill</p>
          <p className="text-xl font-black font-mono text-white">{gapOn ? meanFfill.toFixed(1) : "-"}</p>
          <p className="text-[10px] text-[#475569] mt-1">
            {gapOn
              ? `fabricates ${missing} flat buckets from the last pre-gap value; kills the daily cycle inside the gaps`
              : "inject the outages to compute"}
          </p>
        </div>
        <div className={`rounded-xl border p-4 bg-[#0f172a] ${policy === "zero" && gapOn ? "border-[var(--color-accent)]" : "border-[#1e293b]"}`}>
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">Zero-fill</p>
          <p className="text-xl font-black font-mono" style={{ color: gapOn ? "var(--color-warning)" : "#f1f5f9" }}>
            {gapOn ? meanZero.toFixed(1) : "-"}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            {gapOn
              ? `drags the 14-day mean down ${zeroDropPct.toFixed(1)}% by claiming no-data means zero traffic`
              : "inject the outages to compute"}
          </p>
        </div>
      </div>

      <p className="text-[11px] text-[#94a3b8] leading-relaxed mt-4">
        There is no neutral option. Leaving NaN is honest but breaks downstream code that
        cannot handle missing values. Forward-fill is fine for slow-moving state (a
        thermostat setting) and wrong for flows like request rates. Zero-fill is correct only
        when absence really means zero, for example &quot;no sales recorded&quot; in a complete ledger.
        The failure mode is not picking the wrong policy; it is letting a library default
        pick it for you silently.
      </p>
    </div>
  );
}
