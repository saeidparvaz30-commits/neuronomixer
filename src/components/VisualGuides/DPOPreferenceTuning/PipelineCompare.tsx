"use client";

import React from "react";
import { SERIES_COLORS } from "./dpoMath";

function StageBox({
  title,
  detail,
  accent,
}: {
  title: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-xl border p-3.5"
      style={{
        borderColor: accent ? `${SERIES_COLORS.policy}66` : "#334155",
        background: "#0f172a",
      }}
    >
      <p
        className="text-[12px] font-semibold mb-1"
        style={{ color: accent ? SERIES_COLORS.policy : "#f1f5f9" }}
      >
        {title}
      </p>
      <p className="text-[11px] text-[#94a3b8] leading-relaxed">{detail}</p>
    </div>
  );
}

function DownArrow() {
  return (
    <div className="flex justify-center py-1" aria-hidden="true">
      <span className="text-[#475569] text-[14px] leading-none">↓</span>
    </div>
  );
}

/**
 * Static side-by-side diagram: the three-stage RLHF pipeline on the left,
 * and the single offline DPO objective it collapses into on the right.
 */
export default function PipelineCompare() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* RLHF pipeline */}
      <div className="rounded-xl border border-[#1e293b] p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[#94a3b8]">
            RLHF
          </p>
          <span className="text-[10px] font-mono text-[#475569]">
            2 trained models, online
          </span>
        </div>
        <StageBox
          title="1. Preference pairs"
          detail="Humans compare completions: this one is better than that one. Same data both sides."
        />
        <DownArrow />
        <StageBox
          title="2. Train a reward model"
          detail="A separate network learns a scalar score that imitates the human rankings."
        />
        <DownArrow />
        <StageBox
          title="3. RL loop (PPO)"
          detail="Sample completions from the policy, score them with the reward model, update the policy under a KL penalty against the reference model. Repeat."
        />
      </div>

      {/* DPO */}
      <div
        className="rounded-xl border p-4"
        style={{ borderColor: `${SERIES_COLORS.policy}4d` }}
      >
        <div className="flex items-center justify-between mb-3">
          <p
            className="text-[11px] font-semibold uppercase tracking-[2px]"
            style={{ color: SERIES_COLORS.policy }}
          >
            DPO
          </p>
          <span className="text-[10px] font-mono text-[#475569]">
            1 trained model, offline
          </span>
        </div>
        <StageBox
          title="1. Preference pairs"
          detail="The exact same human comparisons. No extra data is needed."
        />
        <DownArrow />
        <StageBox
          accent
          title="2. One supervised loss on the policy"
          detail="No reward model: the policy's own log-probability ratios against the frozen reference play that role. No sampling: the dataset is fixed and training is plain gradient descent. Beta is the KL tether. The lab below runs this exact objective."
        />
        <div className="mt-3 rounded-lg bg-[#1e293b]/60 px-3 py-2">
          <p className="text-[10px] text-[#94a3b8] leading-relaxed">
            The reward model and the RL loop did not disappear. The DPO paper
            shows the RLHF optimum can be written in closed form, so both stages
            fold into the loss itself.
          </p>
        </div>
      </div>
    </div>
  );
}
