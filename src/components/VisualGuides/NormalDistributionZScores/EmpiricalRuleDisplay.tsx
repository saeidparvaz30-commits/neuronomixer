"use client";

import React, { useEffect, useRef } from "react";
import { normalPDF } from "./types";

// ── SVG dimensions ─────────────────────────────────────────────────────────────
const VW = 560;
const VH = 212;
const PAD = { l: 20, r: 20, t: 36, b: 48 };
const IW = VW - PAD.l - PAD.r;
const IH = VH - PAD.t - PAD.b;
const CURVE_POINTS = 300;

interface Props {
  showStandardNormal: boolean;
  onToggle: (v: boolean) => void;
  onViewed: () => void;
}

export default function EmpiricalRuleDisplay({ showStandardNormal, onToggle, onViewed }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewedFired = useRef(false);

  // ── Intersection Observer for completion tracking ──────────────────────────
  useEffect(() => {
    if (viewedFired.current) return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !viewedFired.current) {
          viewedFired.current = true;
          onViewed();
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onViewed]);

  // ── Curve parameters ──────────────────────────────────────────────────────
  const mu = showStandardNormal ? 0 : 100;
  const sigma = showStandardNormal ? 1 : 15;

  const xMin = mu - 4 * sigma;
  const xMax = mu + 4 * sigma;
  const xRange = xMax - xMin;
  const maxPDF = normalPDF(mu, mu, sigma);

  function dataXtoSvgX(dataX: number): number {
    return PAD.l + ((dataX - xMin) / xRange) * IW;
  }

  function pdfToSvgY(pdf: number): number {
    return PAD.t + IH - (pdf / maxPDF) * IH;
  }

  // ── Curve path ────────────────────────────────────────────────────────────
  const curvePoints: { x: number; y: number }[] = [];
  for (let i = 0; i <= CURVE_POINTS; i++) {
    const dataX = xMin + (i / CURVE_POINTS) * xRange;
    const pdf = normalPDF(dataX, mu, sigma);
    curvePoints.push({ x: dataXtoSvgX(dataX), y: pdfToSvgY(pdf) });
  }
  const curvePath = curvePoints
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" ");
  const baselineY = PAD.t + IH;

  // ── Shaded band generator ─────────────────────────────────────────────────
  function getBandPath(lo: number, hi: number): string {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= CURVE_POINTS; i++) {
      const dataX = xMin + (i / CURVE_POINTS) * xRange;
      if (dataX < lo || dataX > hi) continue;
      const pdf = normalPDF(dataX, mu, sigma);
      pts.push({ x: dataXtoSvgX(dataX), y: pdfToSvgY(pdf) });
    }
    if (pts.length < 2) return "";
    const top = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
    return `${top} L${pts[pts.length - 1].x.toFixed(2)},${baselineY} L${pts[0].x.toFixed(2)},${baselineY} Z`;
  }

  // Bands: 3σ (outermost), 2σ, 1σ (innermost drawn last so it's on top)
  const band3 = getBandPath(mu - 3 * sigma, mu + 3 * sigma);
  const band2 = getBandPath(mu - 2 * sigma, mu + 2 * sigma);
  const band1 = getBandPath(mu - 1 * sigma, mu + 1 * sigma);

  // ── Label positions ───────────────────────────────────────────────────────
  const labelY = PAD.t + 12;
  const center = dataXtoSvgX(mu);

  // x-axis ticks
  const sdOffsets = [-3, -2, -1, 0, 1, 2, 3];

  return (
    <div ref={containerRef} className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="text-[13px] font-bold text-white">The Empirical Rule (68–95–99.7%)</h3>
        <button
          onClick={() => {
            onToggle(!showStandardNormal);
            onViewed();
          }}
          className="text-[10px] font-semibold px-3 py-1.5 rounded-xl border transition-all"
          style={{
            borderColor: showStandardNormal ? "#3bb4a4" : "#1e293b",
            color: showStandardNormal ? "#3bb4a4" : "#475569",
            background: showStandardNormal ? "#3bb4a420" : "transparent",
          }}
        >
          {showStandardNormal ? "Standard Normal (μ=0, σ=1)" : "IQ Scale (μ=100, σ=15)"}
        </button>
      </div>
      <p className="text-[11px] text-[#475569] mb-4">
        For any normal distribution, ~68% of data falls within ±1σ, ~95% within ±2σ, ~99.7% within ±3σ.
      </p>

      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        width="100%"
        role="img"
        aria-label="Empirical rule bell curve with 68-95-99.7% shaded bands"
        className="block"
      >
        {/* Shaded bands — outermost first */}
        {band3 && <path d={band3} fill="var(--color-accent)" opacity={0.10} />}
        {band2 && <path d={band2} fill="var(--color-accent)" opacity={0.20} />}
        {band1 && <path d={band1} fill="var(--color-accent)" opacity={0.30} />}

        {/* Curve stroke */}
        <path d={curvePath} fill="none" stroke="#3bb4a4" strokeWidth="2" />

        {/* Baseline */}
        <line x1={PAD.l} y1={baselineY} x2={VW - PAD.r} y2={baselineY} stroke="#334155" strokeWidth="1" />

        {/* SD boundary lines */}
        {[-3, -2, -1, 0, 1, 2, 3].map(n => {
          const sx = dataXtoSvgX(mu + n * sigma);
          const isCenter = n === 0;
          return (
            <line
              key={n}
              x1={sx} y1={PAD.t} x2={sx} y2={baselineY}
              stroke={isCenter ? "#1e5d8a" : "#334155"}
              strokeWidth={isCenter ? 1 : 0.75}
              strokeDasharray={isCenter ? "4 3" : "2 3"}
              opacity={isCenter ? 0.7 : 0.5}
            />
          );
        })}

        {/* Percentage labels */}
        {/* 99.7% */}
        <text x={center} y={labelY} textAnchor="middle" fill="var(--color-accent)" fontSize="17" opacity={0.6} fontWeight="600">
          99.7%
        </text>
        {/* 95% */}
        <text x={center} y={labelY + 19} textAnchor="middle" fill="var(--color-accent)" fontSize="17" opacity={0.75} fontWeight="600">
          95%
        </text>
        {/* 68% */}
        <text x={center} y={labelY + 38} textAnchor="middle" fill="var(--color-accent)" fontSize="17" opacity={0.9} fontWeight="600">
          68%
        </text>

        {/* X-axis ticks */}
        {sdOffsets.map(n => {
          const dataX = mu + n * sigma;
          const sx = dataXtoSvgX(dataX);
          const label = showStandardNormal
            ? `${n}`
            : `${dataX % 1 === 0 ? dataX.toFixed(0) : dataX.toFixed(1)}`;
          const sdLabel = n === 0 ? "μ" : `${n > 0 ? "+" : ""}${n}σ`;
          return (
            <g key={n}>
              <line x1={sx} y1={baselineY} x2={sx} y2={baselineY + 3} stroke="#475569" strokeWidth="1" />
              <text x={sx} y={baselineY + 17} textAnchor="middle" fill="#475569" fontSize="17">
                {label}
              </text>
              <text x={sx} y={baselineY + 35} textAnchor="middle" fill="#334155" fontSize="17">
                {sdLabel}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-3 rounded-sm" style={{ background: "var(--color-accent)", opacity: 0.3 }} />
          <span className="text-[10px] text-[#94a3b8]">±1σ → 68%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-3 rounded-sm" style={{ background: "var(--color-accent)", opacity: 0.2 }} />
          <span className="text-[10px] text-[#94a3b8]">±2σ → 95%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-3 rounded-sm" style={{ background: "var(--color-accent)", opacity: 0.1 }} />
          <span className="text-[10px] text-[#94a3b8]">±3σ → 99.7%</span>
        </div>
      </div>
    </div>
  );
}
