"use client";

import React from "react";
import { motion } from "framer-motion";
import type { OptimizerConfig, TrajectoryPoint } from "./types";
import { stepsToConverge, CONVERGE_THRESHOLD } from "./optimizerLogic";

interface Props {
  configs: OptimizerConfig[];
  trajectories: Record<string, TrajectoryPoint[]>;
}

function speedLabel(steps: number | null): { label: string; color: string } {
  if (steps === null) return { label: "Did not converge", color: "#ef4444" };
  if (steps <= 8) return { label: "Very Fast", color: "#3bb4a4" };
  if (steps <= 18) return { label: "Fast", color: "#d4af37" };
  if (steps <= 30) return { label: "Moderate", color: "#f59e0b" };
  return { label: "Slow", color: "#ef4444" };
}

export default function ConvergenceTable({ configs, trajectories }: Props) {
  const rows = configs.map((cfg) => {
    const traj = trajectories[cfg.id] ?? [];
    const steps = stepsToConverge(traj);
    const finalLoss = traj.length > 0 ? traj[traj.length - 1].loss : 0;
    const speed = speedLabel(steps);
    return { cfg, steps, finalLoss, speed };
  });

  // Sort by steps ascending (null = worst)
  const sorted = [...rows].sort((a, b) => {
    if (a.steps === null && b.steps === null) return 0;
    if (a.steps === null) return 1;
    if (b.steps === null) return -1;
    return a.steps - b.steps;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#1e293b]">
            <th className="text-left text-[11px] text-[#475569] font-semibold uppercase tracking-wider pb-2 pr-3">
              Rank
            </th>
            <th className="text-left text-[11px] text-[#475569] font-semibold uppercase tracking-wider pb-2 pr-3">
              Optimizer
            </th>
            <th className="text-left text-[11px] text-[#475569] font-semibold uppercase tracking-wider pb-2 pr-3">
              Steps to &lt;{CONVERGE_THRESHOLD} loss
            </th>
            <th className="text-left text-[11px] text-[#475569] font-semibold uppercase tracking-wider pb-2 pr-3">
              Final Loss
            </th>
            <th className="text-left text-[11px] text-[#475569] font-semibold uppercase tracking-wider pb-2">
              Speed
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <motion.tr
              key={row.cfg.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              className="border-b border-[#1e293b]/60 hover:bg-[#1e293b]/30 transition-colors"
            >
              <td className="py-2.5 pr-3">
                <span className="text-[#475569] font-mono text-xs">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                </span>
              </td>
              <td className="py-2.5 pr-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: row.cfg.color }}
                  />
                  <span className="font-medium text-white">{row.cfg.label}</span>
                </div>
              </td>
              <td className="py-2.5 pr-3">
                <span className="font-mono font-semibold text-white">
                  {row.steps !== null ? row.steps : "—"}
                </span>
              </td>
              <td className="py-2.5 pr-3">
                <span className="font-mono text-[#94a3b8] text-xs">
                  {row.finalLoss.toFixed(5)}
                </span>
              </td>
              <td className="py-2.5">
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    color: row.speed.color,
                    background: `${row.speed.color}18`,
                    border: `1px solid ${row.speed.color}40`,
                  }}
                >
                  {row.speed.label}
                </span>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
