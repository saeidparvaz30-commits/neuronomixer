"use client";

import React from "react";
import { ConfidenceLevel } from "./types";

interface Props {
  current: ConfidenceLevel;
  onChange: (cl: ConfidenceLevel) => void;
}

const LEVELS: ConfidenceLevel[] = [90, 95, 99];

export default function ConfidenceLevelToggle({ current, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#475569]">
        Confidence Level
      </span>
      <div className="flex gap-2">
        {LEVELS.map((level) => {
          const active = level === current;
          return (
            <button
              key={level}
              onClick={() => onChange(level)}
              aria-pressed={active}
              className="px-4 py-2 rounded-xl text-[12px] font-semibold border transition-all"
              style={{
                borderColor: active ? "#d4af37" : "#1e293b",
                color: active ? "#0a0e1a" : "#475569",
                background: active ? "#d4af37" : "transparent",
              }}
            >
              {level}% CI
            </button>
          );
        })}
      </div>
    </div>
  );
}
