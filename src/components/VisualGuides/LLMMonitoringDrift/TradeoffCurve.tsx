"use client";

import React from "react";
import { SweepPoint, SWEEP_RUNS, T, MetricKey } from "./math";
import { METRIC_META } from "./types";

const CHART_W = 680;
const CHART_H = 240;
const PAD_L = 46;
const PAD_B = 34;
const PAD_T = 12;
const PAD_R = 16;

type Props = {
  sweep: SweepPoint[];
  currentH: number;
  metric: MetricKey;
  injected: boolean;
};

export default function TradeoffCurve({
  sweep,
  currentH,
  metric,
  injected,
}: Props) {
  const meta = METRIC_META[metric];
  const plotted = sweep.filter((p) => p.meanDelay !== null);
  const undetected = sweep.length - plotted.length;
  const maxDelay = Math.max(4, ...plotted.map((p) => p.meanDelay ?? 0)) * 1.15;

  const plotW = CHART_W - PAD_L - PAD_R;
  const plotH = CHART_H - PAD_T - PAD_B;
  const px = (fa: number) => PAD_L + fa * plotW;
  const py = (d: number) => PAD_T + plotH - (d / maxDelay) * plotH;

  const current =
    plotted.length > 0
      ? plotted.reduce((best, p) =>
          Math.abs(p.h - currentH) < Math.abs(best.h - currentH) ? p : best
        )
      : null;
  const currentExact = sweep.find((p) => p.h === currentH) ?? null;

  const path = plotted
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${px(p.falseAlarmProb).toFixed(1)},${py(
          p.meanDelay as number
        ).toFixed(1)}`
    )
    .join(" ");

  return (
    <div>
      {!injected ? (
        <p className="text-[12px] text-[var(--color-warning)] mb-3">
          Inject a regression in the lab above to trace this curve. With
          nothing to detect, detection delay has no meaning.
        </p>
      ) : (
        <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
          Every threshold h is a point on this curve: sweep it and the honest
          tradeoff appears. Lower thresholds catch the regression sooner but
          cry wolf on healthy traffic; higher thresholds stay quiet but sit on
          the problem for longer. There is no setting that gives you both.
        </p>
      )}

      <div className="rounded-xl border border-[#1e293b] p-3 mb-3">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="w-full h-auto"
          role="img"
          aria-label={
            injected && current && currentExact
              ? `Tradeoff curve for ${meta.label}: mean detection delay versus false-alarm probability as the threshold sweeps. At your threshold h equals ${currentH}, false-alarm probability is ${Math.round(
                  currentExact.falseAlarmProb * 100
                )} percent and mean delay is ${
                  currentExact.meanDelay === null
                    ? "undefined"
                    : `${currentExact.meanDelay.toFixed(1)} hours`
                }.`
              : "Tradeoff curve placeholder: inject a regression to populate it."
          }
        >
          {/* axes */}
          <line
            x1={PAD_L}
            y1={PAD_T}
            x2={PAD_L}
            y2={PAD_T + plotH}
            stroke="#334155"
            strokeWidth={1}
          />
          <line
            x1={PAD_L}
            y1={PAD_T + plotH}
            x2={PAD_L + plotW}
            y2={PAD_T + plotH}
            stroke="#334155"
            strokeWidth={1}
          />
          {/* x ticks at 0, 25, 50, 75, 100% */}
          {[0, 0.25, 0.5, 0.75, 1].map((fa) => (
            <g key={fa}>
              <line
                x1={px(fa)}
                y1={PAD_T + plotH}
                x2={px(fa)}
                y2={PAD_T + plotH + 4}
                stroke="#334155"
                strokeWidth={1}
              />
              <text
                x={px(fa)}
                y={PAD_T + plotH + 15}
                textAnchor="middle"
                fill="#475569"
                fontSize={9}
              >
                {Math.round(fa * 100)}%
              </text>
            </g>
          ))}
          {/* y ticks */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const d = f * maxDelay;
            return (
              <g key={f}>
                <line
                  x1={PAD_L - 4}
                  y1={py(d)}
                  x2={PAD_L}
                  y2={py(d)}
                  stroke="#334155"
                  strokeWidth={1}
                />
                <text
                  x={PAD_L - 7}
                  y={py(d) + 3}
                  textAnchor="end"
                  fill="#475569"
                  fontSize={9}
                >
                  {d.toFixed(0)}
                </text>
              </g>
            );
          })}
          <text
            x={PAD_L + plotW / 2}
            y={CHART_H - 4}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize={10}
          >
            false-alarm probability per {T}-hour window (in-control traffic)
          </text>
          <text
            x={12}
            y={PAD_T + plotH / 2}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize={10}
            transform={`rotate(-90 12 ${PAD_T + plotH / 2})`}
          >
            mean detection delay (h)
          </text>

          {injected && plotted.length > 0 && (
            <>
              <path d={path} fill="none" stroke="#334155" strokeWidth={1.25} />
              {plotted.map((p) => (
                <circle
                  key={p.h}
                  cx={px(p.falseAlarmProb)}
                  cy={py(p.meanDelay as number)}
                  r={3}
                  fill={meta.color}
                  opacity={0.75}
                />
              ))}
              {current && current.meanDelay !== null && (
                <g>
                  <circle
                    cx={px(current.falseAlarmProb)}
                    cy={py(current.meanDelay)}
                    r={7}
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth={2}
                  />
                  <text
                    x={px(current.falseAlarmProb) + 10}
                    y={py(current.meanDelay) - 8}
                    fill="var(--color-accent)"
                    fontSize={10}
                    fontWeight={700}
                  >
                    h = {current.h}
                  </text>
                </g>
              )}
            </>
          )}
        </svg>
      </div>

      {injected && currentExact && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div className="rounded-xl border border-[#1e293b] p-3">
            <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
              False-alarm probability at h = {currentH}
            </p>
            <p className="text-xl font-black font-mono text-[#f1f5f9]">
              {Math.round(currentExact.falseAlarmProb * 100)}%
            </p>
          </div>
          <div className="rounded-xl border border-[#1e293b] p-3">
            <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
              Detection rate
            </p>
            <p className="text-xl font-black font-mono text-[#f1f5f9]">
              {Math.round(currentExact.detectRate * 100)}%
            </p>
          </div>
          <div className="rounded-xl border border-[#1e293b] p-3">
            <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
              Mean detection delay
            </p>
            <p className="text-xl font-black font-mono text-[#f1f5f9]">
              {currentExact.meanDelay === null
                ? "never detected"
                : `${currentExact.meanDelay.toFixed(1)} h`}
            </p>
          </div>
        </div>
      )}

      <p className="text-[10px] text-[#475569] leading-relaxed">
        Computed by Monte Carlo: {SWEEP_RUNS} paired simulations per threshold
        with the same noise seeds, once with your regression and once without
        it. False-alarm probability counts in-control runs with at least one
        alarm; delay averages over detected regression runs.
        {undetected > 0 &&
          ` ${undetected} of ${sweep.length} thresholds never detected the regression and are not plotted.`}
      </p>
    </div>
  );
}
