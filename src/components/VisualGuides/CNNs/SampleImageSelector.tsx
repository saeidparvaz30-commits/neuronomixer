"use client";

import { SAMPLE_IMAGES } from "./sampleImages";
import { SampleImageId } from "./types";

interface SampleImageSelectorProps {
  selected: SampleImageId;
  onSelect: (id: SampleImageId) => void;
}

function MiniGrid({ grid }: { grid: number[][] }) {
  return (
    <div
      className="grid gap-px"
      style={{ gridTemplateColumns: "repeat(8, 1fr)", width: 40, height: 40 }}
    >
      {grid.map((row, r) =>
        row.map((val, c) => (
          <div
            key={`${r}-${c}`}
            style={{ background: `rgb(${val},${val},${val})` }}
          />
        ))
      )}
    </div>
  );
}

export default function SampleImageSelector({ selected, onSelect }: SampleImageSelectorProps) {
  return (
    <div className="flex gap-3 flex-wrap">
      {SAMPLE_IMAGES.map((img) => {
        const isSelected = selected === img.id;
        return (
          <button
            key={img.id}
            onClick={() => onSelect(img.id)}
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all"
            style={{
              borderColor: isSelected ? "#d4af37" : "rgba(255,255,255,0.08)",
              background: isSelected ? "#d4af3715" : "transparent",
            }}
          >
            <div
              className="rounded-md overflow-hidden"
              style={{
                outline: isSelected ? "2px solid #d4af37" : "none",
                outlineOffset: "1px",
              }}
            >
              <MiniGrid grid={img.grid} />
            </div>
            <span
              className="text-[10px] font-medium"
              style={{ color: isSelected ? "#d4af37" : "#94a3b8" }}
            >
              {img.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
