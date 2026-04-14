"use client";

import React from "react";
import type { PlaygroundMode } from "./types";

interface PlaygroundSelectorProps {
  mode: PlaygroundMode;
  onChange: (mode: PlaygroundMode) => void;
}

const TABS: { id: PlaygroundMode; label: string; description: string }[] = [
  {
    id: "custom",
    label: "Custom Distribution",
    description: "Build your own payout table",
  },
  {
    id: "coin",
    label: "Fair Coin",
    description: "Win $1 or lose $1 — EV = 0",
  },
  {
    id: "lottery",
    label: "Lottery Ticket",
    description: "Real-world Powerball EV breakdown",
  },
];

export default function PlaygroundSelector({ mode, onChange }: PlaygroundSelectorProps) {
  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-4">
        Choose Playground
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TABS.map((tab) => {
          const isActive = mode === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={[
                "rounded-xl border px-4 py-3 text-left transition-all",
                isActive
                  ? "border-[#d4af37] bg-[#1e293b]"
                  : "border-[#1e293b] hover:border-[#334155] hover:bg-[#1e293b]/60",
              ].join(" ")}
            >
              <p
                className={`text-[13px] font-semibold mb-0.5 ${
                  isActive ? "text-[#d4af37]" : "text-white"
                }`}
              >
                {tab.label}
              </p>
              <p className="text-[11px] text-[#94a3b8]">{tab.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
