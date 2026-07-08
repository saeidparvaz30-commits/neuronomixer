"use client";

import React from "react";
import { motion } from "framer-motion";
import { PIPELINE_STAGES, StageId } from "./types";

interface Props {
  activeStage: StageId;
  completedStages: Set<StageId>;
  onSelectStage: (id: StageId) => void;
}

export default function PipelineFlow({ activeStage, completedStages, onSelectStage }: Props) {
  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-center gap-0 min-w-[600px]">
        {PIPELINE_STAGES.map((stage, i) => {
          const isActive = stage.id === activeStage;
          const isDone = completedStages.has(stage.id);
          const isLast = i === PIPELINE_STAGES.length - 1;

          return (
            <React.Fragment key={stage.id}>
              <motion.button
                onClick={() => onSelectStage(stage.id)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl border transition-all relative"
                style={{
                  borderColor: isActive ? stage.color : isDone ? `color-mix(in srgb, ${stage.color} 31%, transparent)` : "#1e293b",
                  background: isActive ? `color-mix(in srgb, ${stage.color} 9%, transparent)` : isDone ? `color-mix(in srgb, ${stage.color} 4%, transparent)` : "transparent",
                  minWidth: 80,
                }}
              >
                {isDone && !isActive && (
                  <div
                    className="absolute top-1 right-1 w-3 h-3 rounded-full flex items-center justify-center"
                    style={{ background: stage.color }}
                  >
                    <svg width="7" height="7" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </div>
                )}
                <span className="text-[18px]">{stage.icon}</span>
                <span className="text-[10px] font-semibold" style={{ color: isActive ? stage.color : isDone ? stage.color : "#475569" }}>
                  {stage.label}
                </span>
                <span className="text-[8px] text-[#334155] text-center leading-tight max-w-[70px]">
                  {stage.outputLabel}
                </span>
              </motion.button>
              {!isLast && (
                <div className="flex items-center justify-center w-6 flex-shrink-0">
                  <svg width="20" height="12" viewBox="0 0 20 12">
                    <path d="M0 6 L14 6 M10 2 L18 6 L10 10" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
