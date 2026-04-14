"use client";

import React from "react";
import type { DatasetType } from "./types";
import { DATASETS } from "./types";

interface Props {
  selected: DatasetType;
  onChange: (id: DatasetType) => void;
}

export default function DatasetSelector({ selected, onChange }: Props) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-3">
        Choose a dataset
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {DATASETS.map((ds) => {
          const isSelected = ds.id === selected;
          return (
            <label
              key={ds.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? "border-[#d4af37]/60 bg-[#d4af37]/5"
                  : "border-[#1e293b] hover:border-[#334155]"
              }`}
            >
              <input
                type="radio"
                name="dataset"
                value={ds.id}
                checked={isSelected}
                onChange={() => onChange(ds.id)}
                className="sr-only"
              />
              <span
                className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 transition-all ${
                  isSelected
                    ? "border-[#d4af37] bg-[#d4af37]"
                    : "border-[#475569] bg-transparent"
                }`}
              />
              <span
                className={`text-[13px] font-medium transition-colors ${
                  isSelected ? "text-white" : "text-[#94a3b8]"
                }`}
              >
                {ds.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
