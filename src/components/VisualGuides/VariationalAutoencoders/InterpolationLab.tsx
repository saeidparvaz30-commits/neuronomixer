"use client";

import React from "react";
import { FRAME_TS, CLASS_NAMES, DATASET } from "./vaeMath";
import PixelImage from "./PixelImage";
import { CLASS_COLORS } from "./LatentCanvas";

/** Dataset indices offered as interpolation endpoints (2 per class). */
export const ENDPOINT_CHOICES: readonly number[] = [0, 30, 60, 90, 120, 150];

export function endpointLabel(idx: number): string {
  const cls = DATASET[idx].cls;
  const n = ENDPOINT_CHOICES.filter(
    (c) => DATASET[c].cls === cls && c <= idx
  ).length;
  return `${CLASS_NAMES[cls]} ${n}`;
}

function EndpointPicker({
  name,
  selected,
  onSelect,
  disabled,
}: {
  name: "A" | "B";
  selected: number;
  onSelect: (idx: number) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-2">
        Endpoint {name}
      </p>
      <div
        role="radiogroup"
        aria-label={`Interpolation endpoint ${name}`}
        className="flex flex-wrap gap-2"
      >
        {ENDPOINT_CHOICES.map((idx) => {
          const active = selected === idx;
          return (
            <button
              key={idx}
              role="radio"
              aria-checked={active}
              aria-label={`${endpointLabel(idx)} as endpoint ${name}`}
              disabled={disabled}
              onClick={() => onSelect(idx)}
              className={`rounded-lg border p-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                active
                  ? "border-[var(--color-accent)]"
                  : "border-[#1e293b] hover:border-[#334155]"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <PixelImage
                pixels={DATASET[idx].x}
                ariaLabel={`Dataset image: ${endpointLabel(idx)}`}
                className="w-11 h-11 rounded"
              />
              <span
                className="block text-[9px] mt-0.5 font-semibold"
                style={{ color: CLASS_COLORS[DATASET[idx].cls] }}
              >
                {endpointLabel(idx)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface Props {
  trained: boolean;
  aIdx: number;
  bIdx: number;
  onSelectA: (idx: number) => void;
  onSelectB: (idx: number) => void;
  t: number;
  onTChange: (t: number) => void;
  /** Decoded frames at FRAME_TS along the A to B segment. */
  frames: number[][] | null;
  /** Decoded image at the current t. */
  current: number[] | null;
  gateDone: boolean;
}

export default function InterpolationLab({
  trained,
  aIdx,
  bIdx,
  onSelectA,
  onSelectB,
  t,
  onTChange,
  frames,
  current,
  gateDone,
}: Props) {
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <EndpointPicker
          name="A"
          selected={aIdx}
          onSelect={onSelectA}
          disabled={!trained}
        />
        <EndpointPicker
          name="B"
          selected={bIdx}
          onSelect={onSelectB}
          disabled={!trained}
        />
      </div>

      {/* t slider */}
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <label
            htmlFor="vae-interp-t"
            className="text-[12px] font-semibold text-white"
          >
            Interpolation position t
          </label>
          <span className="text-[13px] font-mono font-bold text-[var(--color-success)]">
            t = {t.toFixed(2)}
          </span>
          <span className="text-[10px] text-[#475569]">
            z(t) = (1 - t) &middot; mu_A + t &middot; mu_B, decoded live
          </span>
          {!gateDone && trained && (
            <span className="text-[10px] text-[var(--color-warning)]">
              sweep all the way to both ends to complete this step
            </span>
          )}
        </div>
        <input
          id="vae-interp-t"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={t}
          disabled={!trained}
          onChange={(e) => onTChange(Number(e.target.value))}
          className="w-full max-w-[480px] accent-[#22c55e]"
        />
        <div className="flex justify-between w-full max-w-[480px] text-[10px] text-[#475569]">
          <span>A</span>
          <span>B</span>
        </div>
      </div>

      {/* Live decode at t plus fixed frame strip */}
      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-5">
        <div>
          <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-2">
            Decoded at t = {t.toFixed(2)}
          </p>
          <div className="rounded-xl border border-[#1e293b] p-3">
            {current ? (
              <PixelImage
                pixels={current}
                ariaLabel={`Decoder output at interpolation position ${t.toFixed(2)} between the two selected images`}
                className="w-full h-auto rounded-lg"
              />
            ) : (
              <div className="aspect-square flex items-center justify-center">
                <p className="text-[11px] text-[#475569]">Train first</p>
              </div>
            )}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-2">
            The full path, seven fixed steps
          </p>
          <div className="flex flex-wrap gap-2">
            {frames
              ? frames.map((f, i) => (
                  <div key={i} className="text-center">
                    <PixelImage
                      pixels={f}
                      ariaLabel={`Decoded frame at t = ${FRAME_TS[i].toFixed(2)}`}
                      className="w-14 h-14 rounded-lg border border-[#1e293b]"
                    />
                    <span className="block text-[9px] text-[#475569] mt-0.5 font-mono">
                      {FRAME_TS[i].toFixed(2)}
                    </span>
                  </div>
                ))
              : FRAME_TS.map((ft) => (
                  <div
                    key={ft}
                    className="w-14 h-14 rounded-lg border border-[#1e293b] bg-[#0f172a]"
                  />
                ))}
          </div>
          <p className="text-[10px] text-[#475569] leading-relaxed mt-3 max-w-[520px]">
            Every frame is the real decoder evaluated on a straight line
            between the two encoder means. In a well-trained VAE the images
            morph smoothly because the KL term forces nearby latent points to
            decode to similar images. Try endpoints from different shape
            classes and watch one shape dissolve into the other.
          </p>
        </div>
      </div>
    </div>
  );
}
