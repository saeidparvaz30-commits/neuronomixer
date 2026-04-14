"use client";

import React from "react";
import type { BiasType, CaseStudy } from "./types";

interface Props {
  cases: CaseStudy[];
  current: BiasType;
  visited: Set<BiasType>;
  revealed: Set<BiasType>;
  onChange: (id: BiasType) => void;
}

const ICONS: Record<BiasType, string> = {
  survivorship:  "✈️",
  nonresponse:   "📋",
  selection:     "🏥",
  measurement:   "📏",
  confirmation:  "📈",
};

export default function CaseStudyNavigation({ cases, current, visited, revealed, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Case studies"
      className="flex flex-wrap gap-2"
    >
      {cases.map((c, i) => {
        const isActive = c.id === current;
        const isVisited = visited.has(c.id);
        const isRevealed = revealed.has(c.id);

        return (
          <button
            key={c.id}
            role="tab"
            aria-selected={isActive}
            aria-controls="case-panel"
            onClick={() => onChange(c.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-semibold border transition-all ${
              isActive
                ? "border-[#d4af37] bg-[#d4af37]/10 text-white"
                : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155] hover:text-white"
            }`}
          >
            <span>{ICONS[c.id]}</span>
            <span className="hidden sm:inline">{i + 1}. {c.title}</span>
            <span className="sm:hidden">{i + 1}</span>
            {isRevealed && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#3bb4a4] shrink-0" title="Revealed" />
            )}
            {!isRevealed && isVisited && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#475569] shrink-0" title="Visited" />
            )}
          </button>
        );
      })}
    </div>
  );
}
