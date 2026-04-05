"use client";

import { motion } from "framer-motion";
import { PoolingType } from "./types";

type Tab = {
  id: PoolingType;
  label: string;
  color: string;
  tagline: string;
  description: string;
};

const TABS: Tab[] = [
  {
    id: "max",
    label: "Max",
    color: "#3bb4a4",
    tagline: "Takes the strongest signal",
    description:
      "Picks the largest value in each window. Great for preserving the most prominent feature — such as the brightest edge or strongest activation.",
  },
  {
    id: "average",
    label: "Average",
    color: "#1e5d8a",
    tagline: "Smooths by averaging",
    description:
      "Computes the mean of all values in the window. Produces a smoother output, useful when you want a more uniform representation.",
  },
  {
    id: "min",
    label: "Min",
    color: "#a855f7",
    tagline: "Takes the weakest signal",
    description:
      "Picks the smallest value in each window. Useful in specific architectures where suppressing dominant activations is desired.",
  },
  {
    id: "l2",
    label: "L2-Norm",
    color: "#d4af37",
    tagline: "Root mean square",
    description:
      "Computes the L2 norm (root mean square) of the patch. Captures overall energy in the window and is used in some specialized architectures.",
  },
];

type Props = {
  selected: PoolingType;
  onSelect: (type: PoolingType) => void;
};

export default function PoolingTypeSelector({ selected, onSelect }: Props) {
  const selectedTab = TABS.find((t) => t.id === selected)!;

  return (
    <div>
      {/* Tab buttons */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((tab) => {
          const isActive = tab.id === selected;
          return (
            <button
              key={tab.id}
              onClick={() => onSelect(tab.id)}
              className="relative px-4 py-2 rounded-lg text-sm font-semibold border transition-all"
              style={{
                borderColor: isActive ? tab.color : "rgba(255,255,255,0.1)",
                color: isActive ? tab.color : "#94a3b8",
                background: isActive ? `${tab.color}18` : "transparent",
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="pooling-type-highlight"
                  className="absolute inset-0 rounded-lg"
                  style={{ background: `${tab.color}12`, border: `1px solid ${tab.color}50` }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Description */}
      <motion.div
        key={selected}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mt-3 rounded-lg p-3 border"
        style={{
          borderColor: `${selectedTab.color}30`,
          background: `${selectedTab.color}08`,
        }}
      >
        <p className="text-sm font-semibold mb-1" style={{ color: selectedTab.color }}>
          {selectedTab.label} Pooling &mdash; {selectedTab.tagline}
        </p>
        <p className="text-[13px] text-[#94a3b8] leading-relaxed">{selectedTab.description}</p>
      </motion.div>
    </div>
  );
}
