"use client";

import { motion } from "framer-motion";
import type { TransferStrategy, StrategyInfo } from "./types";

const STRATEGIES: StrategyInfo[] = [
  {
    id: "feature-extraction",
    label: "Feature Extraction",
    description: "Freeze all pretrained layers. Only train new head.",
    layerConfig: ["frozen", "frozen", "frozen", "frozen", "frozen", "new"],
    dataNeeded: "Very Small (<1K)",
    trainingSpeed: "Fast",
    accuracy: "Good",
  },
  {
    id: "fine-tuning",
    label: "Fine-Tuning",
    description: "Unfreeze last 2 layers. Low learning rate.",
    layerConfig: ["frozen", "frozen", "frozen", "frozen", "fine-tune", "new"],
    dataNeeded: "Small (1K-10K)",
    trainingSpeed: "Medium",
    accuracy: "Better",
  },
  {
    id: "full",
    label: "Full Fine-Tuning",
    description: "Train everything. Needs large dataset.",
    layerConfig: ["fine-tune", "fine-tune", "fine-tune", "fine-tune", "fine-tune", "new"],
    dataNeeded: "Large (>100K)",
    trainingSpeed: "Slow",
    accuracy: "Best",
  },
];

interface Props {
  selected: TransferStrategy | null;
  onSelect: (strategy: StrategyInfo) => void;
}

function dataNeededColor(val: StrategyInfo["dataNeeded"]): string {
  if (val === "Very Small (<1K)") return "text-[#3bb4a4] bg-[#3bb4a4]/10 border-[#3bb4a4]/30";
  if (val === "Small (1K-10K)") return "text-[#d4af37] bg-[#d4af37]/10 border-[#d4af37]/30";
  return "text-[#f87171] bg-[#f87171]/10 border-[#f87171]/30";
}

function speedColor(val: StrategyInfo["trainingSpeed"]): string {
  if (val === "Fast") return "text-[#3bb4a4] bg-[#3bb4a4]/10 border-[#3bb4a4]/30";
  if (val === "Medium") return "text-[#d4af37] bg-[#d4af37]/10 border-[#d4af37]/30";
  return "text-[#f87171] bg-[#f87171]/10 border-[#f87171]/30";
}

function accuracyColor(val: StrategyInfo["accuracy"]): string {
  if (val === "Good") return "text-[#93c5fd] bg-[#3b82f6]/10 border-[#3b82f6]/30";
  if (val === "Better") return "text-[#d4af37] bg-[#d4af37]/10 border-[#d4af37]/30";
  return "text-[#a855f7] bg-[#a855f7]/10 border-[#a855f7]/30";
}

export default function StrategySelector({ selected, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {STRATEGIES.map((s) => {
        const isActive = selected === s.id;
        return (
          <div key={s.id} className="relative">
            {isActive && (
              <motion.div
                layoutId="strategy-highlight"
                className="absolute inset-0 rounded-xl border-2 border-[#a855f7]/60 bg-[#a855f7]/8"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <button
              onClick={() => onSelect(s)}
              className={`relative w-full text-left rounded-xl p-4 border transition-all ${
                isActive
                  ? "border-[#a855f7]/40 bg-[#a855f7]/10"
                  : "border-white/[0.07] bg-[#1e293b]/40 hover:border-white/20"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className={`text-sm font-bold ${isActive ? "text-[#a855f7]" : "text-white"}`}>
                  {s.label}
                </span>
                {isActive && (
                  <span className="text-[10px] font-semibold bg-[#a855f7]/20 text-[#a855f7] border border-[#a855f7]/30 rounded-full px-2 py-0.5 flex-shrink-0">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-[#94a3b8] mb-3">{s.description}</p>
              <div className="flex flex-wrap gap-1.5">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${dataNeededColor(s.dataNeeded)}`}>
                  {s.dataNeeded}
                </span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${speedColor(s.trainingSpeed)}`}>
                  {s.trainingSpeed}
                </span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${accuracyColor(s.accuracy)}`}>
                  {s.accuracy}
                </span>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}

export { STRATEGIES };
