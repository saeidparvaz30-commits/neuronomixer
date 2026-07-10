"use client";

import {
  SCHEDULE_KINDS,
  SCHEDULE_LABELS,
  PEAK_CHOICES,
  TOTAL_STEPS,
  WARMUP_STEPS,
  STEP_DECAY_FACTOR,
  ETA_MIN_FRAC,
  type ScheduleKind,
} from "./scheduleMath";

const DESCRIPTIONS: Record<ScheduleKind, string> = {
  constant: "lr(t) = peak. One number for the whole run, the naive default.",
  step: `lr(t) = peak x ${STEP_DECAY_FACTOR}^drops, dropping at steps ${Math.round(TOTAL_STEPS / 3)} and ${Math.round((2 * TOTAL_STEPS) / 3)}. The classic staircase.`,
  cosine: `lr(t) glides from peak to ${ETA_MIN_FRAC} x peak along a half cosine (Loshchilov & Hutter 2016, arXiv:1608.03983).`,
  "warmup-cosine": `Linear 0 to peak over the first ${WARMUP_STEPS} steps, then the cosine glide (warmup: Goyal et al. 2017, arXiv:1706.02677).`,
};

interface Props {
  kind: ScheduleKind;
  peakIndex: number;
  disabled: boolean;
  onKind: (k: ScheduleKind) => void;
  onPeakIndex: (i: number) => void;
}

export default function SchedulePicker({
  kind,
  peakIndex,
  disabled,
  onKind,
  onPeakIndex,
}: Props) {
  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Learning-rate schedule"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4"
      >
        {SCHEDULE_KINDS.map((k) => {
          const active = k === kind;
          return (
            <button
              key={k}
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onKind(k)}
              className={`rounded-xl border p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                active
                  ? "border-[var(--color-accent)] bg-[#d4af37]/5"
                  : "border-[#1e293b] hover:border-[#334155]"
              } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <p
                className={`text-[13px] font-semibold mb-1 ${active ? "text-[var(--color-accent)]" : "text-[#f1f5f9]"}`}
              >
                {SCHEDULE_LABELS[k]}
                {active ? " (selected)" : ""}
              </p>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                {DESCRIPTIONS[k]}
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor="peak-lr-slider"
          className="text-[12px] text-[#94a3b8] font-semibold"
        >
          Peak learning rate
        </label>
        <input
          id="peak-lr-slider"
          type="range"
          min={0}
          max={PEAK_CHOICES.length - 1}
          step={1}
          value={peakIndex}
          disabled={disabled}
          onChange={(e) => onPeakIndex(Number(e.target.value))}
          className="w-48 accent-[var(--color-accent)]"
          aria-valuetext={`peak learning rate ${PEAK_CHOICES[peakIndex]}`}
        />
        <span className="text-[13px] font-mono font-bold text-[var(--color-accent)] w-12">
          {PEAK_CHOICES[peakIndex]}
        </span>
        <span className="text-[10px] text-[#475569]">
          ({PEAK_CHOICES.join(" / ")})
        </span>
      </div>
    </div>
  );
}
