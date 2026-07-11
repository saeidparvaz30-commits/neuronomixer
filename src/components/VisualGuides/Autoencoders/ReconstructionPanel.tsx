"use client";

import React from "react";
import { IMG_SIZE } from "./autoencoderMath";
import PixelGrid, { grayShade, errorShade } from "./PixelGrid";

interface Props {
  pixels: readonly number[];
  xhat: readonly number[];
  z: readonly number[];
  mseValue: number;
  errors: readonly number[];
  maxErr: { index: number; value: number };
  trained: boolean;
  width: number;
}

const BAR_H = 72;

/**
 * Side-by-side input vs reconstruction with a per-pixel error heatmap,
 * the live MSE, and the latent code the image was squeezed into.
 * Every number here is computed by autoencoderMath from the current
 * canvas pixels and the active weights.
 */
export default function ReconstructionPanel({
  pixels,
  xhat,
  z,
  mseValue,
  errors,
  maxErr,
  trained,
  width,
}: Props) {
  const maxRow = Math.floor(maxErr.index / IMG_SIZE) + 1;
  const maxCol = (maxErr.index % IMG_SIZE) + 1;
  const zText = z.map((v) => v.toFixed(2)).join(", ");

  return (
    <div className="space-y-5">
      {!trained && (
        <p className="rounded-xl border border-[var(--color-warning)]/30 bg-[#f97316]/5 px-3 py-2 text-[12px] text-[var(--color-warning)]">
          Untrained network: the reconstruction below comes from the deterministic
          starting weights, before any learning. Run training to watch it sharpen.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide mb-2">
            Input (64 pixels)
          </p>
          <PixelGrid
            values={pixels}
            shade={grayShade}
            ariaLabel="The current input image on the canvas"
          />
        </div>
        <div>
          <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide mb-2">
            Reconstruction {trained ? "" : "(untrained)"}
          </p>
          <PixelGrid
            values={xhat}
            shade={grayShade}
            ariaLabel={`The network's reconstruction of the input from ${width} latent ${width === 1 ? "number" : "numbers"}`}
          />
        </div>
        <div>
          <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide mb-2">
            Per-pixel error (abs)
          </p>
          <PixelGrid
            values={errors}
            shade={errorShade}
            ariaLabel={`Per-pixel absolute error heatmap. Largest error ${maxErr.value.toFixed(2)} at row ${maxRow}, column ${maxCol}`}
          />
          <p className="text-[10px] text-[#475569] mt-1.5 leading-relaxed">
            Darker means accurate, brighter red means wrong. Largest error:{" "}
            <span className="font-mono text-[#94a3b8]">{maxErr.value.toFixed(2)}</span> at
            row {maxRow}, col {maxCol}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-start">
        {/* Live MSE */}
        <div className="rounded-2xl border border-[#1e293b] p-4 min-w-[150px]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-accent)] mb-1">
            MSE
          </p>
          <p className="text-3xl font-black text-[var(--color-accent)]">
            {mseValue.toFixed(4)}
          </p>
          <p className="text-[10px] text-[#475569] leading-relaxed mt-1">
            Mean squared error between input and reconstruction, over all 64 pixels,
            recomputed on every edit.
          </p>
        </div>

        {/* Latent code */}
        <div className="rounded-2xl border border-[#1e293b] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#3bb4a4] mb-2">
            The bottleneck: this whole image, as {width} {width === 1 ? "number" : "numbers"}
          </p>
          <div
            className="flex items-end gap-1.5"
            role="img"
            aria-label={`Latent code with ${width} values: ${zText}`}
          >
            {z.map((v, j) => {
              const h = Math.max(2, Math.abs(v) * (BAR_H / 2));
              const up = v >= 0;
              return (
                <div key={j} className="flex flex-col items-center gap-1" style={{ width: 24 }}>
                  <div
                    className="relative w-4"
                    style={{ height: BAR_H }}
                    title={`z${j + 1} = ${v.toFixed(3)}`}
                  >
                    <div className="absolute left-0 right-0 border-t border-[#334155]" style={{ top: BAR_H / 2 }} />
                    <div
                      className="absolute left-0 right-0 rounded-sm"
                      style={{
                        background: "#3bb4a4",
                        height: Number(h.toFixed(1)),
                        top: up ? Number((BAR_H / 2 - h).toFixed(1)) : BAR_H / 2,
                      }}
                    />
                  </div>
                  {width <= 8 && (
                    <span className="text-[9px] font-mono text-[#94a3b8]">{v.toFixed(2)}</span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-[#475569] leading-relaxed mt-2">
            Each bar is one tanh latent value in [-1, 1] (baseline is zero). The decoder
            rebuilds all 64 pixels from these {width} {width === 1 ? "number" : "numbers"}{" "}
            alone. This latent code is exactly what variational autoencoders turn into a
            probability distribution.
          </p>
        </div>
      </div>
    </div>
  );
}
