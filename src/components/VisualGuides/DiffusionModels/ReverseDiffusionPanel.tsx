"use client";

import React, { useMemo } from "react";
import type { ScheduleId } from "./types";
import { ALPHA_BAR, T, forwardPoints } from "./types";
import PointCloud from "./PointCloud";

interface Props {
  reverseT: number;
  running: boolean;
  done: boolean;
  schedule: ScheduleId;
  onRun: () => void;
}

export default function ReverseDiffusionPanel({
  reverseT,
  running,
  done,
  schedule,
  onRun,
}: Props) {
  const points = useMemo(
    () => forwardPoints(reverseT, schedule),
    [reverseT, schedule]
  );
  const alphaBar = ALPHA_BAR[schedule][reverseT];

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
      <div className="mb-4">
        <p className="text-[13px] font-semibold text-white">
          Reverse Process: Denoising Step by Step
        </p>
        <p className="text-[11px] text-[#475569] mt-0.5">
          Watch the trajectory from pure noise (t = {T}) back to data (t = 0)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 rounded-xl border border-[#1e293b] bg-[#0f172a] p-2">
          <PointCloud
            points={points}
            ariaLabel={`Reverse process point cloud at timestep ${reverseT} of ${T}. ${
              reverseT === 0
                ? "Fully denoised: the spiral is recovered."
                : "Points are partway between noise and the spiral."
            }`}
          />
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onRun}
              disabled={running}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running
                ? "Denoising..."
                : done
                  ? "Run Reverse Again"
                  : "Run Reverse Process"}
            </button>
            <span className="text-[12px] font-mono text-[#94a3b8]">
              t = {reverseT}, alphaBar_t = {alphaBar.toFixed(4)}
            </span>
          </div>

          {done && !running && (
            <p
              className="text-[12px] font-semibold flex items-center gap-1.5"
              style={{ color: "var(--color-success)" }}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Reverse run complete: noise back to spiral.
            </p>
          )}

          <div
            className="rounded-xl border p-4"
            style={{
              borderColor: "color-mix(in srgb, var(--color-warning) 35%, transparent)",
              background: "color-mix(in srgb, var(--color-warning) 6%, transparent)",
            }}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-wide mb-1.5"
              style={{ color: "var(--color-warning)" }}
            >
              Honest Caveat
            </p>
            <p className="text-[11px] text-[#94a3b8] leading-relaxed">
              This panel uses the true data as a perfect denoiser to show the
              trajectory shape; real models ESTIMATE the noise with a trained
              network. We kept x0, so we can walk each point back along its
              exact forward path. A real diffusion model never sees x0 at
              sampling time: it must predict the noise at every step and can
              only approximate this trajectory.
            </p>
          </div>

          <div className="rounded-xl border border-[#1e293b] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-2">
              The Training Objective
            </p>
            <pre className="bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[11px] leading-relaxed rounded-lg p-3 overflow-x-auto">
              {`loss = MSE(eps, eps_hat)   where eps_hat = network(x_t, t)`}
            </pre>
            <p className="text-[11px] text-[#94a3b8] leading-relaxed mt-2">
              The network is trained to predict eps from (x_t, t). That is the
              whole objective: a plain regression on the noise. Sampling then
              repeatedly subtracts the predicted noise, moving from t = {T}{" "}
              down to t = 0.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
