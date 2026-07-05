"use client";

import { motion } from "framer-motion";
import { FILTERS } from "./filterData";
import { FilterId } from "./types";

interface FilterSelectorProps {
  selected: FilterId;
  onSelect: (id: FilterId) => void;
}

export default function FilterSelector({ selected, onSelect }: FilterSelectorProps) {
  return (
    <div className="flex flex-col gap-2.5">
    <div className="flex gap-2 flex-wrap">
      {FILTERS.map((f) => {
        const isSelected = selected === f.id;
        return (
          <button
            key={f.id}
            onClick={() => onSelect(f.id)}
            className="relative flex flex-col items-start gap-1 px-3 py-2.5 rounded-xl border transition-all text-left min-w-[130px]"
            style={{
              borderColor: isSelected ? f.color : "rgba(255,255,255,0.08)",
              background: isSelected ? `${f.color}18` : "transparent",
            }}
          >
            {isSelected && (
              <motion.div
                layoutId="filter-highlight"
                className="absolute inset-0 rounded-xl"
                style={{ background: `${f.color}12`, border: `1px solid ${f.color}60` }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
              />
            )}
            <span
              className="relative z-10 text-[13px] font-semibold leading-tight"
              style={{ color: isSelected ? f.color : "#cbd5e1" }}
            >
              {f.label}
            </span>
            <span
              className="relative z-10 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
              style={{
                background: f.layerDepth === "early" ? "#3bb4a420" : "#d4af3720",
                color: f.layerDepth === "early" ? "#3bb4a4" : "#d4af37",
              }}
            >
              {f.layerDepth === "early" ? "Edge detector" : "Classic image kernel"}
            </span>
          </button>
        );
      })}
    </div>
    <p className="text-[11px] text-[#94a3b8] leading-relaxed">
      These are classic hand-crafted kernels, chosen so you can see the
      mechanics of convolution. In a real CNN the filter values are{" "}
      <span className="text-white font-semibold">learned from data</span> during
      training; nobody writes them by hand. Early layers usually converge to
      edge-like detectors resembling these; deeper layers combine them into
      texture and object-part detectors.
    </p>
    </div>
  );
}
