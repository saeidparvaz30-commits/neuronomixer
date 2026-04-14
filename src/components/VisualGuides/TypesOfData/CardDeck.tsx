"use client";

import React from "react";
import type { DataExample, DataType } from "./types";
import DataCard from "./DataCard";

interface Props {
  examples: DataExample[];
  placedItems: Set<DataType>;
  onDragStart: (e: React.DragEvent, id: DataType) => void;
}

export default function CardDeck({ examples, placedItems, onDragStart }: Props) {
  const remaining = examples.filter((e) => !placedItems.has(e.id));

  if (remaining.length === 0) {
    return (
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 text-center">
        <p className="text-[13px] text-[#3bb4a4] font-semibold">All cards placed!</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-3">
        Drag each card to the correct scale
      </p>
      <div className="flex flex-wrap gap-2">
        {remaining.map((ex) => (
          <DataCard
            key={ex.id}
            example={ex}
            isCorrectlyPlaced={placedItems.has(ex.id)}
            onDragStart={onDragStart}
          />
        ))}
      </div>
    </div>
  );
}
