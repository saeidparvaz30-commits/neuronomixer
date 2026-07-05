"use client";

import React from "react";
import type { Point2D } from "./types";
import { NUM_POINTS } from "./types";

interface Props {
  points: Point2D[];
  ariaLabel: string;
  height?: number;
}

/** Data extent shown by the plot; noise at std 1 stays comfortably inside. */
const EXTENT = 3.1;
const SIZE = 100;

function toSvgX(v: number): number {
  return ((v + EXTENT) / (2 * EXTENT)) * SIZE;
}

function toSvgY(v: number): number {
  return ((EXTENT - v) / (2 * EXTENT)) * SIZE;
}

function PointCloudInner({ points, ariaLabel, height = 320 }: Props) {
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={ariaLabel}
      className="w-full"
      style={{ height }}
      preserveAspectRatio="xMidYMid meet"
    >
      <line x1={0} y1={SIZE / 2} x2={SIZE} y2={SIZE / 2} stroke="#1e293b" strokeWidth={0.4} />
      <line x1={SIZE / 2} y1={0} x2={SIZE / 2} y2={SIZE} stroke="#1e293b" strokeWidth={0.4} />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={toSvgX(p.x)}
          cy={toSvgY(p.y)}
          r={0.9}
          fill={i < NUM_POINTS / 2 ? "#3bb4a4" : "#a855f7"}
          fillOpacity={0.85}
        />
      ))}
    </svg>
  );
}

const PointCloud = React.memo(PointCloudInner);
export default PointCloud;
