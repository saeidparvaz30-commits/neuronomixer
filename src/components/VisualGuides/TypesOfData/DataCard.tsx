"use client";

import React from "react";
import type { DataExample, DataType } from "./types";

interface Props {
  example: DataExample;
  isCorrectlyPlaced: boolean;
  onDragStart: (e: React.DragEvent, id: DataType) => void;
}

export default function DataCard({ example, isCorrectlyPlaced, onDragStart }: Props) {
  if (isCorrectlyPlaced) return null; // Card is in a bucket

  return (
    <div
      draggable
      role="button"
      tabIndex={0}
      aria-label={`Data card: ${example.label}. Drag to the correct scale bucket.`}
      onDragStart={(e) => onDragStart(e, example.id)}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          // Keyboard users get a hint
          e.preventDefault();
        }
      }}
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-[#1e293b] bg-[#0f172a] cursor-grab active:cursor-grabbing hover:border-[#334155] hover:-translate-y-0.5 transition-all select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]"
    >
      <span className="text-xl shrink-0">{example.icon}</span>
      <div>
        <p className="text-[12px] font-semibold text-white leading-tight">{example.label}</p>
        <p className="text-[10px] text-[#94a3b8] mt-0.5">{example.description}</p>
      </div>
    </div>
  );
}
