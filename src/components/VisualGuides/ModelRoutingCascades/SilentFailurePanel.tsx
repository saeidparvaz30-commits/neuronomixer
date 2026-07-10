"use client";

import React from "react";
import {
  SimResult,
  BaselineResult,
  PolicyLock,
  BREAK_CALIBRATION_MAX,
  BREAK_ACCURACY_DROP,
  HARD_DIFFICULTY,
} from "./types";

type Props = {
  sim: SimResult;
  big: BaselineResult;
  lock: PolicyLock | null;
  calibration: number;
  onCalibrationChange: (v: number) => void;
  breakConditionMet: boolean;
  breakAcked: boolean;
  onAck: () => void;
};

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

export default function SilentFailurePanel({
  sim,
  big,
  lock,
  calibration,
  onCalibrationChange,
  breakConditionMet,
  breakAcked,
  onAck,
}: Props) {
  const accDrop = lock ? lock.accuracy - sim.accuracy : 0;

  return (
    <div>
      <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[760px]">
        The router never sees correctness, only the model&apos;s self-reported
        confidence. In this simulation, confidence = true probability of being correct
        plus an overconfidence term that grows as calibration decays, and grows most on
        exactly the queries the model is weakest at. Miscalibration never blocks answers
        the model was truly sure of; it only lets bad ones through. Drag calibration
        down and compare the two panels: this is a model swap, a quantized deployment,
        or a domain shift that nobody re-measured.
      </p>

      <div className="mb-5 max-w-[560px]">
        <div className="flex items-center justify-between mb-1">
          <label
            htmlFor="mrc-calibration"
            className="text-[12px] font-semibold text-white"
          >
            Confidence calibration
          </label>
          <span
            className="text-[13px] font-mono font-bold"
            style={{
              color:
                calibration >= 0.8
                  ? "var(--color-success)"
                  : calibration > BREAK_CALIBRATION_MAX
                    ? "var(--color-warning)"
                    : "#ef4444",
            }}
          >
            {calibration.toFixed(2)}
          </span>
        </div>
        <input
          id="mrc-calibration"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={calibration}
          onChange={(e) => onCalibrationChange(Number(e.target.value))}
          className="w-full accent-[#ec4899]"
        />
        <p className="text-[11px] text-[#475569] mt-1">
          1.00 = confidence equals the true probability of being correct. 0.00 =
          confidence is inflated toward certainty on everything.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* What the dashboard sees */}
        <div className="rounded-xl border border-[var(--color-success)]/40 p-4">
          <p className="text-[11px] font-semibold text-[var(--color-success)] mb-3 uppercase tracking-wide">
            What your dashboard sees
          </p>
          <div className="space-y-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] text-[#94a3b8]">Cost per query</span>
              <span className="text-[15px] font-mono font-bold text-[#f1f5f9]">
                {sim.avgCost.toFixed(2)} units
                {lock && sim.avgCost < lock.avgCost && (
                  <span className="text-[11px] text-[var(--color-success)]">
                    {" "}
                    ↓ {pct((lock.avgCost - sim.avgCost) / lock.avgCost)} vs lock
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] text-[#94a3b8]">
                Avg confidence of accepted answers
              </span>
              <span className="text-[15px] font-mono font-bold text-[#f1f5f9]">
                {sim.dashboardConfidence === null
                  ? "n/a"
                  : sim.dashboardConfidence.toFixed(3)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] text-[#94a3b8]">Answers accepted below the top tier</span>
              <span className="text-[15px] font-mono font-bold text-[#f1f5f9]">
                {sim.gateAcceptedCount}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-[#475569] mt-3 leading-relaxed">
            Cost down, confidence high. Every number here looks like good news.
          </p>
        </div>

        {/* Ground truth */}
        <div
          className="rounded-xl border p-4"
          style={{
            borderColor:
              lock && accDrop >= BREAK_ACCURACY_DROP ? "#ef444480" : "#334155",
          }}
        >
          <p className="text-[11px] font-semibold text-[#ef4444] mb-3 uppercase tracking-wide">
            Ground truth (invisible without evals)
          </p>
          <div className="space-y-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] text-[#94a3b8]">True accuracy</span>
              <span
                className="text-[15px] font-mono font-bold"
                style={{
                  color:
                    sim.accuracy >= big.accuracy - 0.01
                      ? "#f1f5f9"
                      : "#ef4444",
                }}
              >
                {pct(sim.accuracy)}
                {lock && (
                  <span className="text-[11px]">
                    {" "}
                    ({accDrop > 0 ? "-" : "+"}
                    {Math.abs(accDrop * 100).toFixed(1)} pts vs lock)
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] text-[#94a3b8]">
                True accuracy of gate-accepted answers
              </span>
              <span className="text-[15px] font-mono font-bold text-[#f1f5f9]">
                {sim.gateAcceptedAccuracy === null
                  ? "n/a"
                  : pct(sim.gateAcceptedAccuracy)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] text-[#94a3b8]">
                Hard queries (difficulty ≥ {HARD_DIFFICULTY}) kept at Small
              </span>
              <span
                className="text-[15px] font-mono font-bold"
                style={{ color: sim.hardAtSmallCount > 0 ? "#ef4444" : "#f1f5f9" }}
              >
                {sim.hardAtSmallCount}
                {sim.hardAtSmallAccuracy !== null &&
                  ` (${pct(sim.hardAtSmallAccuracy)} correct)`}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-[#475569] mt-3 leading-relaxed">
            The gap between reported confidence and this column is the calibration
            error. No alert fires, because nothing the router measures has changed for
            the worse.
          </p>
        </div>
      </div>

      <button
        onClick={onAck}
        disabled={!breakConditionMet || breakAcked}
        className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
          breakAcked
            ? "border-[var(--color-success)]/50 text-[var(--color-success)] cursor-default"
            : breakConditionMet
              ? "border-[var(--color-warning)]/60 text-[var(--color-warning)] hover:border-[var(--color-warning)]"
              : "border-[#1e293b] text-[#475569] cursor-not-allowed"
        }`}
      >
        {breakAcked
          ? "Silent failure exposed"
          : !lock
            ? "Lock a winning policy above first"
            : calibration > BREAK_CALIBRATION_MAX
              ? `Degrade calibration to ${BREAK_CALIBRATION_MAX.toFixed(2)} or below`
              : breakConditionMet
                ? "I see it: the dashboard is green and quality fell"
                : `Keep going until true accuracy is ${(BREAK_ACCURACY_DROP * 100).toFixed(0)}+ points below your locked policy`}
      </button>
    </div>
  );
}
