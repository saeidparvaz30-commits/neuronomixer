"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { normalCDF, areaUnderCurve, normalPDF } from "./types";

// ── SVG dimensions ─────────────────────────────────────────────────────────────
const VW = 480;
const VH = 110;
const PAD = { l: 16, r: 16, t: 14, b: 28 };
const IW = VW - PAD.l - PAD.r;
const IH = VH - PAD.t - PAD.b;
const CURVE_POINTS = 200;

type AreaMode = "between" | "left" | "right";

export default function AreaCalculator() {
  const [mode, setMode] = useState<AreaMode>("between");
  const [z1, setZ1] = useState(-1);
  const [z2, setZ2] = useState(1);

  const zMin = -4;
  const zMax = 4;
  const zRange = zMax - zMin;
  const maxPDF = normalPDF(0, 0, 1);

  const area =
    mode === "between"
      ? areaUnderCurve(z1, z2)
      : mode === "left"
      ? normalCDF(z1)
      : 1 - normalCDF(z1);

  // ── Curve ────────────────────────────────────────────────────────────────────
  const curvePoints: { x: number; y: number }[] = [];
  for (let i = 0; i <= CURVE_POINTS; i++) {
    const z = zMin + (i / CURVE_POINTS) * zRange;
    const pdf = normalPDF(z, 0, 1);
    curvePoints.push({
      x: PAD.l + ((z - zMin) / zRange) * IW,
      y: PAD.t + IH - (pdf / maxPDF) * IH,
    });
  }
  const curvePath = curvePoints
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" ");
  const baselineY = PAD.t + IH;

  function zToSvgX(z: number): number {
    return PAD.l + ((Math.max(zMin, Math.min(zMax, z)) - zMin) / zRange) * IW;
  }

  // ── Shaded path ───────────────────────────────────────────────────────────────
  function getShadedPath(loZ: number, hiZ: number): string {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= CURVE_POINTS; i++) {
      const z = zMin + (i / CURVE_POINTS) * zRange;
      if (z < loZ || z > hiZ) continue;
      const pdf = normalPDF(z, 0, 1);
      pts.push({ x: PAD.l + ((z - zMin) / zRange) * IW, y: PAD.t + IH - (pdf / maxPDF) * IH });
    }
    if (pts.length < 2) return "";
    const top = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
    return `${top} L${pts[pts.length - 1].x.toFixed(2)},${baselineY} L${pts[0].x.toFixed(2)},${baselineY} Z`;
  }

  const shadedPath =
    mode === "between"
      ? getShadedPath(Math.min(z1, z2), Math.max(z1, z2))
      : mode === "left"
      ? getShadedPath(zMin, z1)
      : getShadedPath(z1, zMax);

  const inputClass =
    "w-full bg-[#0f172a] border border-[#1e293b] rounded-lg px-2 py-1.5 text-[12px] text-white focus:outline-none focus:border-[#1e5d8a] transition-colors";
  const labelClass = "text-[9px] font-semibold uppercase tracking-[1px] text-[#475569] mb-1 block";

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <h3 className="text-[13px] font-bold text-white mb-1">Area Under the Curve</h3>
      <p className="text-[11px] text-[#475569] mb-4">
        Calculate exact probabilities from z-score boundaries
      </p>

      {/* Mode selector */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(["between", "left", "right"] as AreaMode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all capitalize"
            style={{
              borderColor: mode === m ? "#1e5d8a" : "#1e293b",
              color: mode === m ? "#3bb4a4" : "#475569",
              background: mode === m ? "#1e5d8a18" : "transparent",
            }}
          >
            {m === "between" ? "Between" : m === "left" ? "Left Tail (≤)" : "Right Tail (≥)"}
          </button>
        ))}
      </div>

      {/* Z-score inputs */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <label className={labelClass}>{mode === "between" ? "Lower z" : "z"}</label>
          <input
            type="number"
            value={z1}
            onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) setZ1(v); }}
            className={inputClass}
            step="0.1"
          />
        </div>
        {mode === "between" && (
          <div className="flex-1">
            <label className={labelClass}>Upper z</label>
            <input
              type="number"
              value={z2}
              onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) setZ2(v); }}
              className={inputClass}
              step="0.1"
            />
          </div>
        )}
        <div className="flex-1 flex flex-col justify-end">
          <motion.div
            key={area.toFixed(4)}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-[#1e293b] rounded-xl px-3 py-2 text-center"
          >
            <p className="text-[9px] text-[#475569] uppercase tracking-[1px] mb-0.5">Area</p>
            <p className="text-[16px] font-black text-[#d4af37]">{(area * 100).toFixed(2)}%</p>
          </motion.div>
        </div>
      </div>

      {/* Mini curve visualization */}
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        width="100%"
        role="img"
        aria-label="Area under normal curve"
        className="block"
      >
        <path d={`${curvePath} L${curvePoints[curvePoints.length - 1].x.toFixed(2)},${baselineY} L${curvePoints[0].x.toFixed(2)},${baselineY} Z`} fill="#1e5d8a" opacity={0.12} />
        {shadedPath && <path d={shadedPath} fill="#d4af37" opacity={0.35} />}
        <path d={curvePath} fill="none" stroke="#3bb4a4" strokeWidth="2" />
        <line x1={PAD.l} y1={baselineY} x2={VW - PAD.r} y2={baselineY} stroke="#334155" strokeWidth="1" />

        {/* Marker for z1 */}
        {(() => {
          const sx = zToSvgX(z1);
          return (
            <g>
              <line x1={sx} y1={PAD.t} x2={sx} y2={baselineY} stroke="#d4af37" strokeWidth="1.5" strokeDasharray="3 2" />
              <text x={sx} y={PAD.t - 2} textAnchor="middle" fill="#d4af37" fontSize="8" fontWeight="bold">
                {z1.toFixed(1)}
              </text>
            </g>
          );
        })()}

        {/* Marker for z2 (between mode) */}
        {mode === "between" && (() => {
          const sx = zToSvgX(z2);
          return (
            <g>
              <line x1={sx} y1={PAD.t} x2={sx} y2={baselineY} stroke="#f97316" strokeWidth="1.5" strokeDasharray="3 2" />
              <text x={sx} y={PAD.t - 2} textAnchor="middle" fill="#f97316" fontSize="8" fontWeight="bold">
                {z2.toFixed(1)}
              </text>
            </g>
          );
        })()}

        {/* X-axis labels */}
        {[-3, -2, -1, 0, 1, 2, 3].map(v => (
          <text
            key={v}
            x={zToSvgX(v)}
            y={baselineY + 11}
            textAnchor="middle"
            fill="#334155"
            fontSize="7.5"
          >
            {v}
          </text>
        ))}
      </svg>
    </div>
  );
}
