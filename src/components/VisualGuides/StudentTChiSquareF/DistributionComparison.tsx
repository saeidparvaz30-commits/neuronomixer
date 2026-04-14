"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  tPDF,
  normalPDF,
  chiSquarePDF,
  fPDF,
  generatePoints,
  pointsToSVGPath,
} from "./types";
import DegreesOfFreedomSlider from "./DegreesOfFreedomSlider";

// ── Helpers ───────────────────────────────────────────────────────────────────

const SVG_W = 600;
const SVG_H = 240;
const PAD_X = 30;
const PAD_Y = 20;

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] px-3 py-2 flex flex-col gap-0.5 min-w-[90px]">
      <span className="text-[9px] uppercase tracking-[1.5px] font-semibold text-[#475569]">
        {label}
      </span>
      <span className="text-[12px] font-mono font-bold" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

// ── T sub-component ───────────────────────────────────────────────────────────

interface TTabProps {
  tDF: number;
  onTDFChange: (v: number) => void;
}

function TTab({ tDF, onTDFChange }: TTabProps) {
  const tColor = "#3bb4a4";
  const normalColor = "#475569";

  const { tPath, normalPath, yMax } = useMemo(() => {
    const xMin = -5;
    const xMax = 5;
    const tPts = generatePoints((x) => tPDF(x, tDF), xMin, xMax);
    const normPts = generatePoints(normalPDF, xMin, xMax);
    const yMax =
      Math.max(...tPts.map(([, y]) => y), ...normPts.map(([, y]) => y)) * 1.1;
    return {
      tPath: pointsToSVGPath(tPts, SVG_W, SVG_H, xMin, xMax, yMax),
      normalPath: pointsToSVGPath(normPts, SVG_W, SVG_H, xMin, xMax, yMax),
      yMax,
    };
  }, [tDF]);

  const variance =
    tDF > 2 ? (tDF / (tDF - 2)).toFixed(3) : tDF === 2 ? "∞" : "undefined";

  return (
    <div className="flex flex-col gap-5">
      {/* Chart */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0a0e1a] p-4 relative">
        <div className="flex items-center gap-4 mb-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-0.5 rounded" style={{ background: tColor }} />
            <span className="text-[10px] text-[#94a3b8]">
              t-distribution (df = {tDF})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-8 h-0.5 rounded"
              style={{
                background: normalColor,
                borderTop: "2px dashed #475569",
              }}
            />
            <span className="text-[10px] text-[#94a3b8]">Normal(0,1)</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tDF}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className="w-full"
              style={{ height: SVG_H }}
              aria-label={`t-distribution curve with df=${tDF} overlaid on standard normal`}
            >
              {/* Axis */}
              <line
                x1={0}
                y1={SVG_H - PAD_Y}
                x2={SVG_W}
                y2={SVG_H - PAD_Y}
                stroke="#1e293b"
                strokeWidth={1}
              />
              {/* Zero line */}
              <line
                x1={SVG_W / 2}
                y1={0}
                x2={SVG_W / 2}
                y2={SVG_H - PAD_Y}
                stroke="#1e293b"
                strokeWidth={1}
                strokeDasharray="4 4"
              />

              {/* Normal curve (dashed, behind) */}
              <path
                d={normalPath}
                fill="none"
                stroke={normalColor}
                strokeWidth={1.5}
                strokeDasharray="6 4"
                opacity={0.6}
              />

              {/* t curve (solid, front) */}
              <path
                d={tPath}
                fill="none"
                stroke={tColor}
                strokeWidth={2.5}
              />

              {/* Tail annotation for low df */}
              {tDF <= 5 && (
                <>
                  <text
                    x={PAD_X}
                    y={SVG_H * 0.35}
                    fill={tColor}
                    fontSize={9}
                    opacity={0.8}
                  >
                    heavier
                  </text>
                  <text
                    x={PAD_X}
                    y={SVG_H * 0.35 + 11}
                    fill={tColor}
                    fontSize={9}
                    opacity={0.8}
                  >
                    tail
                  </text>
                  <text
                    x={SVG_W - PAD_X - 38}
                    y={SVG_H * 0.35}
                    fill={tColor}
                    fontSize={9}
                    opacity={0.8}
                  >
                    heavier
                  </text>
                  <text
                    x={SVG_W - PAD_X - 38}
                    y={SVG_H * 0.35 + 11}
                    fill={tColor}
                    fontSize={9}
                    opacity={0.8}
                  >
                    tail
                  </text>
                </>
              )}

              {/* X-axis labels */}
              {[-4, -2, 0, 2, 4].map((v) => {
                const cx = ((v + 5) / 10) * SVG_W;
                return (
                  <text
                    key={v}
                    x={cx}
                    y={SVG_H - 4}
                    textAnchor="middle"
                    fill="#475569"
                    fontSize={9}
                  >
                    {v}
                  </text>
                );
              })}
            </svg>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Slider */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0a0e1a] p-4">
        <DegreesOfFreedomSlider
          label="Degrees of Freedom"
          value={tDF}
          min={1}
          max={50}
          onChange={onTDFChange}
          color={tColor}
          hint="As df → ∞, t → Normal"
        />
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-2">
        <StatPill label="Mean" value="0" color={tColor} />
        <StatPill label="Variance" value={variance} color={tColor} />
        <StatPill
          label="Support"
          value="(-∞, +∞)"
          color={tColor}
        />
        <StatPill
          label="Symmetry"
          value="Symmetric"
          color={tColor}
        />
      </div>

      {tDF <= 3 && (
        <p className="text-[11px] text-[#94a3b8] italic">
          Low df → very heavy tails. t-critical values are much larger than z-critical values.
        </p>
      )}
    </div>
  );
}

