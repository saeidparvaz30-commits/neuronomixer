"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { TRAINING_STEPS } from "./ganLogic";

interface Props {
  currentEpoch: number;
}

const W = 480;
const H = 220;
const PAD_L = 42;
const PAD_R = 16;
const PAD_T = 18;
const PAD_B = 36;
const CHART_W = W - PAD_L - PAD_R;
const CHART_H = H - PAD_T - PAD_B;

function toX(epoch: number): number {
  return PAD_L + (epoch / 30) * CHART_W;
}

function toY(value: number, min: number, max: number): number {
  return PAD_T + CHART_H - ((value - min) / (max - min)) * CHART_H;
}

function buildPath(
  points: { x: number; y: number }[],
  limit: number
): string {
  const pts = points.slice(0, limit + 1);
  if (pts.length === 0) return "";
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
}

export default function TrainingChart({ currentEpoch }: Props) {
  const yMin = 0;
  const yMax = 3;
  const nashY = toY(Math.LN2, yMin, yMax); // log(2) ≈ 0.693

  const gLossPoints = useMemo(
    () => TRAINING_STEPS.map((s) => ({ x: toX(s.epoch), y: toY(s.generatorLoss, yMin, yMax) })),
    []
  );
  const dLossPoints = useMemo(
    () => TRAINING_STEPS.map((s) => ({ x: toX(s.epoch), y: toY(s.discriminatorLoss, yMin, yMax) })),
    []
  );
  // D accuracy scaled to 0–1 range, displayed in the same chart scaled 0–1 mapped to yMin–yMax
  const dAccPoints = useMemo(
    () => TRAINING_STEPS.map((s) => ({ x: toX(s.epoch), y: toY(s.dAccuracy, yMin, yMax) })),
    []
  );

  const gPath = buildPath(gLossPoints, currentEpoch);
  const dPath = buildPath(dLossPoints, currentEpoch);
  const accPath = buildPath(dAccPoints, currentEpoch);

  // Y-axis ticks
  const yTicks = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0];

  return (
    <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-2xl p-5">
      <h2 className="text-base font-semibold text-white mb-1">Training Dynamics</h2>
      <p className="text-xs text-[#475569] mb-3">
        Watch losses converge toward log(2) ≈ 0.693 — the Nash equilibrium
      </p>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ minWidth: 300 }}
        >
          {/* Grid lines */}
          {yTicks.map((tick) => {
            const y = toY(tick, yMin, yMax);
            return (
              <g key={tick}>
                <line
                  x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                  stroke="#1e293b" strokeWidth={1}
                />
                <text x={PAD_L - 4} y={y + 3} textAnchor="end" fill="#475569" fontSize={8}>
                  {tick.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Nash equilibrium line */}
          <line
            x1={PAD_L} y1={nashY} x2={W - PAD_R} y2={nashY}
            stroke="#d4af37" strokeWidth={1} strokeDasharray="5 4" opacity={0.6}
          />
          <text x={W - PAD_R + 2} y={nashY + 3} fill="#d4af37" fontSize={7} fontWeight={600}>
            log(2)
          </text>

          {/* X axis */}
          <line
            x1={PAD_L} y1={PAD_T + CHART_H} x2={W - PAD_R} y2={PAD_T + CHART_H}
            stroke="#334155" strokeWidth={1}
          />
          {/* Y axis */}
          <line
            x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + CHART_H}
            stroke="#334155" strokeWidth={1}
          />

          {/* X ticks */}
          {[0, 5, 10, 15, 20, 25, 30].map((tick) => (
            <text
              key={tick}
              x={toX(tick)}
              y={PAD_T + CHART_H + 12}
              textAnchor="middle"
              fill="#475569"
              fontSize={8}
            >
              {tick}
            </text>
          ))}
          <text
            x={PAD_L + CHART_W / 2}
            y={H - 2}
            textAnchor="middle"
            fill="#475569"
            fontSize={8}
          >
            Epoch
          </text>

          {/* D Accuracy line (gold dashed) */}
          {accPath && (
            <motion.path
              d={accPath}
              fill="none"
              stroke="#d4af37"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3 }}
            />
          )}

          {/* D Loss line (blue) */}
          {dPath && (
            <motion.path
              d={dPath}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={2}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3 }}
            />
          )}

          {/* G Loss line (red-orange) */}
          {gPath && (
            <motion.path
              d={gPath}
              fill="none"
              stroke="#f97316"
              strokeWidth={2}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3 }}
            />
          )}

          {/* Current epoch marker */}
          {currentEpoch > 0 && (
            <line
              x1={toX(currentEpoch)} y1={PAD_T}
              x2={toX(currentEpoch)} y2={PAD_T + CHART_H}
              stroke="#475569" strokeWidth={1} strokeDasharray="3 3"
            />
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-2 justify-center">
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-[#f97316] inline-block" />
          <span className="text-[10px] text-[#94a3b8]">Generator Loss</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-[#3b82f6] inline-block" />
          <span className="text-[10px] text-[#94a3b8]">Discriminator Loss</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width={16} height={4} className="inline-block">
            <line x1={0} y1={2} x2={16} y2={2} stroke="#d4af37" strokeWidth={1.5} strokeDasharray="4 2" />
          </svg>
          <span className="text-[10px] text-[#94a3b8]">D Accuracy (0–1 scale)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width={16} height={4} className="inline-block">
            <line x1={0} y1={2} x2={16} y2={2} stroke="#d4af37" strokeWidth={1} strokeDasharray="4 3" opacity={0.6} />
          </svg>
          <span className="text-[10px] text-[#94a3b8]">Nash Equilibrium (log 2)</span>
        </div>
      </div>

      {currentEpoch >= 25 && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] text-[#3bb4a4] mt-2 text-center font-semibold"
        >
          Losses converging toward log(2) — approaching Nash equilibrium!
        </motion.p>
      )}
    </div>
  );
}
