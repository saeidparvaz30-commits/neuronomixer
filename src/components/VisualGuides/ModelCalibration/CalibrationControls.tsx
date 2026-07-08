"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  ScoreView,
  TRUE_T_MIN,
  TRUE_T_MAX,
  USER_T_MIN,
  USER_T_MAX,
  T_STEP,
} from "./types";

interface Props {
  trueT: number;
  userT: number;
  onTrueTChange: (v: number) => void;
  onUserTChange: (v: number) => void;
  view: ScoreView;
  onViewChange: (v: ScoreView) => void;
}

const VIEWS: { id: ScoreView; label: string }[] = [
  { id: "raw", label: "Raw model" },
  { id: "calibrated", label: "After temperature scaling" },
];

function CalibrationControlsInner({
  trueT,
  userT,
  onTrueTChange,
  onUserTChange,
  view,
  onViewChange,
}: Props) {
  return (
    <div className="flex flex-col gap-5">
      {/* Miscalibration knob */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="mc-true-t" className="text-[12px] font-semibold text-white">
            Miscalibration knob: trueT
          </label>
          <span className="text-[12px] font-mono font-bold text-[var(--color-warning)]">
            {trueT.toFixed(2)}
          </span>
        </div>
        <input
          id="mc-true-t"
          type="range"
          min={TRUE_T_MIN}
          max={TRUE_T_MAX}
          step={T_STEP}
          value={trueT}
          onChange={(e) => onTrueTChange(parseFloat(e.target.value))}
          className="w-full h-1.5 cursor-pointer"
          style={{ accentColor: "var(--color-warning)" }}
          aria-label="Miscalibration knob trueT: how distorted the model's reported confidence is"
        />
        <div className="flex justify-between text-[10px] text-[#475569] mt-1">
          <span>0.30 = overconfident</span>
          <span>1.00 = calibrated</span>
          <span>3.00 = underconfident</span>
        </div>
        <p className="text-[11px] text-[#475569] leading-relaxed mt-1.5">
          The model reports sigmoid(logit / trueT) while labels follow sigmoid(logit).
          Below 1 the logits are inflated, so the model claims more certainty than it has.
        </p>
      </div>

      {/* Temperature scaling slider */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="mc-user-t" className="text-[12px] font-semibold text-white">
            Your fix: temperature T
          </label>
          <span className="text-[12px] font-mono font-bold text-[var(--color-accent)]">
            {userT.toFixed(2)}
          </span>
        </div>
        <input
          id="mc-user-t"
          type="range"
          min={USER_T_MIN}
          max={USER_T_MAX}
          step={T_STEP}
          value={userT}
          onChange={(e) => onUserTChange(parseFloat(e.target.value))}
          className="w-full h-1.5 cursor-pointer"
          style={{ accentColor: "var(--color-accent)" }}
          aria-label="Temperature T: divides the model's logits before the sigmoid to recalibrate it"
        />
        <div className="flex justify-between text-[10px] text-[#475569] mt-1">
          <span>0.30 = sharpen</span>
          <span>1.00 = no change</span>
          <span>3.50 = soften</span>
        </div>
        <p className="text-[11px] text-[#475569] leading-relaxed mt-1.5">
          Temperature scaling divides the model&apos;s logits by T before the sigmoid.
          Find the T that flattens the reliability gap and minimizes ECE.
        </p>
      </div>

      {/* View toggle */}
      <div>
        <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide mb-2">
          Charts show
        </p>
        <div
          className="inline-flex rounded-xl border border-[#1e293b] bg-[#0f172a] p-1 gap-1"
          role="radiogroup"
          aria-label="Which scores the reliability diagram and histogram show"
        >
          {VIEWS.map((v) => {
            const isActive = view === v.id;
            return (
              <button
                key={v.id}
                role="radio"
                aria-checked={isActive}
                onClick={() => onViewChange(v.id)}
                className={`relative px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] ${
                  isActive ? "text-[#0a0e1a]" : "text-[#94a3b8] hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mc-view-pill"
                    className="absolute inset-0 rounded-lg bg-[var(--color-accent)]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">{v.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const CalibrationControls = React.memo(CalibrationControlsInner);
export default CalibrationControls;
