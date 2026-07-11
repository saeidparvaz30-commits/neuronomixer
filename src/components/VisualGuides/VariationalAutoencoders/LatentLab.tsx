"use client";

import React from "react";
import type { EmbeddedPoint, EvalMetrics } from "./vaeMath";
import { BETAS } from "./vaeMath";
import LatentCanvas from "./LatentCanvas";
import PixelImage from "./PixelImage";
import { BETA_COLORS } from "./TrainPanel";

interface Props {
  trained: boolean;
  betaIndex: number;
  onBetaChange: (i: number) => void;
  metricsAll: (EvalMetrics | null)[];
  points: readonly EmbeddedPoint[] | null;
  range: number;
  probe: [number, number] | null;
  onProbe: (z1: number, z2: number) => void;
  decodedProbe: number[] | null;
  a: [number, number] | null;
  b: [number, number] | null;
  tInterp: number | null;
}

export default function LatentLab({
  trained,
  betaIndex,
  onBetaChange,
  metricsAll,
  points,
  range,
  probe,
  onProbe,
  decodedProbe,
  a,
  b,
  tInterp,
}: Props) {
  const metrics = metricsAll[betaIndex];
  return (
    <div>
      {/* Beta slider */}
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <label
            htmlFor="vae-beta"
            className="text-[12px] font-semibold text-white"
          >
            Beta (KL weight)
          </label>
          <span
            className="text-[13px] font-mono font-bold"
            style={{ color: BETA_COLORS[betaIndex] }}
          >
            beta = {BETAS[betaIndex]}
          </span>
          <span className="text-[10px] text-[#475569]">
            snaps between the {BETAS.length} trained models
          </span>
        </div>
        <input
          id="vae-beta"
          type="range"
          min={0}
          max={BETAS.length - 1}
          step={1}
          value={betaIndex}
          disabled={!trained}
          onChange={(e) => onBetaChange(Number(e.target.value))}
          className="w-full max-w-[360px] accent-[#d4af37]"
        />
        <div className="flex justify-between w-full max-w-[360px] text-[10px] text-[#475569]">
          {BETAS.map((bv) => (
            <span key={bv}>{bv}</span>
          ))}
        </div>
      </div>

      {/* Live metrics for the selected beta */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] mb-1 uppercase tracking-wide">
            Reconstruction (BCE, nats/image)
          </p>
          <p className="text-[18px] font-mono font-bold text-[#3bb4a4]">
            {metrics ? metrics.bce.toFixed(2) : "?"}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            lower = sharper reconstructions
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] mb-1 uppercase tracking-wide">
            Reconstruction (MSE per pixel)
          </p>
          <p className="text-[18px] font-mono font-bold text-[#3bb4a4]">
            {metrics ? metrics.mse.toFixed(4) : "?"}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            same story in pixel units
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] mb-1 uppercase tracking-wide">
            KL to prior (nats/image)
          </p>
          <p className="text-[18px] font-mono font-bold text-[#a855f7]">
            {metrics ? metrics.kl.toFixed(2) : "?"}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            lower = latent hugs N(0, I), smoother map
          </p>
        </div>
      </div>

      {/* Comparison table across all betas */}
      {trained && (
        <div className="rounded-xl border border-[#1e293b] overflow-hidden mb-5">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]" style={{ borderCollapse: "collapse" }}>
              <caption className="sr-only">
                Reconstruction and KL metrics for each trained beta value
              </caption>
              <thead>
                <tr className="bg-[#1e293b] text-left">
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                    beta
                  </th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                    recon BCE (nats/image)
                  </th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                    recon MSE (per pixel)
                  </th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                    KL (nats/image)
                  </th>
                </tr>
              </thead>
              <tbody>
                {BETAS.map((bv, i) => {
                  const m = metricsAll[i];
                  const active = i === betaIndex;
                  return (
                    <tr
                      key={bv}
                      style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}
                    >
                      <td className="px-3 py-2">
                        <span
                          className={`font-mono font-bold ${active ? "" : "text-[#94a3b8]"}`}
                          style={active ? { color: BETA_COLORS[i] } : undefined}
                        >
                          {bv}
                          {active ? " (selected)" : ""}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-[#f1f5f9]">
                        {m ? m.bce.toFixed(2) : "?"}
                      </td>
                      <td className="px-3 py-2 font-mono text-[#f1f5f9]">
                        {m ? m.mse.toFixed(4) : "?"}
                      </td>
                      <td className="px-3 py-2 font-mono text-[#f1f5f9]">
                        {m ? m.kl.toFixed(2) : "?"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Canvas + decoded probe */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
        <LatentCanvas
          points={points}
          range={range}
          probe={probe}
          a={a}
          b={b}
          t={tInterp}
          disabled={!trained}
          onProbe={onProbe}
        />
        <div>
          <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-2">
            Decoded from z = ({probe ? probe[0].toFixed(2) : "?"},{" "}
            {probe ? probe[1].toFixed(2) : "?"})
          </p>
          <div className="rounded-xl border border-[#1e293b] p-3 mb-3">
            {decodedProbe ? (
              <PixelImage
                pixels={decodedProbe}
                ariaLabel={`Decoder output at latent point ${probe ? probe[0].toFixed(2) : ""}, ${probe ? probe[1].toFixed(2) : ""}`}
                className="w-full h-auto rounded-lg"
              />
            ) : (
              <div className="aspect-square flex items-center justify-center">
                <p className="text-[11px] text-[#475569] text-center px-4">
                  {trained
                    ? "Click the map or move the sliders to decode a point"
                    : "Train first"}
                </p>
              </div>
            )}
          </div>
          {/* Keyboard-friendly z sliders, synced with the canvas probe */}
          {(["z1", "z2"] as const).map((axis, ai) => (
            <div key={axis} className="mb-2">
              <label
                htmlFor={`vae-${axis}`}
                className="text-[11px] text-[#94a3b8] block mb-0.5"
              >
                {axis} = {probe ? probe[ai].toFixed(2) : "0.00"}
              </label>
              <input
                id={`vae-${axis}`}
                type="range"
                min={-range}
                max={range}
                step={0.05}
                disabled={!trained}
                value={probe ? probe[ai] : 0}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  const cur: [number, number] = probe ?? [0, 0];
                  onProbe(
                    ai === 0 ? v : cur[0],
                    ai === 1 ? v : cur[1]
                  );
                }}
                className="w-full accent-[#d4af37]"
              />
            </div>
          ))}
          <p className="text-[10px] text-[#475569] leading-relaxed mt-2">
            Every decoded image is a real forward pass through the trained
            decoder at the exact z you picked. Nothing is precomputed or
            looked up.
          </p>
        </div>
      </div>
    </div>
  );
}
