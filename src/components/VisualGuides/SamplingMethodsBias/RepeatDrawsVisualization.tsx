"use client";

import React, { useMemo } from "react";

interface Props {
  repeatedMeans: number[];
  populationMean: number;
}

const SVG_W = 560;
const SVG_H = 140;
const AXIS_Y = SVG_H - 24;
const DOT_AREA_TOP = 12;
const DOT_AREA_H = AXIS_Y - DOT_AREA_TOP - 8;

const X_MIN = 40;
const X_MAX = 90;

function toSvgX(val: number): number {
  const pct = (val - X_MIN) / (X_MAX - X_MIN);
  return 30 + pct * (SVG_W - 60);
}

function computeStats(arr: number[]): { mean: number; sd: number } {
  if (arr.length === 0) return { mean: 0, sd: 0 };
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  const sd = Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
  return { mean, sd };
}

export default function RepeatDrawsVisualization({ repeatedMeans, populationMean }: Props) {
  const { mean: meanOfMeans, sd: sdOfMeans } = useMemo(
    () => computeStats(repeatedMeans),
    [repeatedMeans]
  );

  // Stack dots vertically when they cluster together
  const dotPositions = useMemo(() => {
    const SLOT_W = (SVG_W - 60) / 40; // bucket width
    const buckets: Map<number, number> = new Map();
    return repeatedMeans.map(v => {
      const bucket = Math.round((v - X_MIN) / (X_MAX - X_MIN) * 40);
      const count = (buckets.get(bucket) ?? 0);
      buckets.set(bucket, count + 1);
      const x = toSvgX(v);
      const y = AXIS_Y - 8 - count * 7;
      return { x: Math.max(30 + SLOT_W / 2, Math.min(SVG_W - 30, x)), y: Math.max(DOT_AREA_TOP, y) };
    });
  }, [repeatedMeans]);

  const trueMeanX = toSvgX(populationMean);
  const meanOfMeansX = repeatedMeans.length > 0 ? toSvgX(meanOfMeans) : null;

  // Axis tick values
  const ticks = [45, 50, 55, 60, 65, 70, 75, 80, 85];

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-0.5">
            Repeated Draws Distribution
          </p>
          {repeatedMeans.length > 0 ? (
            <p className="text-[12px] text-[#94a3b8]">
              Mean of means:{" "}
              <span className="font-semibold text-white">{meanOfMeans.toFixed(2)}</span>
              {"  "}
              SD of means:{" "}
              <span className="font-semibold text-white">{sdOfMeans.toFixed(2)}</span>
            </p>
          ) : (
            <p className="text-[12px] text-[#334155]">Draw samples to populate this chart.</p>
          )}
        </div>
        {repeatedMeans.length > 0 && (
          <span className="text-[11px] text-[#94a3b8]">
            <span className="font-semibold text-white">{repeatedMeans.length}</span> draws
          </span>
        )}
      </div>

      <div className="rounded-xl overflow-hidden border border-[#1e293b] bg-[#070d1a]">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          width="100%"
          style={{ display: "block", aspectRatio: `${SVG_W} / ${SVG_H}` }}
          aria-label="Dot plot of repeated sample means"
        >
          {/* True mean line */}
          <line
            x1={trueMeanX}
            y1={DOT_AREA_TOP}
            x2={trueMeanX}
            y2={AXIS_Y - 2}
            stroke="#ef4444"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            opacity={0.9}
          />
          <text
            x={trueMeanX + 3}
            y={DOT_AREA_TOP + 10}
            fontSize={9}
            fill="#ef4444"
            opacity={0.9}
          >
            True μ
          </text>

          {/* Mean of means line */}
          {meanOfMeansX !== null && repeatedMeans.length >= 3 && (
            <>
              <line
                x1={meanOfMeansX}
                y1={DOT_AREA_TOP}
                x2={meanOfMeansX}
                y2={AXIS_Y - 2}
                stroke="#d4af37"
                strokeWidth={1.2}
                strokeDasharray="3 3"
                opacity={0.7}
              />
              <text
                x={meanOfMeansX + 3}
                y={DOT_AREA_TOP + 20}
                fontSize={8}
                fill="#d4af37"
                opacity={0.7}
              >
                x̄ of x̄s
              </text>
            </>
          )}

          {/* Dots */}
          {dotPositions.map((pos, i) => (
            <circle
              key={i}
              cx={pos.x}
              cy={Math.max(DOT_AREA_TOP + 4, pos.y)}
              r={3}
              fill="#3bb4a4"
              opacity={0.75}
            />
          ))}

          {/* X-axis */}
          <line x1={28} y1={AXIS_Y} x2={SVG_W - 28} y2={AXIS_Y} stroke="#1e293b" strokeWidth={1} />

          {/* Axis ticks + labels */}
          {ticks.map(v => {
            const x = toSvgX(v);
            return (
              <g key={v}>
                <line x1={x} y1={AXIS_Y} x2={x} y2={AXIS_Y + 4} stroke="#334155" strokeWidth={1} />
                <text
                  x={x}
                  y={SVG_H - 4}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#334155"
                >
                  {v}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Insight */}
      <p className="text-[11px] text-[#334155] mt-3 leading-relaxed">
        Each dot = one sample mean. The spread of dots shows sampling variability.{" "}
        <span className="text-[#94a3b8]">Smaller spread = better method.</span>{" "}
        The red dashed line marks the true population mean.
      </p>

      {repeatedMeans.length >= 10 && sdOfMeans < 3 && (
        <p className="text-[11px] text-[#3bb4a4] mt-1.5">
          Low SD of means ({sdOfMeans.toFixed(2)}) — this method produces consistent estimates.
        </p>
      )}
      {repeatedMeans.length >= 10 && sdOfMeans >= 3 && (
        <p className="text-[11px] text-[#d4af37] mt-1.5">
          High SD of means ({sdOfMeans.toFixed(2)}) — high variability across draws. Try a larger sample size.
        </p>
      )}
    </div>
  );
}
