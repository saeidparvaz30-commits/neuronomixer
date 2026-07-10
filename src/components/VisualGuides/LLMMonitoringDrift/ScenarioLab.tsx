"use client";

import React from "react";
import {
  T,
  BASELINE_WINDOW,
  RAMP_HOURS,
  METRIC_KEYS,
  BASELINES,
  Scenario,
  Series,
} from "./math";
import { METRIC_META, APPLIED_AI_PINK } from "./types";
import { paddedExtent, linePath, xScale, yScale } from "./chartUtils";

const CHART_W = 320;
const CHART_H = 84;

type Props = {
  scenario: Scenario;
  onScenarioChange: (s: Scenario) => void;
  series: Series;
  onResample: () => void;
  injected: boolean;
};

function MetricSparkline({
  values,
  color,
  label,
  format,
  onset,
  injected,
}: {
  values: readonly number[];
  color: string;
  label: string;
  format: (v: number) => string;
  onset: number;
  injected: boolean;
}) {
  const ext = paddedExtent(values);
  const path = linePath(values, ext, CHART_W, CHART_H);
  const onsetX = xScale(onset, values.length, CHART_W);
  const baselineEndX = xScale(BASELINE_WINDOW, values.length, CHART_W);
  const mean =
    values.slice(0, BASELINE_WINDOW).reduce((a, b) => a + b, 0) /
    BASELINE_WINDOW;
  const meanY = yScale(mean, ext, CHART_H);
  const latest = values[values.length - 1];

  return (
    <div className="rounded-xl border border-[#1e293b] p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: color }}
            aria-hidden="true"
          />
          <p className="text-[11px] font-semibold text-white">{label}</p>
        </div>
        <p className="text-[11px] font-mono text-[#94a3b8]">
          now {format(latest)}
        </p>
      </div>
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`${label} over ${T} hours. Baseline mean ${format(mean)}, latest value ${format(latest)}.${injected ? ` Regression injected at hour ${onset}.` : " No regression injected."}`}
      >
        <rect
          x={0}
          y={0}
          width={baselineEndX}
          height={CHART_H}
          fill="#1e293b"
          opacity={0.35}
        />
        <line
          x1={0}
          y1={meanY}
          x2={CHART_W}
          y2={meanY}
          stroke="#334155"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
        {injected && (
          <line
            x1={onsetX}
            y1={0}
            x2={onsetX}
            y2={CHART_H}
            stroke={APPLIED_AI_PINK}
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        )}
        <path d={path} fill="none" stroke={color} strokeWidth={1.5} />
      </svg>
      <p className="text-[10px] text-[#475569] mt-1.5">
        baseline mean {format(mean)} (hours 0 to {BASELINE_WINDOW - 1}, shaded)
      </p>
    </div>
  );
}

export default function ScenarioLab({
  scenario,
  onScenarioChange,
  series,
  onResample,
  injected,
}: Props) {
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label
            htmlFor="onset-slider"
            className="block text-[11px] font-semibold text-[#94a3b8] mb-1.5"
          >
            Regression onset:{" "}
            <span className="font-mono text-white">
              hour {scenario.onset}
            </span>
          </label>
          <input
            id="onset-slider"
            type="range"
            min={BASELINE_WINDOW + 10}
            max={T - 10}
            step={1}
            value={scenario.onset}
            onChange={(e) =>
              onScenarioChange({ ...scenario, onset: Number(e.target.value) })
            }
            className="w-full accent-[#ec4899]"
          />
        </div>
        <div>
          <label
            htmlFor="quality-slider"
            className="block text-[11px] font-semibold text-[#94a3b8] mb-1.5"
          >
            Quality drop (judge score):{" "}
            <span className="font-mono text-white">
              -{scenario.qualityDrop.toFixed(3)}
            </span>
          </label>
          <input
            id="quality-slider"
            type="range"
            min={0}
            max={0.15}
            step={0.005}
            value={scenario.qualityDrop}
            onChange={(e) =>
              onScenarioChange({
                ...scenario,
                qualityDrop: Number(e.target.value),
              })
            }
            className="w-full accent-[#ec4899]"
          />
        </div>
        <div>
          <label
            htmlFor="drift-slider"
            className="block text-[11px] font-semibold text-[#94a3b8] mb-1.5"
          >
            Input drift severity:{" "}
            <span className="font-mono text-white">
              {scenario.driftSeverity.toFixed(2)}
            </span>
          </label>
          <input
            id="drift-slider"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={scenario.driftSeverity}
            onChange={(e) =>
              onScenarioChange({
                ...scenario,
                driftSeverity: Number(e.target.value),
              })
            }
            className="w-full accent-[#ec4899]"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          onClick={onResample}
          className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
        >
          New traffic sample
        </button>
        <p className="text-[11px] text-[#475569]">
          Reseeds the simulated noise; the regression settings stay put. The
          regression ramps to full strength over {RAMP_HOURS} hours, like a
          gradual rollout or slow upstream drift.
        </p>
      </div>

      {!injected && (
        <p className="text-[11px] text-[var(--color-warning)] mb-3">
          No regression injected yet: raise the quality drop or the drift
          severity to break something.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {METRIC_KEYS.map((key) => {
          const meta = METRIC_META[key];
          return (
            <MetricSparkline
              key={key}
              values={series[key]}
              color={meta.color}
              label={meta.label}
              format={meta.format}
              onset={scenario.onset}
              injected={injected}
            />
          );
        })}
      </div>

      <p className="text-[10px] text-[#475569] mt-3 leading-relaxed">
        Simulated traffic: each hour draws from a normal distribution around
        the metric baselines (judge {BASELINES.judge.mean}, refusal{" "}
        {(BASELINES.refusal.mean * 100).toFixed(0)}%, p95{" "}
        {BASELINES.latency.mean} ms, {BASELINES.tokens.mean} tokens) using a
        seeded PRNG. Quality drop pulls the judge score down; drift pushes
        refusals, latency, and token spend up. The pink dashed line marks the
        onset you chose.
      </p>
    </div>
  );
}
