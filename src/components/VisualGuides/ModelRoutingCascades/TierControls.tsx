"use client";

import React from "react";
import { TierParams, TIER_COLORS } from "./types";

type Props = {
  tiers: readonly TierParams[];
  onTierChange: (
    index: number,
    patch: Partial<Pick<TierParams, "cost" | "skill">>
  ) => void;
};

export default function TierControls({ tiers, onTierChange }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {tiers.map((tier, t) => (
        <div
          key={tier.id}
          className="rounded-xl border p-4"
          style={{ borderColor: `${TIER_COLORS[t]}66` }}
        >
          <p className="text-[13px] font-bold mb-3" style={{ color: TIER_COLORS[t] }}>
            {tier.name}
          </p>

          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor={`mrc-cost-${tier.id}`}
                className="text-[11px] text-[#94a3b8]"
              >
                Cost per query
              </label>
              <span className="text-[12px] font-mono font-bold text-[#f1f5f9]">
                {tier.cost.toFixed(1)}
              </span>
            </div>
            <input
              id={`mrc-cost-${tier.id}`}
              type="range"
              min={0.5}
              max={60}
              step={0.5}
              value={tier.cost}
              onChange={(e) => onTierChange(t, { cost: Number(e.target.value) })}
              className="w-full accent-[var(--color-accent)]"
              aria-label={`${tier.name} tier cost per query in relative units`}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor={`mrc-skill-${tier.id}`}
                className="text-[11px] text-[#94a3b8]"
              >
                Capability midpoint
              </label>
              <span className="text-[12px] font-mono font-bold text-[#f1f5f9]">
                {tier.skill.toFixed(2)}
              </span>
            </div>
            <input
              id={`mrc-skill-${tier.id}`}
              type="range"
              min={0.1}
              max={0.99}
              step={0.01}
              value={tier.skill}
              onChange={(e) => onTierChange(t, { skill: Number(e.target.value) })}
              className="w-full accent-[var(--color-accent)]"
              aria-label={`${tier.name} tier capability midpoint: difficulty at which it is 50 percent correct`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
