"use client";

import React from "react";
import Link from "next/link";
import {
  ROWS,
  NumKey,
  NUM_KEYS,
  numericValues,
  histogram,
  mean,
  skewness,
} from "./data";

interface Props {
  sentinelOn: boolean;
  logCols: ReadonlySet<NumKey>;
  onSetScale: (col: NumKey, log: boolean) => void;
}

const SERIES_COLOR: Record<NumKey, string> = {
  temp_c: "#1e5d8a",
  humidity_pct: "#3bb4a4",
  voc_ppb: "#a855f7",
  battery_v: "#ec4899",
};

const BINS = 16;
const W = 280;
const H = 96;

export default function DistributionsPanel({ sentinelOn, logCols, onSetScale }: Props) {
  return (
    <div>
      <p className="text-[13px] font-semibold text-white mb-2">
        Step 3: What shape is each column?
      </p>
      <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
        Small multiples: one histogram per numeric column, same treatment, so your
        eye can compare shapes. Most sensor quantities look roughly bell-shaped. One
        of these columns does not: its mass piles up on the left with a long right
        tail, and on a linear axis you cannot see its structure at all. Find it and
        switch that card to a log scale. If the log view turns a smeared tail into a
        clean bell, the column is better summarized (and often better modeled) on the
        log scale. For the full story on reading shapes, skew, and tails, the{" "}
        <Link
          href="/visual-guides/data-distributions-applied"
          className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
        >
          distributions deep dive
        </Link>{" "}
        picks up exactly where this step leaves off.
      </p>
      {!sentinelOn && (
        <p className="text-[11px] text-[#475569] leading-relaxed mb-4">
          Heads up: you have not flagged the {`-999`} sentinel yet (step 2), so the
          humidity histogram still includes those values and its axis is stretched
          to absurdity. That distortion is itself a finding.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {NUM_KEYS.map((key) => {
          const isLog = logCols.has(key);
          const raw = numericValues(ROWS, key, sentinelOn);
          const excluded = isLog ? raw.filter((v) => v <= 0).length : 0;
          const values = isLog
            ? raw.filter((v) => v > 0).map((v) => Math.log10(v))
            : raw;
          const hist = histogram(values, BINS);
          const mu = mean(values);
          const g1 = skewness(values);
          const color = SERIES_COLOR[key];
          const barW = W / hist.counts.length;

          return (
            <div key={key} className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4">
              <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                <p className="text-[12px] font-mono font-semibold text-[#f1f5f9]">
                  {key}
                </p>
                <div
                  role="radiogroup"
                  aria-label={`Axis scale for ${key}`}
                  className="inline-flex rounded-lg border border-[#1e293b] p-0.5 gap-0.5"
                >
                  {([false, true] as const).map((log) => (
                    <button
                      key={String(log)}
                      role="radio"
                      aria-checked={isLog === log}
                      onClick={() => onSetScale(key, log)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                        isLog === log
                          ? "bg-[var(--color-accent)] text-[#0a0e1a]"
                          : "text-[#94a3b8] hover:text-white"
                      }`}
                    >
                      {log ? "Log" : "Linear"}
                    </button>
                  ))}
                </div>
              </div>

              <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full h-auto"
                role="img"
                aria-label={`Histogram of ${key} on a ${isLog ? "log10" : "linear"} scale. n = ${
                  hist.n
                }, mean ${mu.toFixed(2)}, skewness ${Number.isNaN(g1) ? "undefined" : g1.toFixed(2)}.`}
              >
                {hist.counts.map((c, i) => {
                  const h = hist.maxCount > 0 ? (c / hist.maxCount) * (H - 8) : 0;
                  return (
                    <rect
                      key={i}
                      x={i * barW + 1}
                      y={H - h}
                      width={Math.max(barW - 2, 1)}
                      height={h}
                      fill={color}
                      rx={1.5}
                    />
                  );
                })}
              </svg>
              <div className="flex justify-between text-[10px] font-mono text-[#475569] mt-1">
                <span>{hist.edges[0].toFixed(isLog ? 2 : 1)}</span>
                <span>{hist.edges[hist.edges.length - 1].toFixed(isLog ? 2 : 1)}</span>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] font-mono">
                <span className="text-[#475569]">
                  n <span className="text-[#94a3b8]">{hist.n}</span>
                </span>
                <span className="text-[#475569]">
                  mean <span className="text-[#94a3b8]">{mu.toFixed(2)}</span>
                </span>
                <span className="text-[#475569]">
                  skew{" "}
                  <span
                    style={{
                      color:
                        !Number.isNaN(g1) && Math.abs(g1) >= 1
                          ? "var(--color-warning)"
                          : "#94a3b8",
                    }}
                  >
                    {Number.isNaN(g1) ? "n/a" : g1.toFixed(2)}
                  </span>
                </span>
                {isLog && (
                  <span className="text-[#475569]">
                    scale <span className="text-[#94a3b8]">log10</span>
                  </span>
                )}
                {excluded > 0 && (
                  <span className="text-[var(--color-warning)]">
                    {excluded} non-positive value{excluded === 1 ? "" : "s"} excluded
                    from log view
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-[#475569] leading-relaxed mt-4">
        The skew statistic shown is the moment coefficient of skewness, computed on
        the values exactly as displayed: near 0 means roughly symmetric, above 1
        means strongly right-skewed. A column whose skew collapses toward 0 under
        the log transform is the classic signature of multiplicative, lognormal-like
        data.
      </p>
    </div>
  );
}
