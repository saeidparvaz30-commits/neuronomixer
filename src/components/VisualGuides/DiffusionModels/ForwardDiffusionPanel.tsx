"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import type { ScheduleId } from "./types";
import { ALPHA_BAR, NUM_POINTS, SCHEDULE_META, T, forwardPoints } from "./types";
import PointCloud from "./PointCloud";

interface Props {
  t: number;
  schedule: ScheduleId;
  onTChange: (t: number) => void;
  onScheduleChange: (s: ScheduleId) => void;
}

const SCHEDULES: ScheduleId[] = ["cosine", "linear"];

export default function ForwardDiffusionPanel({
  t,
  schedule,
  onTChange,
  onScheduleChange,
}: Props) {
  const points = useMemo(() => forwardPoints(t, schedule), [t, schedule]);
  const alphaBar = ALPHA_BAR[schedule][t];
  const signalCoef = Math.sqrt(alphaBar);
  const noiseCoef = Math.sqrt(1 - alphaBar);

  const stateDescription =
    t === 0
      ? "clean spiral, no noise"
      : t === T
        ? "pure Gaussian noise, all structure destroyed"
        : `partially noised spiral, signal weight ${signalCoef.toFixed(3)}, noise weight ${noiseCoef.toFixed(3)}`;

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[13px] font-semibold text-white">
            Forward Process: Destroying the Spiral
          </p>
          <p className="text-[11px] text-[#475569] mt-0.5">
            {NUM_POINTS} deterministic points, T = {T} timesteps
          </p>
        </div>

        {/* Schedule toggle */}
        <div
          className="inline-flex rounded-xl border border-[#1e293b] bg-[#0f172a] p-1 gap-1"
          role="radiogroup"
          aria-label="Noise schedule"
        >
          {SCHEDULES.map((s) => {
            const meta = SCHEDULE_META[s];
            const isActive = schedule === s;
            return (
              <button
                key={s}
                role="radio"
                aria-checked={isActive}
                aria-label={`${meta.label} noise schedule`}
                onClick={() => onScheduleChange(s)}
                className={`relative px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] ${
                  isActive ? "text-[#0a0e1a]" : "text-[#94a3b8] hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="diffusion-schedule-pill"
                    className="absolute inset-0 rounded-lg"
                    style={{ background: meta.color }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Plot */}
        <div className="lg:col-span-3 rounded-xl border border-[#1e293b] bg-[#0f172a] p-2">
          <PointCloud
            points={points}
            ariaLabel={`Point cloud at timestep ${t} of ${T}: ${stateDescription}`}
          />
        </div>

        {/* Controls + live math */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="diffusion-t-slider"
                className="text-[12px] font-semibold text-white"
              >
                Timestep t
              </label>
              <span className="text-[12px] font-mono text-[var(--color-accent)]">
                t = {t} / {T}
              </span>
            </div>
            <input
              id="diffusion-t-slider"
              type="range"
              min={0}
              max={T}
              step={1}
              value={t}
              onChange={(e) => onTChange(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: "var(--color-accent)" }}
              aria-valuetext={`Timestep ${t} of ${T}`}
            />
            <div className="flex justify-between text-[10px] text-[#475569] mt-1">
              <span>0 (clean data)</span>
              <span>{T} (pure noise)</span>
            </div>
          </div>

          <div className="rounded-xl border border-[#1e293b] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-2">
              Closed-Form Forward Process
            </p>
            <pre className="bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[11px] leading-relaxed rounded-lg p-3 overflow-x-auto">
              {`x_t = sqrt(alphaBar_t) * x0 + sqrt(1 - alphaBar_t) * eps

alphaBar_${t} = ${alphaBar.toFixed(4)}
x_${t} = ${signalCoef.toFixed(3)} * x0 + ${noiseCoef.toFixed(3)} * eps`}
            </pre>
            <p className="text-[11px] text-[#94a3b8] leading-relaxed mt-2">
              alphaBar_t is the cumulative product of the per-step alphas under
              the {SCHEDULE_META[schedule].label.toLowerCase()} schedule. Any
              noisy x_t can be sampled in one jump from x0, no need to loop
              through every step during training.
            </p>
          </div>

          <div className="rounded-xl border border-[#1e293b] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-2">
              What You Are Seeing
            </p>
            <p className="text-[11px] text-[#94a3b8] leading-relaxed">
              Each point keeps the same eps at every timestep, so dragging the
              slider moves every point along its own straight line between its
              data position and its noise position. At t = {T} the spiral is
              gone: the cloud is indistinguishable from an isotropic Gaussian.
              That destruction is exactly what the reverse process must undo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
