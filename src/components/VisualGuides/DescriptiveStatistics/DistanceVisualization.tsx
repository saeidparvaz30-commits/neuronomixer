"use client";

import React from "react";
import { motion } from "framer-motion";
import type { DataPoint } from "./types";

interface DistanceVisualizationProps {
  /** Visible flag — lines render only when true */
  visible: boolean;
  dataPoints: DataPoint[];
  mean: number;
  /** SVG coordinate helpers */
  xScale: (v: number) => number;
  /** y positions of dots (by DataPoint id) */
  dotYPositions: Map<number, number>;
  /** y of the axis baseline */
  axisY: number;
}

const LABEL_IDS = [0, 9, 19]; // first, middle, last index (approx) for annotation

export default function DistanceVisualization({
  visible,
  dataPoints,
  mean,
  xScale,
  dotYPositions,
  axisY,
}: DistanceVisualizationProps) {
  if (!visible) return null;

  const meanX = xScale(mean);

  // Sort by value to pick representative label points
  const sorted = [...dataPoints].sort((a, b) => a.value - b.value);
  const labelSet = new Set(
    [sorted[0], sorted[Math.floor(sorted.length / 2)], sorted[sorted.length - 1]]
      .filter(Boolean)
      .map((p) => p.id)
  );

  return (
    <>
      {dataPoints.map((dp, i) => {
        const dotX = xScale(dp.value);
        const dotY = dotYPositions.get(dp.id) ?? axisY;
        const dist = dp.value - mean;
        const showLabel = labelSet.has(dp.id);

        return (
          <motion.g
            key={dp.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, delay: i * 0.025 }}
          >
            {/* Horizontal line from dot to mean line */}
            <line
              x1={dotX}
              y1={dotY}
              x2={meanX}
              y2={dotY}
              stroke="#d4af37"
              strokeWidth={1}
              strokeOpacity={0.45}
              strokeDasharray="3 2"
            />
            {/* Dot at the dot position end */}
            {showLabel && (
              <text
                x={dotX < meanX ? dotX - 3 : dotX + 3}
                y={dotY - 6}
                textAnchor={dotX < meanX ? "end" : "start"}
                fontSize={9}
                fill="#d4af37"
                opacity={0.85}
                fontFamily="monospace"
              >
                {dist >= 0 ? "+" : ""}
                {dist.toFixed(1)}k
              </text>
            )}
          </motion.g>
        );
      })}

      {/* Bottom annotation */}
      <motion.text
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        x={meanX}
        y={axisY + 38}
        textAnchor="middle"
        fontSize={9}
        fill="#d4af37"
        opacity={0.7}
        fontFamily="sans-serif"
      >
        Average of these squared distances = σ²
      </motion.text>
    </>
  );
}
