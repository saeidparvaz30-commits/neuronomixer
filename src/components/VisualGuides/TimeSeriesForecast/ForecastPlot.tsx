"use client";

import React from "react";

const W = 700;
const PAD = { l: 56, r: 20, t: 20, b: 44 };
const H = 280;

interface ForecastData {
  historicalValues: number[];
  historicalLabels: string[];
  forecastValues: number[];
  forecastLabels: string[];
  upperBound: number[];
  lowerBound: number[];
}

interface Props {
  data: ForecastData;
}

function toX(i: number, total: number): number {
  return PAD.l + (i / (total - 1)) * (W - PAD.l - PAD.r);
}

function toY(v: number, min: number, max: number): number {
  return PAD.t + ((max - v) / (max - min)) * (H - PAD.t - PAD.b);
}

export default function ForecastPlot({ data }: Props) {
  const { historicalValues, historicalLabels, forecastValues, forecastLabels, upperBound, lowerBound } = data;

  const allValues = [
    ...historicalValues,
    ...forecastValues,
    ...upperBound,
    ...lowerBound,
  ];
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const range = rawMax - rawMin || 1;
  const vMin = rawMin - range * 0.08;
  const vMax = rawMax + range * 0.08;

  const totalPoints = historicalValues.length + forecastValues.length;
  const histLen = historicalValues.length;
  const fcLen = forecastValues.length;

  // All x positions
  const splitX = toX(histLen - 1, totalPoints);

  // Historical path
  const histPath = historicalValues
    .map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i, totalPoints)} ${toY(v, vMin, vMax)}`)
    .join(" ");

  // Forecast path (starts from last historical point)
  const fcPath = [historicalValues[histLen - 1], ...forecastValues]
    .map((v, i) => `${i === 0 ? "M" : "L"} ${toX(histLen - 1 + i, totalPoints)} ${toY(v, vMin, vMax)}`)
    .join(" ");

  // Prediction interval polygon
  const upperPath = [historicalValues[histLen - 1], ...upperBound]
    .map((v, i) => `${i === 0 ? "M" : "L"} ${toX(histLen - 1 + i, totalPoints)} ${toY(v, vMin, vMax)}`)
    .join(" ");
  const lowerPath = [historicalValues[histLen - 1], ...lowerBound]
    .map((v, i) => `${i === 0 ? "L" : ""} ${toX(histLen - 1 + i, totalPoints)} ${toY(v, vMin, vMax)}`)
    .reverse()
    .join(" ");

  const intervalPolygon = upperPath + " " + lowerPath.replace(/^\s*L?\s*/, " L ") + " Z";

  // Y ticks
  const yTickCount = 6;
  const rawStep = (vMax - vMin) / (yTickCount - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const niceStep =
    rawStep / mag < 1.5
      ? mag
      : rawStep / mag < 3.5
      ? 2 * mag
      : rawStep / mag < 7.5
      ? 5 * mag
      : 10 * mag;
  const yStart = Math.ceil(vMin / niceStep) * niceStep;
  const yTicks: number[] = [];
  for (let t = yStart; t <= vMax + niceStep * 0.01; t += niceStep) {
    yTicks.push(parseFloat(t.toFixed(10)));
  }

  // X ticks: every 6 months in historical, every 3 in forecast
  const xTicks: Array<{ idx: number; label: string }> = [];
  for (let i = 0; i < histLen; i += 6) {
    xTicks.push({ idx: i, label: historicalLabels[i] });
  }
  for (let i = 0; i < fcLen; i += 3) {
    xTicks.push({ idx: histLen + i, label: forecastLabels[i] });
  }

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        <defs>
          <clipPath id="fc-clip">
            <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} />
          </clipPath>
        </defs>

        {/* Background */}
        <rect
          x={PAD.l}
          y={PAD.t}
          width={W - PAD.l - PAD.r}
          height={H - PAD.t - PAD.b}
          fill="#0f172a"
          stroke="#1e293b"
          strokeWidth={1}
        />

        {/* Y grid lines */}
        {yTicks.map((t) => {
          const sy = toY(t, vMin, vMax);
          if (sy < PAD.t - 1 || sy > H - PAD.b + 1) return null;
          return (
            <g key={`y-${t}`}>
              <line x1={PAD.l} y1={sy} x2={W - PAD.r} y2={sy} stroke="#1e293b" strokeWidth={1} />
              <text x={PAD.l - 6} y={sy + 3.5} textAnchor="end" fill="#475569" fontSize={9}>
                {Math.abs(t) >= 1000 ? (t / 1000).toFixed(1) + "k" : t % 1 === 0 ? t.toFixed(0) : t.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* X tick labels */}
        {xTicks.map(({ idx, label }) => (
          <text
            key={`x-${idx}`}
            x={toX(idx, totalPoints)}
            y={H - PAD.b + 14}
            textAnchor="middle"
            fill="#475569"
            fontSize={9}
          >
            {label}
          </text>
        ))}

        {/* Forecast background shading */}
        <rect
          x={splitX}
          y={PAD.t}
          width={W - PAD.r - splitX}
          height={H - PAD.t - PAD.b}
          fill="#d4af37"
          opacity={0.03}
          clipPath="url(#fc-clip)"
        />

        {/* Prediction interval area */}
        <path
          d={intervalPolygon}
          fill="#d4af37"
          opacity={0.12}
          clipPath="url(#fc-clip)"
        />

        {/* Prediction interval bounds (dashed) */}
        <path
          d={upperPath}
          fill="none"
          stroke="#d4af37"
          strokeWidth={1}
          strokeDasharray="3,3"
          opacity={0.5}
          clipPath="url(#fc-clip)"
        />
        <path
          d={[historicalValues[histLen - 1], ...lowerBound]
            .map((v, i) => `${i === 0 ? "M" : "L"} ${toX(histLen - 1 + i, totalPoints)} ${toY(v, vMin, vMax)}`)
            .join(" ")}
          fill="none"
          stroke="#d4af37"
          strokeWidth={1}
          strokeDasharray="3,3"
          opacity={0.5}
          clipPath="url(#fc-clip)"
        />

        {/* Vertical split line */}
        <line
          x1={splitX}
          y1={PAD.t}
          x2={splitX}
          y2={H - PAD.b}
          stroke="#94a3b8"
          strokeWidth={1.5}
          strokeDasharray="5,4"
          opacity={0.5}
        />

        {/* Historical line */}
        <path
          d={histPath}
          fill="none"
          stroke="#3bb4a4"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          clipPath="url(#fc-clip)"
        />

        {/* Forecast line */}
        <path
          d={fcPath}
          fill="none"
          stroke="#d4af37"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="7,4"
          clipPath="url(#fc-clip)"
        />

        {/* Axes */}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="#334155" strokeWidth={1.5} />
        <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="#334155" strokeWidth={1.5} />

        {/* "Forecast starts" label */}
        <text x={splitX + 4} y={PAD.t + 12} fill="#94a3b8" fontSize={9} opacity={0.7}>
          Forecast →
        </text>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-5 mt-3 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 bg-[#3bb4a4] rounded" />
          <span className="text-[11px] text-[#94a3b8]">Historical</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 border-t-2 border-dashed border-[#d4af37]" />
          <span className="text-[11px] text-[#94a3b8]">Forecast</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-3 rounded" style={{ background: "rgba(212,175,55,0.15)", border: "1px dashed rgba(212,175,55,0.4)" }} />
          <span className="text-[11px] text-[#94a3b8]">95% Prediction Interval</span>
        </div>
      </div>
    </div>
  );
}
