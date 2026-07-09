"use client";

import React, { useMemo } from "react";
import { EvaluatedModel, PINK, TEAL, DIM, formatUsd } from "./types";

type Props = {
  rows: EvaluatedModel[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const W = 680;
const H = 420;
const PAD = { left: 56, right: 24, top: 28, bottom: 52 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;

const TICK_CANDIDATES = [0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500];

/** Chart geometry only. Every plotted value comes from evaluate() in types.ts. */
export default function TradeoffChart({ rows, selectedId, onSelect }: Props) {
  const { xFor, yFor, ticks } = useMemo(() => {
    const costs = rows.map((r) => Math.max(r.blended, 0.01));
    const rawLo = Math.min(...costs);
    const rawHi = Math.max(...costs);
    const lo = Math.max(rawLo * 0.7, 0.005);
    const hi = rawHi <= lo ? lo * 10 : rawHi * 1.4;
    const logLo = Math.log10(lo);
    const logHi = Math.log10(hi);
    const span = logHi - logLo || 1;
    const xF = (cost: number) =>
      PAD.left + ((Math.log10(Math.max(cost, 0.01)) - logLo) / span) * INNER_W;
    const yF = (cap: number) =>
      PAD.top + (1 - Math.min(Math.max(cap, 0), 100) / 100) * INNER_H;
    return {
      xFor: xF,
      yFor: yF,
      ticks: TICK_CANDIDATES.filter((t) => t >= lo && t <= hi),
    };
  }, [rows]);

  const frontierRows = useMemo(
    () => rows.filter((r) => r.onFrontier).sort((a, b) => a.blended - b.blended),
    [rows]
  );
  const passRows = rows.filter((r) => r.pass && !r.onFrontier);
  const failRows = rows.filter((r) => !r.pass);

  const frontierPath = frontierRows
    .map(
      (r, i) =>
        `${i === 0 ? "M" : "L"} ${xFor(r.blended).toFixed(1)} ${yFor(
          r.model.capability
        ).toFixed(1)}`
    )
    .join(" ");

  const chartSummary =
    frontierRows.length > 0
      ? `Cost versus capability scatter plot. ${frontierRows.length} models are on the Pareto frontier: ${frontierRows
          .map((r) => r.model.name)
          .join(", ")}. ${failRows.length} models fail the current constraints. The table below this chart carries the same information and is keyboard operable.`
      : "Cost versus capability scatter plot. No model passes the current constraints; loosen a constraint to repopulate the frontier. The table below this chart carries the same information.";

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={chartSummary}
      >
        {/* Y grid + ticks */}
        {[0, 25, 50, 75, 100].map((cap) => (
          <g key={cap}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yFor(cap)}
              y2={yFor(cap)}
              stroke="#1e293b"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={yFor(cap) + 3.5}
              textAnchor="end"
              fontSize={10}
              fill="#475569"
              fontFamily="monospace"
            >
              {cap}
            </text>
          </g>
        ))}

        {/* X ticks (log scale) */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={xFor(t)}
              x2={xFor(t)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="#1e293b"
              strokeWidth={1}
              strokeDasharray="2 4"
            />
            <text
              x={xFor(t)}
              y={H - PAD.bottom + 16}
              textAnchor="middle"
              fontSize={10}
              fill="#475569"
              fontFamily="monospace"
            >
              {formatUsd(t)}
            </text>
          </g>
        ))}

        {/* Axis labels */}
        <text
          x={PAD.left + INNER_W / 2}
          y={H - 8}
          textAnchor="middle"
          fontSize={11}
          fill="#94a3b8"
        >
          blended price per Mtok, log scale
        </text>
        <text
          x={14}
          y={PAD.top + INNER_H / 2}
          textAnchor="middle"
          fontSize={11}
          fill="#94a3b8"
          transform={`rotate(-90 14 ${PAD.top + INNER_H / 2})`}
        >
          capability index
        </text>

        {/* Frontier line */}
        {frontierRows.length > 1 && (
          <path
            d={frontierPath}
            fill="none"
            stroke={PINK}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            opacity={0.7}
          />
        )}

        {/* Failing models: dimmed dot with an x mark (shape, not just color) */}
        {failRows.map((r) => {
          const cx = xFor(r.blended);
          const cy = yFor(r.model.capability);
          return (
            <g
              key={r.model.id}
              onClick={() => onSelect(r.model.id)}
              className="cursor-pointer"
              aria-hidden="true"
            >
              <circle cx={cx} cy={cy} r={5} fill={DIM} opacity={0.35} />
              <line
                x1={cx - 4}
                y1={cy - 4}
                x2={cx + 4}
                y2={cy + 4}
                stroke={DIM}
                strokeWidth={1.5}
              />
              <line
                x1={cx - 4}
                y1={cy + 4}
                x2={cx + 4}
                y2={cy - 4}
                stroke={DIM}
                strokeWidth={1.5}
              />
              <text
                x={cx}
                y={cy + 16}
                textAnchor="middle"
                fontSize={9}
                fill={DIM}
              >
                {r.model.short}
              </text>
            </g>
          );
        })}

        {/* Passing, non-frontier */}
        {passRows.map((r) => {
          const cx = xFor(r.blended);
          const cy = yFor(r.model.capability);
          return (
            <g
              key={r.model.id}
              onClick={() => onSelect(r.model.id)}
              className="cursor-pointer"
              aria-hidden="true"
            >
              <circle cx={cx} cy={cy} r={5.5} fill={TEAL} opacity={0.9} />
              <text
                x={cx}
                y={cy + 17}
                textAnchor="middle"
                fontSize={9}
                fill="#94a3b8"
              >
                {r.model.short}
              </text>
            </g>
          );
        })}

        {/* Frontier models: larger pink dot + name above */}
        {frontierRows.map((r) => {
          const cx = xFor(r.blended);
          const cy = yFor(r.model.capability);
          return (
            <g
              key={r.model.id}
              onClick={() => onSelect(r.model.id)}
              className="cursor-pointer"
              aria-hidden="true"
            >
              <circle cx={cx} cy={cy} r={7} fill={PINK} />
              <text
                x={cx}
                y={cy - 12}
                textAnchor="middle"
                fontSize={9.5}
                fontWeight={700}
                fill={PINK}
              >
                {r.model.short}
              </text>
            </g>
          );
        })}

        {/* Selection ring */}
        {rows
          .filter((r) => r.model.id === selectedId)
          .map((r) => (
            <circle
              key={r.model.id}
              cx={xFor(r.blended)}
              cy={yFor(r.model.capability)}
              r={11}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={2}
            />
          ))}
      </svg>

      {/* Legend: shape + text, never color alone */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-2">
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ background: PINK }}
            aria-hidden="true"
          />
          Frontier (large dot, dashed line)
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ background: TEAL }}
            aria-hidden="true"
          />
          Passes but dominated
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <span className="text-[13px] leading-none" style={{ color: DIM }} aria-hidden="true">
            &times;
          </span>
          Fails a constraint
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <span
            className="inline-block w-3 h-3 rounded-full border-2"
            style={{ borderColor: "var(--color-accent)" }}
            aria-hidden="true"
          />
          Your selection
        </span>
      </div>
    </div>
  );
}
