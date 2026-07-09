"use client";

import React from "react";
import { FrontierPoint, BaselineResult, CASCADE_PINK } from "./types";

type Props = {
  frontier: readonly FrontierPoint[];
  current: { avgCost: number; accuracy: number; threshold: number };
  big: BaselineResult;
  small: BaselineResult;
  winTolerance: number;
};

const W = 680;
const H = 380;
const M = { left: 60, right: 20, top: 18, bottom: 48 };

export default function FrontierChart({
  frontier,
  current,
  big,
  small,
  winTolerance,
}: Props) {
  const costs = frontier.map((p) => p.avgCost).concat([big.avgCost, current.avgCost]);
  const accs = frontier
    .map((p) => p.accuracy)
    .concat([big.accuracy, small.accuracy, current.accuracy]);

  const xMax = Math.max(...costs) * 1.08;
  const yMin = Math.max(0, Math.min(...accs) - 0.04);
  const yMax = Math.min(1, Math.max(...accs) + 0.02);

  const xs = (c: number) => M.left + (c / xMax) * (W - M.left - M.right);
  const ys = (a: number) =>
    H - M.bottom - ((a - yMin) / (yMax - yMin)) * (H - M.top - M.bottom);

  const xTicks = Array.from({ length: 6 }, (_, i) => (xMax / 5) * i);
  const yTicks = Array.from({ length: 5 }, (_, i) => yMin + ((yMax - yMin) / 4) * i);

  const sorted = [...frontier].sort((a, b) => a.threshold - b.threshold);
  const path = sorted
    .map((p, i) => `${i === 0 ? "M" : "L"}${xs(p.avgCost).toFixed(1)},${ys(p.accuracy).toFixed(1)}`)
    .join(" ");

  const winFloor = big.accuracy - winTolerance;

  return (
    <div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[560px]"
          role="img"
          aria-label={`Cost-quality frontier chart. Each point is the cascade evaluated at one escalation threshold. Current threshold ${current.threshold.toFixed(
            2
          )} gives ${current.avgCost.toFixed(2)} cost units per query at ${(
            current.accuracy * 100
          ).toFixed(1)} percent accuracy. Always-big costs ${big.avgCost.toFixed(
            1
          )} units at ${(big.accuracy * 100).toFixed(
            1
          )} percent. Always-small costs ${small.avgCost.toFixed(1)} units at ${(
            small.accuracy * 100
          ).toFixed(1)} percent.`}
        >
          {/* Win region: cheaper than big, quality within tolerance */}
          {winFloor > yMin && (
            <rect
              x={M.left}
              y={M.top}
              width={Math.max(0, xs(big.avgCost) - M.left)}
              height={Math.max(0, ys(winFloor) - M.top)}
              fill="var(--color-success)"
              opacity={0.07}
            />
          )}

          {/* Gridlines + ticks */}
          {yTicks.map((t) => (
            <g key={`y${t}`}>
              <line
                x1={M.left}
                x2={W - M.right}
                y1={ys(t)}
                y2={ys(t)}
                stroke="#1e293b"
                strokeWidth={1}
              />
              <text
                x={M.left - 8}
                y={ys(t) + 3.5}
                textAnchor="end"
                fontSize={10}
                fill="#475569"
              >
                {(t * 100).toFixed(0)}%
              </text>
            </g>
          ))}
          {xTicks.map((t) => (
            <g key={`x${t}`}>
              <line
                x1={xs(t)}
                x2={xs(t)}
                y1={M.top}
                y2={H - M.bottom}
                stroke="#1e293b"
                strokeWidth={1}
              />
              <text
                x={xs(t)}
                y={H - M.bottom + 16}
                textAnchor="middle"
                fontSize={10}
                fill="#475569"
              >
                {t.toFixed(0)}
              </text>
            </g>
          ))}

          {/* Always-big reference lines */}
          <line
            x1={xs(big.avgCost)}
            x2={xs(big.avgCost)}
            y1={M.top}
            y2={H - M.bottom}
            stroke="var(--color-accent)"
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.6}
          />
          <line
            x1={M.left}
            x2={W - M.right}
            y1={ys(big.accuracy)}
            y2={ys(big.accuracy)}
            stroke="var(--color-accent)"
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.6}
          />

          {/* Frontier */}
          <path d={path} fill="none" stroke="#94a3b8" strokeWidth={1.5} opacity={0.7} />
          {sorted.map((p) => (
            <circle
              key={p.threshold}
              cx={xs(p.avgCost)}
              cy={ys(p.accuracy)}
              r={2.5}
              fill="#475569"
            />
          ))}

          {/* Always-small marker */}
          <rect
            x={xs(small.avgCost) - 5}
            y={ys(small.accuracy) - 5}
            width={10}
            height={10}
            fill="#94a3b8"
          />
          <text
            x={xs(small.avgCost) + 10}
            y={ys(small.accuracy) + 4}
            fontSize={10.5}
            fill="#94a3b8"
          >
            always-small
          </text>

          {/* Always-big marker (diamond) */}
          <path
            d={`M${xs(big.avgCost)},${ys(big.accuracy) - 7} L${xs(big.avgCost) + 7},${ys(
              big.accuracy
            )} L${xs(big.avgCost)},${ys(big.accuracy) + 7} L${xs(big.avgCost) - 7},${ys(
              big.accuracy
            )} Z`}
            fill="var(--color-accent)"
          />
          <text
            x={xs(big.avgCost) - 12}
            y={ys(big.accuracy) - 10}
            textAnchor="end"
            fontSize={10.5}
            fill="var(--color-accent)"
          >
            always-big
          </text>

          {/* Current operating point */}
          <circle
            cx={xs(current.avgCost)}
            cy={ys(current.accuracy)}
            r={7}
            fill={CASCADE_PINK}
            stroke="#f1f5f9"
            strokeWidth={1.5}
          />
          <text
            x={xs(current.avgCost) + 12}
            y={ys(current.accuracy) + 4}
            fontSize={11}
            fontWeight={700}
            fill={CASCADE_PINK}
          >
            T = {current.threshold.toFixed(2)}
          </text>

          {/* Axis titles */}
          <text
            x={M.left + (W - M.left - M.right) / 2}
            y={H - 10}
            textAnchor="middle"
            fontSize={11}
            fill="#94a3b8"
          >
            cost per query (relative units)
          </text>
          <text
            x={16}
            y={M.top + (H - M.top - M.bottom) / 2}
            textAnchor="middle"
            fontSize={11}
            fill="#94a3b8"
            transform={`rotate(-90 16 ${M.top + (H - M.top - M.bottom) / 2})`}
          >
            accuracy on the stream
          </text>
        </svg>
      </div>
      <p className="text-[11px] text-[#475569] mt-2">
        Shaded corner: the win region (cheaper than always-big, accuracy within{" "}
        {(winTolerance * 100).toFixed(0)} point). Pink dot: your current threshold,
        computed at {current.avgCost.toFixed(2)} units per query and{" "}
        {(current.accuracy * 100).toFixed(1)}% accuracy.
      </p>
    </div>
  );
}
