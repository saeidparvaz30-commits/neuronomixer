"use client";

import React from "react";
import { motion } from "framer-motion";
import { Point, mean, stdDev } from "./types";

type Props = {
  points: Point[];
  outlierIds: Set<number>;
};

function StatCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-[#1e293b]/60 border border-[#1e293b] p-2.5">
      <p className="text-[9px] text-[#475569] uppercase tracking-[1.5px] font-semibold mb-1">{label}</p>
      <motion.p
        key={value}
        initial={{ opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="text-[17px] font-black tracking-tight"
        style={{ color }}
      >
        {value}
      </motion.p>
      {sub && <p className="text-[9px] text-[#475569] mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ComparisonStats({ points, outlierIds }: Props) {
  const xs    = points.map(p => p.x);
  const mx    = xs.length > 0 ? mean(xs) : 0;
  const sd    = xs.length > 1 ? stdDev(xs, mx) : 0;
  const medX  = (() => {
    if (!xs.length) return 0;
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
  })();

  const cleanPts  = points.filter(p => !outlierIds.has(p.id));
  const cleanXs   = cleanPts.map(p => p.x);
  const cleanMx   = cleanXs.length > 0 ? mean(cleanXs) : mx;
  const cleanSd   = cleanXs.length > 1 ? stdDev(cleanXs, cleanMx) : sd;
  const meanDiff  = Math.abs(mx - cleanMx);

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-3">Live Statistics (X-axis)</p>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <StatCard label="Mean X"   value={mx.toFixed(1)}   color="#3bb4a4" sub="sensitive to outliers" />
        <StatCard label="Median X" value={medX.toFixed(1)} color="var(--color-accent)" sub="robust to outliers" />
        <StatCard label="Std Dev X" value={sd.toFixed(1)}  color="#3b82f6" sub="spread of values" />
        <StatCard label="N points" value={String(points.length)} color="#94a3b8" sub={`${outlierIds.size} flagged`} />
      </div>

      {outlierIds.size > 0 && cleanXs.length > 0 && (
        <div className="rounded-xl border border-[#ef4444]/20 bg-[#ef4444]/5 p-3">
          <p className="text-[10px] font-semibold text-[#ef4444] mb-2">Outlier Impact on Mean</p>
          <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-[#475569] uppercase tracking-wide">With outliers</span>
              <span className="font-semibold text-white">{mx.toFixed(1)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-[#475569] uppercase tracking-wide">Without outliers</span>
              <span className="font-semibold text-white">{cleanMx.toFixed(1)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-[#475569] uppercase tracking-wide">Std dev (clean)</span>
              <span className="font-semibold text-white">{cleanSd.toFixed(1)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-[#475569] uppercase tracking-wide">Mean shift Δ</span>
              <span className="font-semibold text-[#ef4444]">{meanDiff.toFixed(1)}</span>
            </div>
          </div>
          <p className="text-[10px] text-[#94a3b8] leading-relaxed">
            The median stays near {medX.toFixed(1)} regardless. This is what makes it outlier-robust.
          </p>
        </div>
      )}

      {outlierIds.size === 0 && (
        <p className="text-[11px] text-[#475569] text-center py-1">
          No outliers flagged: mean and median are both reliable.
        </p>
      )}
    </div>
  );
}
