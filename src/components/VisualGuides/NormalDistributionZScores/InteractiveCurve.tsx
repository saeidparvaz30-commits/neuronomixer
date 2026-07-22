"use client";

import React, { useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { normalPDF, normalCDF, computeZ } from "./types";

// ── SVG dimensions ─────────────────────────────────────────────────────────────
const VW = 600;
const VH = 216;
const PAD = { l: 48, r: 16, t: 24, b: 60 };
const IW = VW - PAD.l - PAD.r;
const IH = VH - PAD.t - PAD.b;
const CURVE_POINTS = 300;

interface Props {
  mean: number;
  stdDev: number;
  markerX1: number;
  markerX2: number;
  onMarkerChange: (x1: number, x2: number) => void;
}

export default function InteractiveCurve({
  mean,
  stdDev,
  markerX1,
  markerX2,
  onMarkerChange,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<null | "m1" | "m2">(null);

  // ── Curve data ────────────────────────────────────────────────────────────────
  const xMin = mean - 4 * stdDev;
  const xMax = mean + 4 * stdDev;
  const xRange = xMax - xMin;

  const curvePoints: { x: number; y: number }[] = [];
  const maxPDF = normalPDF(mean, mean, stdDev);

  for (let i = 0; i <= CURVE_POINTS; i++) {
    const dataX = xMin + (i / CURVE_POINTS) * xRange;
    const pdf = normalPDF(dataX, mean, stdDev);
    const svgX = PAD.l + ((dataX - xMin) / xRange) * IW;
    const svgY = PAD.t + IH - (pdf / maxPDF) * IH;
    curvePoints.push({ x: svgX, y: svgY });
  }

  const curvePath =
    curvePoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  const baselineY = PAD.t + IH;
  const curveClosedPath = `${curvePath} L${curvePoints[curvePoints.length - 1].x.toFixed(2)},${baselineY} L${curvePoints[0].x.toFixed(2)},${baselineY} Z`;

  // ── Shaded area path between markers ─────────────────────────────────────────
  const lo = Math.min(markerX1, markerX2);
  const hi = Math.max(markerX1, markerX2);

  const shadedPoints: { x: number; y: number }[] = [];
  for (let i = 0; i <= CURVE_POINTS; i++) {
    const dataX = xMin + (i / CURVE_POINTS) * xRange;
    if (dataX < lo || dataX > hi) continue;
    const pdf = normalPDF(dataX, mean, stdDev);
    const svgX = PAD.l + ((dataX - xMin) / xRange) * IW;
    const svgY = PAD.t + IH - (pdf / maxPDF) * IH;
    shadedPoints.push({ x: svgX, y: svgY });
  }

  let shadedPath = "";
  if (shadedPoints.length >= 2) {
    const top = shadedPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
    shadedPath = `${top} L${shadedPoints[shadedPoints.length - 1].x.toFixed(2)},${baselineY} L${shadedPoints[0].x.toFixed(2)},${baselineY} Z`;
  }

  // ── Coordinate converters ─────────────────────────────────────────────────────
  function dataXtoSvgX(dataX: number): number {
    return PAD.l + ((dataX - xMin) / xRange) * IW;
  }

  function svgXtoDataX(svgX: number): number {
    return xMin + ((svgX - PAD.l) / IW) * xRange;
  }

  function getSvgX(e: React.PointerEvent<SVGSVGElement>): number {
    if (!svgRef.current) return 0;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    // Scale from client coords to viewBox coords
    const scaleX = VW / rect.width;
    return relX * scaleX;
  }

  // ── Drag handlers ─────────────────────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (marker: "m1" | "m2") => (e: React.PointerEvent<SVGCircleElement>) => {
      e.preventDefault();
      dragging.current = marker;
      (e.currentTarget as SVGCircleElement).setPointerCapture(e.pointerId);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragging.current) return;
      e.preventDefault();
      const svgX = getSvgX(e);
      const clampedSvgX = Math.max(PAD.l, Math.min(PAD.l + IW, svgX));
      const dataX = svgXtoDataX(clampedSvgX);
      const clamped = Math.max(xMin, Math.min(xMax, dataX));
      if (dragging.current === "m1") {
        onMarkerChange(clamped, markerX2);
      } else {
        onMarkerChange(markerX1, clamped);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dragging, markerX1, markerX2, xMin, xMax, onMarkerChange]
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  // ── Probability display ───────────────────────────────────────────────────────
  const z1 = computeZ(lo, mean, stdDev);
  const z2 = computeZ(hi, mean, stdDev);
  const probability = Math.abs(normalCDF(z2) - normalCDF(z1));

  const m1SvgX = dataXtoSvgX(markerX1);
  const m2SvgX = dataXtoSvgX(markerX2);
  const m1Z = computeZ(markerX1, mean, stdDev);
  const m2Z = computeZ(markerX2, mean, stdDev);

  // X-axis ticks
  const xTicks = [-3, -2, -1, 0, 1, 2, 3].map(sd => mean + sd * stdDev);

  return (
    <div className="w-full">
      {/* Probability display */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">
          Drag markers to explore probabilities
        </p>
        <div className="flex items-center gap-2 bg-[#1e293b] px-3 py-1.5 rounded-lg">
          <span className="text-[11px] text-[#94a3b8]">Probability:</span>
          <span className="text-[14px] font-bold text-[var(--color-accent)]">{(probability * 100).toFixed(2)}%</span>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        width="100%"
        role="img"
        aria-label="Interactive normal distribution curve"
        className="block touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map(t => {
          const y = PAD.t + (1 - t) * IH;
          return (
            <line
              key={t}
              x1={PAD.l} y1={y} x2={VW - PAD.r} y2={y}
              stroke="#1e293b" strokeWidth="1"
            />
          );
        })}

        {/* Curve fill (subtle) */}
        <path d={curveClosedPath} fill="#1e5d8a" opacity={0.15} />

        {/* Shaded area between markers */}
        {shadedPath && (
          <motion.path
            d={shadedPath}
            fill="var(--color-accent)"
            opacity={0.3}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ duration: 0.15 }}
          />
        )}

        {/* Curve stroke */}
        <path d={curvePath} fill="none" stroke="#3bb4a4" strokeWidth="2.5" strokeLinejoin="round" />

        {/* Baseline */}
        <line
          x1={PAD.l} y1={baselineY} x2={VW - PAD.r} y2={baselineY}
          stroke="#334155" strokeWidth="1"
        />
        {/* Y-axis */}
        <line
          x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={baselineY}
          stroke="#334155" strokeWidth="1"
        />

        {/* X-axis ticks and labels */}
        {xTicks.map((v, i) => {
          const sx = dataXtoSvgX(v);
          const sdOffset = Math.round((v - mean) / stdDev);
          const label = stdDev === 15 ? `${v.toFixed(0)}` : `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}`;
          return (
            <g key={i}>
              <line x1={sx} y1={baselineY} x2={sx} y2={baselineY + 4} stroke="#475569" strokeWidth="1" />
              <text x={sx} y={baselineY + 20} textAnchor="middle" fill="#475569" fontSize="20">
                {label}
              </text>
              <text x={sx} y={baselineY + 40} textAnchor="middle" fill="#334155" fontSize="19">
                {sdOffset === 0 ? "μ" : `${sdOffset > 0 ? "+" : ""}${sdOffset}σ`}
              </text>
            </g>
          );
        })}

        {/* Mean line */}
        {(() => {
          const mx = dataXtoSvgX(mean);
          return (
            <line
              x1={mx} y1={PAD.t} x2={mx} y2={baselineY}
              stroke="#1e5d8a" strokeWidth="1" strokeDasharray="4 3" opacity={0.6}
            />
          );
        })()}

        {/* Marker 1 */}
        <g>
          <line
            x1={m1SvgX} y1={PAD.t + 4} x2={m1SvgX} y2={baselineY}
            stroke="var(--color-accent)" strokeWidth="1.5" strokeDasharray="3 2"
          />
          <circle
            cx={m1SvgX}
            cy={PAD.t + 4}
            r={7}
            fill="var(--color-accent)"
            stroke="#0f172a"
            strokeWidth="1.5"
            style={{ cursor: "ew-resize" }}
            onPointerDown={handlePointerDown("m1")}
          />
          <text x={m1SvgX} y={PAD.t - 4} textAnchor="middle" fill="var(--color-accent)" fontSize="19" fontWeight="bold">
            {markerX1 % 1 === 0 ? markerX1.toFixed(0) : markerX1.toFixed(1)}
          </text>
        </g>

        {/* Marker 2 */}
        <g>
          <line
            x1={m2SvgX} y1={PAD.t + 4} x2={m2SvgX} y2={baselineY}
            stroke="var(--color-warning)" strokeWidth="1.5" strokeDasharray="3 2"
          />
          <circle
            cx={m2SvgX}
            cy={PAD.t + 4}
            r={7}
            fill="var(--color-warning)"
            stroke="#0f172a"
            strokeWidth="1.5"
            style={{ cursor: "ew-resize" }}
            onPointerDown={handlePointerDown("m2")}
          />
          <text x={m2SvgX} y={PAD.t - 4} textAnchor="middle" fill="var(--color-warning)" fontSize="19" fontWeight="bold">
            {markerX2 % 1 === 0 ? markerX2.toFixed(0) : markerX2.toFixed(1)}
          </text>
        </g>
      </svg>

      {/* Z-score labels below */}
      <div className="flex justify-between mt-2 px-1 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
          <span className="text-[11px] text-[#94a3b8]">
            Marker 1: <span className="text-white font-semibold">z = {m1Z.toFixed(2)}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--color-warning)]" />
          <span className="text-[11px] text-[#94a3b8]">
            Marker 2: <span className="text-white font-semibold">z = {m2Z.toFixed(2)}</span>
          </span>
        </div>
        <div className="text-[11px] text-[#94a3b8]">
          Area:{" "}
          <span className="text-[var(--color-accent)] font-semibold">{(probability * 100).toFixed(2)}%</span>
        </div>
      </div>

    </div>
  );
}
