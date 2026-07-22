"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, BarChart2, Network } from "lucide-react";
import { Strategy, STRATEGY_META } from "./types";

type Props = { selected: Strategy; onSelect: (s: Strategy) => void };

const STRATEGIES: { id: Exclude<Strategy, null>; Icon: React.FC<{ size?: number }> }[] = [
  { id: "drop-rows",        Icon: Trash2    },
  { id: "mean-imputation",  Icon: BarChart2 },
  { id: "knn-imputation",   Icon: Network   },
];

const STAT_BADGES = {
  "drop-rows":       [{ label: "Data Loss: 25%", color: "#ef4444" }, { label: "Bias Risk: Medium", color: "#f59e0b" }, { label: "Null Cells: 0",  color: "#3bb4a4" }],
  "mean-imputation": [{ label: "Data Loss: 0%",  color: "#3bb4a4" }, { label: "Bias Risk: Medium", color: "#f59e0b" }, { label: "Null Cells: 0",  color: "#3bb4a4" }],
  "knn-imputation":  [{ label: "Data Loss: 0%",  color: "#3bb4a4" }, { label: "Bias Risk: Low",    color: "#3bb4a4" }, { label: "Null Cells: 0",  color: "#3bb4a4" }],
};

function StrategyPanelInner({ selected, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8]">Choose a Strategy</p>
      {STRATEGIES.map(({ id, Icon }) => {
        const meta       = STRATEGY_META[id];
        const isSelected = selected === id;
        return (
          <div key={id}>
            <motion.div
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={`Select ${meta.label} strategy`}
              onClick={() => onSelect(isSelected ? null : id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(isSelected ? null : id)}
              whileTap={{ scale: 0.98 }}
              className={`rounded-xl border-2 cursor-pointer transition-all p-4 ${
                isSelected
                  ? "bg-[var(--s-bg)]"
                  : "border-[#1e293b] bg-[#0f172a] hover:border-[#334155]"
              }`}
              style={isSelected ? { borderColor: meta.color, background: meta.color + "0d" } : undefined}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: meta.color + "20", color: meta.color }}
                >
                  <Icon size={16} />
                </div>
                <p className="text-[14px] font-bold text-white">{meta.label}</p>
                {isSelected && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                    className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-lg border"
                    style={{ color: meta.color, borderColor: meta.color + "50", background: meta.color + "18" }}>
                    Active
                  </motion.div>
                )}
              </div>

              {/* Description */}
              <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">{meta.description}</p>

              {/* Stat badges */}
              <div className="flex flex-wrap gap-1.5">
                {STAT_BADGES[id].map((b) => (
                  <span key={b.label}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                    style={{ color: b.color, borderColor: b.color + "44", background: b.color + "12" }}>
                    {b.label}
                  </span>
                ))}
              </div>

              {/* Expanded explainer */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ overflow: "hidden" }}
                  >
                    <div className="mt-3 pt-3 border-t border-white/[0.06]">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div className="flex flex-col items-center rounded-lg bg-[#1e293b]/50 py-2">
                          <span className="text-[18px] font-extrabold" style={{ color: STRATEGY_META[id].lossColor }}>
                            {meta.dataLoss}
                          </span>
                          <span className="text-[9px] text-[#475569] uppercase tracking-wide mt-0.5">Data Loss</span>
                        </div>
                        <div className="flex flex-col items-center rounded-lg bg-[#1e293b]/50 py-2">
                          <span className="text-[18px] font-extrabold" style={{ color: meta.biasColor }}>
                            {meta.biasRisk}
                          </span>
                          <span className="text-[9px] text-[#475569] uppercase tracking-wide mt-0.5">Bias Risk</span>
                        </div>
                        <div className="flex flex-col items-center rounded-lg bg-[#1e293b]/50 py-2">
                          <span className="text-[18px] font-extrabold" style={{ color: meta.color }}>
                            {meta.accuracy}%
                          </span>
                          <span className="text-[9px] text-[#475569] uppercase tracking-wide mt-0.5">Accuracy</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

const StrategyPanel = React.memo(StrategyPanelInner);
export default StrategyPanel;
