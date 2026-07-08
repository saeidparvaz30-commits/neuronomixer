"use client";

import React from "react";
import { motion } from "framer-motion";
import type { FunctionId, FunctionProperties } from "./types";

interface FunctionSelectorProps {
  selectedId: FunctionId;
  properties: Record<FunctionId, FunctionProperties>;
  onSelect: (id: FunctionId) => void;
}

const SHORT_DESCRIPTIONS: Record<FunctionId, string> = {
  relu: "max(0, x): sparse activations, fast training",
  sigmoid: "1/(1+e⁻ˣ): smooth probability output",
  tanh: "tanh(x): zero-centered, symmetric",
  "leaky-relu": "x > 0 ? x : 0.01x: fixes dying ReLU",
};

export default function FunctionSelector({
  selectedId,
  properties,
  onSelect,
}: FunctionSelectorProps) {
  const ids: FunctionId[] = ["relu", "sigmoid", "tanh", "leaky-relu"];

  return (
    <div
      role="radiogroup"
      aria-label="Activation function"
      className="grid grid-cols-2 sm:grid-cols-4 gap-2"
    >
      {ids.map((id) => {
        const prop = properties[id];
        const isSelected = id === selectedId;
        return (
          <button
            key={id}
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(id)}
            className="relative text-left px-3 py-3 rounded-xl border transition-all duration-200"
            style={{
              backgroundColor: isSelected
                ? `${prop.color}26`
                : "transparent",
              borderColor: isSelected ? prop.color : "#334155",
            }}
          >
            {isSelected && (
              <motion.div
                layoutId="fn-selector-highlight"
                className="absolute inset-0 rounded-xl"
                style={{ backgroundColor: `${prop.color}18` }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
              />
            )}
            <div className="relative z-10">
              <p
                className="text-sm font-semibold mb-0.5 transition-colors"
                style={{ color: isSelected ? prop.color : "#f1f5f9" }}
              >
                {prop.label}
              </p>
              <p className="text-[10px] leading-snug text-[#475569]">
                {SHORT_DESCRIPTIONS[id]}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
