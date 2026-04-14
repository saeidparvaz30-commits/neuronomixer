"use client";

import React from "react";
import type { MisleadingId } from "./types";
import { MISLEADING_CHARTS } from "./types";
import MisleadingChartCard from "./MisleadingChartCard";

interface Props {
  revealedCharts: Set<MisleadingId>;
  onReveal: (id: MisleadingId) => void;
}

export default function MisleadingChartsGallery({ revealedCharts, onReveal }: Props) {
  return (
    <div className="space-y-4">
      {MISLEADING_CHARTS.map((chart) => (
        <MisleadingChartCard
          key={chart.id}
          chart={chart}
          revealed={revealedCharts.has(chart.id as MisleadingId)}
          onReveal={() => onReveal(chart.id as MisleadingId)}
        />
      ))}
    </div>
  );
}