// ── Chi-Square sub-component ──────────────────────────────────────────────────

interface ChiSquareTabProps {
  chiSquareDF: number;
  onChiSquareDFChange: (v: number) => void;
}

function ChiSquareTab({ chiSquareDF, onChiSquareDFChange }: ChiSquareTabProps) {
  const color = "#d4af37";

  const { chiPath, xMax } = useMemo(() => {
    const xMax = Math.max(chiSquareDF * 3 + 5, 10);
    const pts = generatePoints(
      (x) => chiSquarePDF(x, chiSquareDF),
      0.01,
      xMax
    );
    const yMax = Math.max(...pts.map(([, y]) => y)) * 1.1 || 1;
    return {
      chiPath: pointsToSVGPath(pts, SVG_W, SVG_H, 0, xMax, yMax),
      xMax,
    };
  }, [chiSquareDF]);

  const variance = 2 * chiSquareDF;
  const mode =
    chiSquareDF >= 2 ? chiSquareDF - 2 : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Chart */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0a0e1a] p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-0.5 rounded" style={{ background: color }} />
          <span className="text-[10px] text-[#94a3b8]">
            Chi-square (df = {chiSquareDF})
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={chiSquareDF}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className="w-full"
              style={{ height: SVG_H }}
              aria-label={`Chi-square distribution curve with df=${chiSquareDF}`}
            >
              {/* Axis */}
              <line
                x1={0}
                y1={SVG_H - PAD_Y}
                x2={SVG_W}
                y2={SVG_H - PAD_Y}
                stroke="#1e293b"
                strokeWidth={1}
              />

              {/* Chi-square fill */}
              <path
                d={
                  chiPath +
                  ` L${SVG_W},${SVG_H - PAD_Y} L0,${SVG_H - PAD_Y} Z`
                }
                fill={color + "18"}
              />

              {/* Chi-square curve */}
              <path
                d={chiPath}
                fill="none"
                stroke={color}
                strokeWidth={2.5}
              />

              {/* Mean marker */}
              {(() => {
                const meanX = (chiSquareDF / xMax) * SVG_W;
                const inBounds = meanX > 0 && meanX < SVG_W;
                return inBounds ? (
                  <g>
                    <line
                      x1={meanX}
                      y1={PAD_Y}
                      x2={meanX}
                      y2={SVG_H - PAD_Y}
                      stroke={color}
                      strokeWidth={1}
                      strokeDasharray="4 3"
                      opacity={0.6}
                    />
                    <text
                      x={meanX + 4}
                      y={PAD_Y + 14}
                      fill={color}
                      fontSize={9}
                      opacity={0.8}
                    >
                      mean={chiSquareDF}
                    </text>
                  </g>
                ) : null;
              })()}

              {/* X-axis labels */}
              {[0, Math.round(xMax / 4), Math.round(xMax / 2), Math.round((3 * xMax) / 4), Math.round(xMax)].map(
                (v) => {
                  const cx = (v / xMax) * SVG_W;
                  return (
                    <text
                      key={v}
                      x={cx}
                      y={SVG_H - 4}
                      textAnchor="middle"
                      fill="#475569"
                      fontSize={9}
                    >
                      {v}
                    </text>
                  );
                }
              )}
            </svg>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Slider */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0a0e1a] p-4">
        <DegreesOfFreedomSlider
          label="Degrees of Freedom"
          value={chiSquareDF}
          min={1}
          max={20}
          onChange={onChiSquareDFChange}
          color={color}
          hint="Larger df → approaches normal shape"
        />
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-2">
        <StatPill label="Mean" value={String(chiSquareDF)} color={color} />
        <StatPill label="Variance" value={String(variance)} color={color} />
        <StatPill label="Mode" value={String(mode)} color={color} />
        <StatPill label="Support" value="[0, +∞)" color={color} />
        <StatPill
          label="Shape"
          value={chiSquareDF === 1 ? "J-shaped" : chiSquareDF <= 2 ? "Strongly right-skewed" : "Right-skewed"}
          color={color}
        />
      </div>
    </div>
  );
}

