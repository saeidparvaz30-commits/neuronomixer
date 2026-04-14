"use client";

import React from "react";
import type { ToolType } from "./types";

interface Tab {
  id: ToolType;
  label: string;
}

const TABS: Tab[] = [
  { id: "growth", label: "Growth" },
  { id: "logScale", label: "Log Scales" },
  { id: "summation", label: "Summation" },
  { id: "weightedAvg", label: "Weighted Avg" },
  { id: "slope", label: "Slope" },
  { id: "setOps", label: "Set Ops" },
];

interface ConceptToolbarProps {
  active: ToolType;
  explored: Set<ToolType>;
  onChange: (tool: ToolType) => void;
}

export default function ConceptToolbar({ active, explored, onChange }: ConceptToolbarProps) {
  return (
    <div
      role="tablist"
      aria-label="Math concepts"
      className="flex flex-wrap gap-2"
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        const isExplored = explored.has(tab.id);
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`relative px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
              isActive
                ? "bg-[#d4af37] text-[#0a0e1a] border-[#d4af37]"
                : "border-[#1e293b] text-[#94a3b8] hover:border-[#d4af37] hover:text-[#d4af37]"
            }`}
          >
            {tab.label}
            {isExplored && !isActive && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#3bb4a4]" aria-label="explored" />
            )}
          </button>
        );
      })}
    </div>
  );
}
