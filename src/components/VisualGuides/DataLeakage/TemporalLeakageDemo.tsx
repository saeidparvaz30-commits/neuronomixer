"use client";

import React from "react";
import type { SplitKind, TemporalDemoResult } from "./types";
import { TREND_MIN, TREND_MAX } from "./types";
import PipelineToggle from "./PipelineToggle";
import StatCompare from "./StatCompare";

interface Props {
  result: TemporalDemoResult;
  split: SplitKind;
  onSplitChange: (s: SplitKind) => void;
  trend: number;
  onTrendChange: (v: number) => void;
}

const W = 560;
const H = 280;
const M = { l: 46, r: 16, t: 16, b: 48 };

export default function TemporalLeakageDemo({ result, split, onSplitChange, trend, onTrendChange }: Props) {
  const active = result[split];
  const n = result.series.length;
  const valSet = new Set(active.valIdx);
  const splitColor = split === "random" ? "var(--color-warning)" : "var(--color-success)";

  const allYs = [...result.series, ...active.predictions];
  const yLo = Math.min(...allYs);
  const yHi = Math.max(...allYs);
  const yPad = (yHi - yLo || 1) * 0.08;
  const yMin = yLo - yPad;
  const yMax = yHi + yPad;

  const sx = (t: number) => M.l + (t / (n - 1)) * (W - M.l - M.r);
  const sy = (v: number) => H - M.b - ((v - yMin) / (yMax - yMin)) * (H - M.t - M.b);

  const linePoints = result.series.map((v, t) => `${sx(t)},${sy(v)}`).join(" ");
  const maeScale = Math.max(result.random.mae, result.time.mae) * 1.15 || 1;
  const ratio = result.random.mae > 0 ? result.time.mae / result.random.mae : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div className="lg:col-span-3 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <PipelineToggle<SplitKind>
            layoutId="temporal-split-pill"
            ariaLabel="Validation split strategy"
            active={split}
            onChange={onSplitChange}
            options={[
              { id: "random", label: "Random split", color: "var(--color-warning)" },
              { id: "time", label: "Time-based split", color: "var(--color-success)" },
            ]}
          />
          <span className="text-[11px] text-[#475569]">
            {n - active.valIdx.length} train / {active.valIdx.length} held-out points
          </span>
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={`Trending time series of ${n} points. Under the ${split === "random" ? "random" : "time-based"} split, the held-out points are predicted with the nearest training timestamp's value, giving a mean absolute error of ${active.mae.toFixed(1)}.`}
        >
          <line x1={M.l} y1={H - M.b} x2={W - M.r} y2={H - M.b} stroke="#334155" strokeWidth={1} />
          <line x1={M.l} y1={M.t} x2={M.l} y2={H - M.b} stroke="#334155" strokeWidth={1} />
          <text x={M.l} y={H - M.b + 19} fill="#475569" fontSize={17} textAnchor="middle">t = 0</text>
          <text x={W - M.r} y={H - M.b + 19} fill="#475569" fontSize={17} textAnchor="end">t = {n - 1}</text>
          <text x={M.l - 6} y={H - M.b} fill="#475569" fontSize={17} textAnchor="end">{yMin.toFixed(0)}</text>
          <text x={M.l - 6} y={M.t + 12} fill="#475569" fontSize={17} textAnchor="end">{yMax.toFixed(0)}</text>
          <text x={(M.l + W - M.r) / 2} y={H - 4} fill="#94a3b8" fontSize={18} textAnchor="middle">
            time step
          </text>

          <polyline points={linePoints} fill="none" stroke="#1e5d8a" strokeWidth={1.5} opacity={0.9} />

          {/* prediction error segments + prediction ticks for held-out points */}
          {active.valIdx.map((t, i) => {
            const x = sx(t);
            const yActual = sy(result.series[t]);
            const yPred = sy(active.predictions[i]);
            return (
              <g key={`pred-${t}`}>
                <line x1={x} y1={yPred} x2={x} y2={yActual} stroke={splitColor} strokeWidth={1} strokeDasharray="2 3" opacity={0.7} />
                <line x1={x - 5} y1={yPred} x2={x + 5} y2={yPred} stroke={splitColor} strokeWidth={2} />
              </g>
            );
          })}

          {/* points: train filled circles, held-out hollow squares */}
          {result.series.map((v, t) =>
            valSet.has(t) ? (
              <rect
                key={t}
                x={sx(t) - 3.5}
                y={sy(v) - 3.5}
                width={7}
                height={7}
                fill="none"
                stroke={splitColor}
                strokeWidth={1.6}
              />
            ) : (
              <circle key={t} cx={sx(t)} cy={sy(v)} r={3} fill="#1e5d8a" />
            )
          )}
        </svg>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[10px] text-[#94a3b8]">
          <span className="flex items-center gap-1.5">
            <svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="3" fill="#1e5d8a" /></svg>
            training point (filled circle)
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="10" height="10" aria-hidden="true"><rect x="2" y="2" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: splitColor }} /></svg>
            held-out point (hollow square)
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="12" height="10" aria-hidden="true"><line x1="1" y1="5" x2="11" y2="5" stroke="currentColor" strokeWidth="2" style={{ color: splitColor }} /></svg>
            model prediction (tick), dashed line = error
          </span>
        </div>
      </div>

      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
          <div className="flex items-baseline justify-between mb-2">
            <label htmlFor="dl-trend-slider" className="text-[11px] font-semibold text-[#94a3b8]">
              Trend strength (units gained per time step)
            </label>
            <span className="text-[13px] font-mono font-bold text-white">{trend.toFixed(1)}</span>
          </div>
          <input
            id="dl-trend-slider"
            type="range"
            min={TREND_MIN}
            max={TREND_MAX}
            step={0.25}
            value={trend}
            onChange={(e) => onTrendChange(parseFloat(e.target.value))}
            className="w-full"
            style={{ accentColor: "var(--color-accent)" }}
          />
          <p className="text-[10px] text-[#475569] mt-2 leading-relaxed">
            With no trend the two splits score closest. The stronger the trend, the more the
            random split flatters the model.
          </p>
        </div>

        <StatCompare
          title="Mean absolute error, 1-NN on the time index (computed live)"
          items={[
            {
              label: "Random split: held-out points have same-era neighbors on both sides",
              display: result.random.mae.toFixed(1),
              fraction: result.random.mae / maeScale,
              color: "var(--color-warning)",
              highlighted: split === "random",
            },
            {
              label: "Time-based split: the model must predict the unseen future",
              display: result.time.mae.toFixed(1),
              fraction: result.time.mae / maeScale,
              color: "var(--color-success)",
              highlighted: split === "time",
            },
          ]}
        />

        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[11px] text-[#94a3b8] leading-relaxed">
            {ratio > 1.05 ? (
              <>
                Right now the random split reports an error {ratio.toFixed(1)} times smaller than
                the time-based split. Lower error, but the wrong question: production only ever
                asks about the future, and the time-based number is the one that predicts it.
              </>
            ) : (
              <>
                With the current trend the two splits report similar errors. Push the trend up to
                see the random split turn into a flattering lie.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
