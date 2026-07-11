"use client";

import { HEATMAP_RES, targetHeatmap, TARGET_FORMULA } from "./scheduleMath";

/**
 * Target surface vs the learned surface of the most recent finished run.
 * Both grids are computed by scheduleMath (targetHeatmap / the run's
 * stored predictionHeatmap); nothing here is drawn by hand.
 */

const CELL = 10;
const SIZE = HEATMAP_RES * CELL;

/** Diverging map: pink for negative, near-background at 0, teal for positive. */
function valueColor(v: number): string {
  if (!Number.isFinite(v)) return "#475569";
  const t = Math.max(-1, Math.min(1, v));
  const base: [number, number, number] = [15, 23, 42]; // #0f172a
  const pos: [number, number, number] = [59, 180, 164]; // #3bb4a4
  const neg: [number, number, number] = [236, 72, 153]; // #ec4899
  const target = t >= 0 ? pos : neg;
  const a = Math.abs(t);
  const mix = base.map((b, i) => Math.round(b + (target[i] - b) * a));
  return `rgb(${mix[0]},${mix[1]},${mix[2]})`;
}

const TARGET_CELLS = targetHeatmap();

function Grid({ values, label }: { values: readonly number[]; label: string }) {
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full h-auto rounded-lg"
      role="img"
      aria-label={label}
    >
      {values.map((v, i) => {
        const r = Math.floor(i / HEATMAP_RES);
        const c = i % HEATMAP_RES;
        return (
          <rect
            key={i}
            x={c * CELL}
            y={(HEATMAP_RES - 1 - r) * CELL}
            width={CELL}
            height={CELL}
            fill={valueColor(v)}
          />
        );
      })}
    </svg>
  );
}

interface Props {
  /** The last finished run's learned surface, or null before any run. */
  learned: readonly number[] | null;
  learnedCaption: string;
}

export default function FitHeatmaps({ learned, learnedCaption }: Props) {
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Grid
            values={TARGET_CELLS}
            label="Heatmap of the target surface: a teal hill in the upper right quadrant and a pink pit in the lower left quadrant."
          />
          <p className="text-[11px] text-[#94a3b8] mt-1.5">
            Target surface (what the net must learn)
          </p>
          <p className="text-[10px] font-mono text-[#475569] break-all">
            {TARGET_FORMULA}
          </p>
        </div>
        <div>
          {learned ? (
            <Grid
              values={learned}
              label={`Heatmap of the learned surface after your last finished run: ${learnedCaption}. Compare with the target heatmap; the run table gives the exact final loss.`}
            />
          ) : (
            <div
              className="w-full rounded-lg border border-[#1e293b] flex items-center justify-center"
              style={{ aspectRatio: "1 / 1" }}
            >
              <p className="text-[11px] text-[#475569] px-4 text-center">
                Finish a training run to see what the net learned
              </p>
            </div>
          )}
          <p className="text-[11px] text-[#94a3b8] mt-1.5">
            Learned surface: {learnedCaption}
          </p>
          <p className="text-[10px] text-[#475569]">
            Teal = positive output, pink = negative, dark = near zero
          </p>
        </div>
      </div>
    </div>
  );
}
