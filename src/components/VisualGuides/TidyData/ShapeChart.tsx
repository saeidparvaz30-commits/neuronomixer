"use client";

import React, { useMemo } from "react";
import {
  CITIES,
  YEARS,
  WIDE_TEMPS,
  CITY_COLORS,
  YEAR_COLORS,
  type TableMode,
} from "./types";

const W = 460;
const H = 260;
const PAD = { l: 44, r: 14, t: 14, b: 44 };
const IW = W - PAD.l - PAD.r;
const IH = H - PAD.t - PAD.b;

type Props = { mode: TableMode };

/**
 * Renders exactly what a naive charting tool would draw from the CURRENT table
 * shape. Wide input: it can only map each column to a series and each row to an
 * x position, so you get one line per year over city positions. Long input: the
 * year variable exists as a column, so "x = year, color = city" works.
 * Every point is computed from WIDE_TEMPS; nothing is drawn from constants.
 */
export default function ShapeChart({ mode }: Props) {
  const allTemps = useMemo(
    () => CITIES.flatMap((c) => YEARS.map((y) => WIDE_TEMPS[c][y])),
    []
  );
  const yMin = Math.floor(Math.min(...allTemps)) - 1;
  const yMax = Math.ceil(Math.max(...allTemps)) + 1;
  const toY = (v: number) => PAD.t + IH - ((v - yMin) / (yMax - yMin)) * IH;

  const yTicks = useMemo(() => {
    const n = 5;
    return Array.from({ length: n }, (_, i) => yMin + ((yMax - yMin) / (n - 1)) * i);
  }, [yMin, yMax]);

  const isTidy = mode === "long";

  // x positions: wide = one slot per row (city), long = one slot per year value
  const xCount = isTidy ? YEARS.length : CITIES.length;
  const toX = (i: number) => PAD.l + (IW / (xCount - 1)) * i;

  const series = isTidy
    ? CITIES.map((city) => ({
        name: city,
        color: CITY_COLORS[city],
        points: YEARS.map((y, i) => ({ x: toX(i), y: toY(WIDE_TEMPS[city][y]) })),
      }))
    : YEARS.map((year) => ({
        name: String(year),
        color: YEAR_COLORS[year],
        points: CITIES.map((c, i) => ({ x: toX(i), y: toY(WIDE_TEMPS[c][year]) })),
      }));

  const xLabels = isTidy ? YEARS.map(String) : CITIES.map((c) => c);

  return (
    <div
      role="img"
      aria-label={
        isTidy
          ? "Line chart of annual mean temperature by year, one line per city: the intended view."
          : "Line chart drawn from the wide table: one line per year column plotted over city row positions, which is not the intended view."
      }
    >
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block">
        {yTicks.map((v) => (
          <g key={`yt-${v}`}>
            <line x1={PAD.l} y1={toY(v)} x2={PAD.l + IW} y2={toY(v)} stroke="#1e293b" strokeWidth="1" />
            <text x={PAD.l - 6} y={toY(v) + 5} textAnchor="end" fontSize="14" fill="#475569">
              {v.toFixed(0)}
            </text>
          </g>
        ))}
        {xLabels.map((label, i) => (
          <text
            key={`xl-${label}`}
            x={toX(i)}
            y={PAD.t + IH + 18}
            textAnchor="middle"
            fontSize="14"
            fill="#475569"
          >
            {label}
          </text>
        ))}
        <text x={PAD.l + IW / 2} y={H - 4} textAnchor="middle" fontSize="15" fill="#94a3b8">
          {isTidy ? "year (a real column)" : "row position (city), because no year column exists"}
        </text>
        <text
          x={12}
          y={PAD.t + IH / 2}
          textAnchor="middle"
          fontSize="15"
          fill="#94a3b8"
          transform={`rotate(-90 12 ${PAD.t + IH / 2})`}
        >
          temp (C)
        </text>
        {series.map((s) => (
          <g key={s.name}>
            <polyline
              points={s.points.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {s.points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3" fill={s.color} />
            ))}
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap items-center gap-3 mt-2">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: s.color }} aria-hidden="true" />
            {s.name}
          </span>
        ))}
        <span className="text-[10px] text-[#475569] ml-auto">
          {series.length} series x {series[0].points.length} points each
        </span>
      </div>
    </div>
  );
}
