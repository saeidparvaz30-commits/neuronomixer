"use client";

import React, { useMemo } from "react";
import {
  HourRow,
  FitResult,
  DatetimeFeatureId,
  DATETIME_FEATURE_ORDER,
  DATETIME_FEATURE_META,
  HOURS_DAYS,
  GAIN_GATE_PCT,
} from "./types";

interface Props {
  rows: readonly HourRow[];
  features: ReadonlySet<DatetimeFeatureId>;
  onToggle: (f: DatetimeFeatureId) => void;
  baseFit: FitResult;
  curFit: FitResult;
  /** Latched: true once the 30 percent error cut has been reached. */
  gateReached: boolean;
}

const W = 720;
const H = 260;
const PAD_L = 36;
const PAD_R = 10;
const PAD_T = 14;
const PAD_B = 28;

export default function DatetimeExpander({
  rows,
  features,
  onToggle,
  baseFit,
  curFit,
  gateReached,
}: Props) {
  const yMax = useMemo(
    () => Math.max(...rows.map((r) => r.pickups), ...curFit.predictions) * 1.06,
    [rows, curFit]
  );

  const sx = (t: number) => PAD_L + (t / (rows.length - 1)) * (W - PAD_L - PAD_R);
  const sy = (v: number) => H - PAD_B - (v / yMax) * (H - PAD_T - PAD_B);

  const actualPath = rows
    .map((r, i) => `${i === 0 ? "M" : "L"}${sx(r.t).toFixed(1)},${sy(r.pickups).toFixed(1)}`)
    .join(" ");
  const predPath = rows
    .map(
      (r, i) =>
        `${i === 0 ? "M" : "L"}${sx(r.t).toFixed(1)},${sy(Math.max(0, curFit.predictions[i])).toFixed(1)}`
    )
    .join(" ");

  // Weekend day indices within the two weeks (Sat = 5, Sun = 6 of each week).
  const weekendBands = useMemo(() => {
    const bands: { x0: number; x1: number }[] = [];
    for (let d = 0; d < HOURS_DAYS; d++) {
      if (d % 7 >= 5) bands.push({ x0: d * 24, x1: (d + 1) * 24 - 1 });
    }
    return bands;
  }, []);

  const gainPct = ((baseFit.rmse - curFit.rmse) / baseFit.rmse) * 100;
  const columnCount =
    2 + DATETIME_FEATURE_ORDER.reduce(
      (s, f) => s + (features.has(f) ? DATETIME_FEATURE_META[f].columns : 0),
      0
    );

  return (
    <div className="flex flex-col gap-6">
      {/* Time series chart */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
          <p className="text-[13px] font-semibold text-white">
            Hourly bike pickups, two weeks ({rows.length} hours)
          </p>
          <div className="flex items-center gap-3 text-[10px] text-[#94a3b8]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 rounded bg-[#94a3b8]" aria-hidden="true" />
              actual
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block w-4 h-0.5 rounded bg-[var(--color-accent)]"
                aria-hidden="true"
              />
              model prediction
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-[#1e293b]" aria-hidden="true" />
              weekend
            </span>
          </div>
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={`Line chart of ${rows.length} hours of bike pickups over two weeks with the model prediction overlaid. The current model uses ${columnCount} columns and its error is RMSE ${curFit.rmse.toFixed(2)} pickups, versus ${baseFit.rmse.toFixed(2)} for the raw timestamp baseline.`}
        >
          {weekendBands.map((band, i) => (
            <rect
              key={i}
              x={sx(band.x0)}
              y={PAD_T}
              width={sx(band.x1) - sx(band.x0)}
              height={H - PAD_T - PAD_B}
              fill="#1e293b"
              opacity={0.55}
            />
          ))}
          {[0, 20, 40].map((v) =>
            v <= yMax ? (
              <g key={v}>
                <line x1={PAD_L} x2={W - PAD_R} y1={sy(v)} y2={sy(v)} stroke="#1e293b" strokeWidth={1} />
                <text x={PAD_L - 5} y={sy(v) + 3} textAnchor="end" fontSize={10} fill="#475569">
                  {v}
                </text>
              </g>
            ) : null
          )}
          {Array.from({ length: HOURS_DAYS }, (_, d) => (
            <text
              key={d}
              x={sx(d * 24 + 12)}
              y={H - PAD_B + 15}
              textAnchor="middle"
              fontSize={9}
              fill="#475569"
            >
              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"][d % 7]}
            </text>
          ))}
          <path d={actualPath} fill="none" stroke="#94a3b8" strokeWidth={1} opacity={0.65} />
          <path
            d={predPath}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
        </svg>
        <p className="text-[11px] text-[#475569] mt-2 leading-relaxed">
          The baseline model sees only hours-since-start, so its best move is a
          nearly flat line through the average. Every feature you extract below
          is information that was already inside the timestamp, waiting to be
          spelled out.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Feature toggles */}
        <div className="lg:col-span-3 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-3">
            Expand the timestamp
          </p>
          <div className="flex flex-col gap-2.5">
            {DATETIME_FEATURE_ORDER.map((f) => {
              const meta = DATETIME_FEATURE_META[f];
              const on = features.has(f);
              return (
                <label
                  key={f}
                  className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                    on ? "border-[var(--color-accent)] bg-[#1e293b]" : "border-[#1e293b] hover:border-[#334155]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => onToggle(f)}
                    className="mt-0.5"
                    style={{ accentColor: "var(--color-accent)" }}
                  />
                  <span>
                    <span className={`block text-[12px] font-semibold ${on ? "text-white" : "text-[#94a3b8]"}`}>
                      {meta.label}{" "}
                      <span className="font-normal text-[10px] text-[#475569]">
                        (+{meta.columns} column{meta.columns === 1 ? "" : "s"})
                      </span>
                    </span>
                    <span className="block text-[10px] text-[#475569] leading-relaxed mt-0.5">
                      {meta.tagline}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          <p className="text-[10px] text-[#475569] mt-3 leading-relaxed">
            Watch the weekday-as-a-number column: it barely moves the error
            once the weekend flag is in, because demand does not rise or fall
            steadily from Monday to Sunday. Extraction is a craft call too, and
            the fit, not the feature name, is the judge.
          </p>
        </div>

        {/* Stats */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                Raw timestamp RMSE
              </p>
              <p className="text-2xl font-black font-mono text-[#f1f5f9]">
                {baseFit.rmse.toFixed(2)}
              </p>
              <p className="text-[10px] text-[#475569] mt-1">model: intercept + t</p>
            </div>
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                Your model RMSE
              </p>
              <p className="text-2xl font-black font-mono text-[#f1f5f9]">
                {curFit.rmse.toFixed(2)}
              </p>
              <p className="text-[10px] text-[#475569] mt-1">{columnCount} columns</p>
            </div>
          </div>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
            <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
              Predictive gain vs raw timestamp
            </p>
            <p
              className="text-3xl font-black font-mono"
              style={{
                color:
                  gainPct >= GAIN_GATE_PCT
                    ? "var(--color-success)"
                    : gainPct > 0
                      ? "var(--color-warning)"
                      : "#475569",
              }}
            >
              {gainPct >= 0 ? "" : "-"}
              {Math.abs(gainPct).toFixed(1)}%
            </p>
            <p className="text-[10px] text-[#475569] mt-1">
              {gateReached
                ? `target reached: error cut by at least ${GAIN_GATE_PCT}%`
                : `goal: cut the error by at least ${GAIN_GATE_PCT}%`}
            </p>
          </div>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
            <p className="text-[11px] text-[#94a3b8] leading-relaxed">
              R squared moves from {baseFit.r2.toFixed(3)} to{" "}
              {curFit.r2.toFixed(3)} with the current feature set. Same rows,
              same target, same linear model. The only thing that changed is
              how much of the timestamp you let the model read.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