// ── F-distribution sub-component ─────────────────────────────────────────────

interface FTabProps {
  fDF1: number;
  fDF2: number;
  onFDF1Change: (v: number) => void;
  onFDF2Change: (v: number) => void;
}

function FTab({ fDF1, fDF2, onFDF1Change, onFDF2Change }: FTabProps) {
  const color = "#1e5d8a";
  const colorBright = "#4a9fd5";

  const { fPath, xMax } = useMemo(() => {
    const xMax = Math.max(4, fDF1 > 1 ? (fDF2 / (fDF2 - 2)) * 4 : 6);
    const pts = generatePoints(
      (x) => fPDF(x, fDF1, fDF2),
      0.01,
      xMax
    );
    const yMax = Math.max(...pts.map(([, y]) => y)) * 1.1 || 1;
    return {
      fPath: pointsToSVGPath(pts, SVG_W, SVG_H, 0, xMax, yMax),
      xMax,
    };
  }, [fDF1, fDF2]);

  const meanF = fDF2 > 2 ? (fDF2 / (fDF2 - 2)).toFixed(3) : "undefined";
  const modeF =
    fDF1 > 2
      ? (((fDF1 - 2) / fDF1) * (fDF2 / (fDF2 + 2))).toFixed(3)
      : "0";

  return (
    <div className="flex flex-col gap-5">
      {/* Chart */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0a0e1a] p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-0.5 rounded" style={{ background: colorBright }} />
          <span className="text-[10px] text-[#94a3b8]">
            F(df1={fDF1}, df2={fDF2})
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${fDF1}-${fDF2}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className="w-full"
              style={{ height: SVG_H }}
              aria-label={`F-distribution curve with df1=${fDF1} and df2=${fDF2}`}
            >
              <line
                x1={0}
                y1={SVG_H - PAD_Y}
                x2={SVG_W}
                y2={SVG_H - PAD_Y}
                stroke="#1e293b"
                strokeWidth={1}
              />

              {/* F fill */}
              <path
                d={
                  fPath +
                  ` L${SVG_W},${SVG_H - PAD_Y} L0,${SVG_H - PAD_Y} Z`
                }
                fill={colorBright + "18"}
              />

              {/* F curve */}
              <path
                d={fPath}
                fill="none"
                stroke={colorBright}
                strokeWidth={2.5}
              />

              {/* X-axis labels */}
              {[0, 1, 2, 3, Math.round(xMax)].map((v) => {
                const cx = (v / xMax) * SVG_W;
                return (
                  <text
                    key={v}
                    x={cx}
                    y={SVG_H - 4}
                    textAnchor="middle"
                    fill="#475569"
                    fontSize={9}
                  >
                    {v}
                  </text>
                );
              })}
            </svg>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sliders */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0a0e1a] p-4 flex flex-col gap-5">
        <DegreesOfFreedomSlider
          label="Numerator df₁"
          value={fDF1}
          min={1}
          max={10}
          onChange={onFDF1Change}
          color={colorBright}
          hint="Numerator degrees of freedom"
        />
        <DegreesOfFreedomSlider
          label="Denominator df₂"
          value={fDF2}
          min={1}
          max={30}
          onChange={onFDF2Change}
          color={colorBright}
          hint="Denominator degrees of freedom"
        />
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-2">
        <StatPill label="Mean" value={meanF} color={colorBright} />
        <StatPill label="Mode" value={modeF} color={colorBright} />
        <StatPill label="Support" value="[0, +∞)" color={colorBright} />
        <StatPill label="Shape" value="Right-skewed" color={colorBright} />
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface DistributionComparisonProps {
  activeDistribution: "t" | "chi-square" | "f";
  tDF: number;
  chiSquareDF: number;
  fDF1: number;
  fDF2: number;
  onTDFChange: (v: number) => void;
  onChiSquareDFChange: (v: number) => void;
  onFDF1Change: (v: number) => void;
  onFDF2Change: (v: number) => void;
}

export default function DistributionComparison({
  activeDistribution,
  tDF,
  chiSquareDF,
  fDF1,
  fDF2,
  onTDFChange,
  onChiSquareDFChange,
  onFDF1Change,
  onFDF2Change,
}: DistributionComparisonProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeDistribution}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.3 }}
      >
        {activeDistribution === "t" && (
          <TTab tDF={tDF} onTDFChange={onTDFChange} />
        )}
        {activeDistribution === "chi-square" && (
          <ChiSquareTab
            chiSquareDF={chiSquareDF}
            onChiSquareDFChange={onChiSquareDFChange}
          />
        )}
        {activeDistribution === "f" && (
          <FTab
            fDF1={fDF1}
            fDF2={fDF2}
            onFDF1Change={onFDF1Change}
            onFDF2Change={onFDF2Change}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
