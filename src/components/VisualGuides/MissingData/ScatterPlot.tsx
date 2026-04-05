"use client";

import React from "react";
import { motion } from "framer-motion";
import { Row, Strategy, ORIGINAL_ROWS, DROPPED_IDS } from "./types";

type Props = { rows: Row[]; strategy: Strategy };

const W = 320, H = 260, PAD = 36;

// Feature_A range: 38–54, Feature_B range: 19–27
const AX_MIN = 36, AX_MAX = 55, AY_MIN = 18, AY_MAX = 27;

function toX(v: number) { return PAD + ((v - AX_MIN) / (AX_MAX - AX_MIN)) * (W - PAD * 2); }
function toY(v: number) { return H - PAD - ((v - AY_MIN) / (AY_MAX - AY_MIN)) * (H - PAD * 2); }

// 5 axis ticks
function xTicks() { return [38, 41, 44, 47, 50, 53]; }
function yTicks() { return [19, 21, 23, 25, 27]; }

function ScatterPlotInner({ rows, strategy }: Props) {
  const isDropped = (id: number) => strategy === "drop-rows" && DROPPED_IDS.has(id);
  const isImputed = (row: Row)  => !!(row.imputed?.featureA || row.imputed?.featureB);

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-2">Distribution: Feature_A vs Feature_B</p>
      <div
        role="img"
        aria-label="Scatter plot of Feature A vs Feature B showing class distribution"
        className="rounded-xl border border-[#1e293b] bg-[#0f172a] overflow-hidden"
      >
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block">
          {/* Grid */}
          {xTicks().map((v) => (
            <line key={`gx-${v}`} x1={toX(v)} y1={PAD} x2={toX(v)} y2={H - PAD} stroke="#1e293b" strokeWidth="1" />
          ))}
          {yTicks().map((v) => (
            <line key={`gy-${v}`} x1={PAD} y1={toY(v)} x2={W - PAD} y2={toY(v)} stroke="#1e293b" strokeWidth="1" />
          ))}

          {/* Axes */}
          <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#334155" strokeWidth="1" />
          <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#334155" strokeWidth="1" />

          {/* Axis labels */}
          <text x={W / 2} y={H - 4} textAnchor="middle" fontSize="9" fill="#475569" fontFamily="Inter, sans-serif">Feature_A</text>
          <text x={10} y={H / 2} textAnchor="middle" fontSize="9" fill="#475569" fontFamily="Inter, sans-serif" transform={`rotate(-90,10,${H / 2})`}>Feature_B</text>

          {/* Tick labels */}
          {xTicks().map((v) => (
            <text key={`xl-${v}`} x={toX(v)} y={H - PAD + 11} textAnchor="middle" fontSize="7" fill="#334155" fontFamily="monospace">{v}</text>
          ))}
          {yTicks().map((v) => (
            <text key={`yl-${v}`} x={PAD - 4} y={toY(v) + 3} textAnchor="end" fontSize="7" fill="#334155" fontFamily="monospace">{v}</text>
          ))}

          {/* Ghost original points (always shown, faded) */}
          {ORIGINAL_ROWS.map((orig) => {
            if (orig.featureA === null || orig.featureB === null) return null;
            return (
              <circle key={`ghost-${orig.id}`} cx={toX(orig.featureA)} cy={toY(orig.featureB)}
                r="5" fill={orig.target === 0 ? "#ef4444" : "#3b82f6"} opacity="0.08" />
            );
          })}

          {/* Active points */}
          {rows.map((row) => {
            const fA = row.featureA;
            const fB = row.featureB;
            if (fA === null || fB === null) return null;
            const dropped = isDropped(row.id);
            const imp     = isImputed(row);
            const color   = row.target === 0 ? "#ef4444" : "#3b82f6";

            return (
              <motion.circle
                key={row.id}
                fill={color}
                stroke={imp ? "#ffffff" : "none"}
                strokeWidth={imp ? 1 : 0}
                animate={{
                  cx:      toX(fA),
                  cy:      toY(fB),
                  opacity: dropped ? 0 : 1,
                  r:       imp ? 7 : 6,
                }}
                initial={{
                  cx:      toX(fA),
                  cy:      toY(fB),
                  opacity: 1,
                  r:       6,
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              >
                <title>{`Row ${row.id} — Feature_A: ${fA}, Feature_B: ${fB}`}</title>
              </motion.circle>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-2">
        {[{ label: "Class 0", color: "#ef4444" }, { label: "Class 1", color: "#3b82f6" }].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: l.color }} />
            <span className="text-[10px] text-[#94a3b8]">{l.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#94a3b8] opacity-15" />
          <span className="text-[10px] text-[#94a3b8]">Original (ghost)</span>
        </div>
        {strategy && strategy !== "drop-rows" && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border border-white/60 bg-[#3b82f6]/50" />
            <span className="text-[10px] text-[#94a3b8]">Imputed point</span>
          </div>
        )}
      </div>
    </div>
  );
}

const ScatterPlot = React.memo(ScatterPlotInner);
export default ScatterPlot;
