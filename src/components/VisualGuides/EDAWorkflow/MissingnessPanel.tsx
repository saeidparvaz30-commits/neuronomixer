"use client";

import React from "react";
import { ROWS, ALL_KEYS, SENTINEL, isMissing, missingCount, sentinelCount } from "./data";

interface Props {
  sentinelOn: boolean;
  onToggleSentinel: () => void;
}

const CELL_H = 3;
const COL_W = 44;
const GAP = 8;

export default function MissingnessPanel({ sentinelOn, onToggleSentinel }: Props) {
  const nSentinels = sentinelCount(ROWS);
  const width = ALL_KEYS.length * (COL_W + GAP) - GAP;
  const height = ROWS.length * CELL_H;

  return (
    <div>
      <p className="text-[13px] font-semibold text-white mb-2">
        Step 2: What is missing, and what is pretending not to be?
      </p>
      <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
        A missingness map marks every null cell. But nulls are only the honest kind
        of missing. Many pipelines encode a failed reading as a numeric code such as{" "}
        <span className="font-mono text-[#93c5fd]">{SENTINEL}</span>, and a naive
        missingness scan happily counts those as valid data. You saw a humidity
        minimum of {SENTINEL} in step 1. Tell the scan to treat {SENTINEL} as a
        sentinel and watch the map change.
      </p>

      <button
        onClick={onToggleSentinel}
        aria-pressed={sentinelOn}
        className="mb-4 px-4 py-2 rounded-xl text-[12px] font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        style={{
          borderColor: sentinelOn ? "var(--color-warning)" : "#334155",
          color: sentinelOn ? "var(--color-warning)" : "#f1f5f9",
          background: sentinelOn ? "rgba(249, 115, 22, 0.08)" : "transparent",
        }}
      >
        {sentinelOn ? "✓ " : ""}Treat {SENTINEL} as a sentinel (count it as missing)
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4 overflow-x-auto">
          <p className="text-[11px] text-[#475569] mb-2">
            Missingness map: one thin row per record, orange = missing
          </p>
          <svg
            viewBox={`0 0 ${width} ${height + 16}`}
            width={width}
            height={height + 16}
            role="img"
            aria-label={`Missingness map of ${ROWS.length} rows by ${ALL_KEYS.length} columns. ${
              sentinelOn
                ? `With ${SENTINEL} treated as missing, humidity_pct shows ${missingCount(
                    ROWS,
                    "humidity_pct",
                    true
                  )} missing cells and temp_c shows ${missingCount(ROWS, "temp_c", true)}.`
                : `Only temp_c shows missing cells: ${missingCount(ROWS, "temp_c", false)}.`
            }`}
          >
            {ALL_KEYS.map((key, ci) => {
              const x = ci * (COL_W + GAP);
              return (
                <g key={key}>
                  <rect
                    x={x}
                    y={16}
                    width={COL_W}
                    height={height}
                    fill="#1e293b"
                    rx={2}
                  />
                  {ROWS.map((r, ri) =>
                    isMissing(r, key, sentinelOn) ? (
                      <rect
                        key={ri}
                        x={x}
                        y={16 + ri * CELL_H}
                        width={COL_W}
                        height={CELL_H}
                        fill="var(--color-warning)"
                      />
                    ) : null
                  )}
                  <text
                    x={x + COL_W / 2}
                    y={10}
                    textAnchor="middle"
                    fill="#475569"
                    fontSize={7}
                    fontFamily="monospace"
                  >
                    {key.length > 8 ? key.slice(0, 8) : key}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div>
          <div className="overflow-x-auto rounded-xl border border-[#1e293b]">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#1e293b] text-left text-[#94a3b8]">
                  <th className="px-3 py-2 font-semibold">column</th>
                  <th className="px-3 py-2 font-semibold">missing</th>
                  <th className="px-3 py-2 font-semibold">%</th>
                </tr>
              </thead>
              <tbody>
                {ALL_KEYS.map((key, i) => {
                  const m = missingCount(ROWS, key, sentinelOn);
                  const changed =
                    sentinelOn && m !== missingCount(ROWS, key, false);
                  return (
                    <tr
                      key={key}
                      className={i % 2 === 0 ? "bg-[#0f172a]" : "bg-[#162032]"}
                    >
                      <td className="px-3 py-2 font-mono text-[#f1f5f9]">{key}</td>
                      <td
                        className="px-3 py-2 font-mono font-bold"
                        style={{
                          color: changed
                            ? "var(--color-warning)"
                            : m > 0
                              ? "#f1f5f9"
                              : "#475569",
                        }}
                      >
                        {m}
                        {changed ? " ↑" : ""}
                      </td>
                      <td className="px-3 py-2 font-mono text-[#94a3b8]">
                        {((100 * m) / ROWS.length).toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-[12px] leading-relaxed mt-3 text-[#94a3b8]">
            {sentinelOn ? (
              <>
                With the sentinel rule on, {nSentinels} humidity readings that were
                counting as valid data are now correctly marked missing. Every
                downstream panel in this guide (distributions, correlations)
                recomputes with them excluded. That is the loop: one finding upstream
                changes every answer downstream.
              </>
            ) : (
              <>
                humidity_pct reports zero missing values, yet step 1 showed its
                minimum is {SENTINEL}. When a column looks complete but contains
                impossible values, suspect a sentinel code before you trust any
                statistic computed from it.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
