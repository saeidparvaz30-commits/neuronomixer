"use client";

import React from "react";
import type { ScheduleId } from "./types";
import { ALPHA_BAR, SCHEDULE_META, T } from "./types";

interface Props {
  schedule: ScheduleId;
  t: number;
}

const W = 320;
const H = 150;
const PAD_L = 30;
const PAD_R = 10;
const PAD_T = 10;
const PAD_B = 24;

function xPos(t: number): number {
  return PAD_L + (t / T) * (W - PAD_L - PAD_R);
}

function yPos(alphaBar: number): number {
  return PAD_T + (1 - alphaBar) * (H - PAD_T - PAD_B);
}

function pathFor(values: readonly number[]): string {
  return values
    .map((v, t) => `${t === 0 ? "M" : "L"} ${xPos(t).toFixed(2)} ${yPos(v).toFixed(2)}`)
    .join(" ");
}

export default function NoiseSchedulePanel({ schedule, t }: Props) {
  const activeAlphaBar = ALPHA_BAR[schedule][t];

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
      <p className="text-[13px] font-semibold text-white mb-1">
        Noise Schedule Intuition
      </p>
      <p className="text-[12px] text-[#475569] leading-relaxed mb-4">
        The schedule decides how fast alphaBar_t falls from 1 (all signal) to
        near 0 (all noise). Both curves below are computed from the actual
        schedules used by the slider above.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-center">
        <div>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Line chart of alphaBar versus timestep for the cosine and linear schedules. At the current timestep ${t}, the active ${SCHEDULE_META[schedule].label.toLowerCase()} schedule gives alphaBar equal to ${activeAlphaBar.toFixed(3)}.`}
            className="w-full"
          >
            {/* axes */}
            <line x1={PAD_L} y1={yPos(1)} x2={PAD_L} y2={yPos(0)} stroke="#334155" strokeWidth={1} />
            <line x1={PAD_L} y1={yPos(0)} x2={W - PAD_R} y2={yPos(0)} stroke="#334155" strokeWidth={1} />
            <text x={PAD_L - 6} y={yPos(1) + 4} fill="#475569" fontSize={10} textAnchor="end">1</text>
            <text x={PAD_L - 6} y={yPos(0) + 4} fill="#475569" fontSize={10} textAnchor="end">0</text>
            <text x={xPos(0)} y={H - 8} fill="#475569" fontSize={10} textAnchor="middle">t = 0</text>
            <text x={xPos(T)} y={H - 8} fill="#475569" fontSize={10} textAnchor="middle">t = {T}</text>

            {/* curves */}
            {(Object.keys(SCHEDULE_META) as ScheduleId[]).map((s) => (
              <path
                key={s}
                d={pathFor(ALPHA_BAR[s])}
                fill="none"
                stroke={SCHEDULE_META[s].color}
                strokeWidth={s === schedule ? 2 : 1.2}
                strokeOpacity={s === schedule ? 1 : 0.45}
                strokeDasharray={s === schedule ? undefined : "3 3"}
              />
            ))}

            {/* current position marker on active schedule */}
            <circle
              cx={xPos(t)}
              cy={yPos(activeAlphaBar)}
              r={3.5}
              fill="var(--color-accent)"
            />
          </svg>
          <div className="flex items-center gap-4 mt-2">
            {(Object.keys(SCHEDULE_META) as ScheduleId[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
                <span
                  className="inline-block w-3 h-0.5"
                  style={{ background: SCHEDULE_META[s].color }}
                />
                {SCHEDULE_META[s].label}
                {s === schedule && (
                  <span className="text-[10px] text-[var(--color-accent)]">(active)</span>
                )}
              </span>
            ))}
          </div>
        </div>

        <div className="text-[12px] text-[#94a3b8] leading-relaxed space-y-3">
          <p>
            A schedule that destroys structure too quickly wastes most of its
            timesteps on pure noise, where there is nothing left to learn. One
            that is too slow wastes steps on nearly clean data, where the
            denoising task is trivial.
          </p>
          <p>
            The cosine schedule was proposed exactly because the linear one
            spends too many late steps at very low alphaBar. You can verify
            that on the chart: the dashed linear curve dives early, while the
            cosine curve spreads the destruction more evenly across all {T}{" "}
            steps. Flip the toggle above and watch how the same slider
            position produces a different amount of noise.
          </p>
        </div>
      </div>
    </div>
  );
}
