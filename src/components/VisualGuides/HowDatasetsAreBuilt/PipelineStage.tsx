"use client";

import React, { useRef } from "react";
import { motion } from "framer-motion";
import { Lock, Database, FolderInput, Sparkles, Wand2, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { StageId, StageState, STAGE_CONFIGS } from "./types";
import StageContent from "./StageContent";

type Props = {
  config:            (typeof STAGE_CONFIGS)[number];
  state:             StageState;
  onToggle:          (id: StageId) => void;
  onChallengePassed: (id: StageId) => void;
  onContinue:        (id: StageId) => void;
};

const ICONS: Record<StageId, React.ReactNode> = {
  "raw-source":     <Database     size={18} />,
  "collection":     <FolderInput  size={18} />,
  "cleaning":       <Sparkles     size={18} />,
  "transformation": <Wand2        size={18} />,
  "analysis-ready": <CheckCircle2 size={18} />,
};

function PipelineStageInner({ config, state, onToggle, onChallengePassed, onContinue }: Props) {
  const cardRef  = useRef<HTMLDivElement>(null);
  const isLocked    = state.status === "locked";
  const isActive    = state.status === "active";
  const isCompleted = state.status === "completed";

  function handleClick() {
    if (isLocked) return;
    onToggle(config.id);
  }

  return (
    <div ref={cardRef}>
      <motion.div
        animate={isLocked ? { x: 0 } : undefined}
        className={`rounded-2xl border bg-[#0f172a] overflow-hidden transition-all ${
          isLocked    ? "border-[#1e293b] opacity-50"  :
          isCompleted ? "border-[#1e293b] opacity-95"  :
                        "border-[#1e293b]"
        }`}
        style={
          !isLocked && state.isExpanded ? { borderLeft: `4px solid ${config.color}` }   :
          isActive                      ? { borderLeft: `4px solid color-mix(in srgb, ${config.color} 27%, transparent)` } :
          undefined
        }
      >
        {/* Header */}
        <div
          role="button"
          tabIndex={isLocked ? -1 : 0}
          aria-expanded={state.isExpanded}
          aria-label={`${config.title}: ${state.status}`}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !isLocked && handleClick()}
          onClick={isLocked ? undefined : handleClick}
          className={`flex items-center gap-4 px-5 py-4 ${isLocked ? "cursor-not-allowed" : "cursor-pointer"}`}
        >
          {/* Stage number circle */}
          <div
            className="relative flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-[13px]"
            style={{ background: isLocked ? "#1e293b" : `color-mix(in srgb, ${config.color} 80%, transparent)` }}
          >
            {config.index + 1}
            {isActive && (
              <motion.div
                className="absolute inset-0 rounded-full border-2"
                style={{ borderColor: config.color }}
                animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.15, 1] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              />
            )}
          </div>

          {/* Icon + title */}
          <div className="flex items-center gap-2 flex-shrink-0" style={{ color: isLocked ? "#475569" : config.color }}>
            {ICONS[config.id]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-white truncate">{config.title}</p>
            <p className="text-[11px] text-[#94a3b8] truncate">{config.tagline}</p>
          </div>

          {/* Right badge / chevron */}
          {isLocked && <Lock size={14} className="text-[#475569] flex-shrink-0" />}
          {isCompleted && (
            <div className="flex items-center gap-1.5 bg-[#3bb4a4]/15 border border-[#3bb4a4]/30 rounded-lg px-2 py-0.5 flex-shrink-0">
              <svg className="w-3 h-3 text-[#3bb4a4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-[10px] font-semibold text-[#3bb4a4] uppercase tracking-wide">Done</span>
            </div>
          )}
          {!isLocked && (
            state.isExpanded
              ? <ChevronUp   size={16} className="text-[#475569] flex-shrink-0" />
              : <ChevronDown size={16} className="text-[#475569] flex-shrink-0" />
          )}
        </div>

        {/*
          Keep StageContent in the DOM once the stage is active/completed.
          Animating height (not mount/unmount) preserves all challenge state
          across collapse ↔ expand cycles.
        */}
        {!isLocked && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height:  state.isExpanded ? "auto" : 0,
              opacity: state.isExpanded ? 1      : 0,
            }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="border-t border-[#1e293b]">
              <StageContent
                stageId={config.id}
                color={config.color}
                isPassed={state.challengePassed}
                isCompleted={isCompleted}
                isVisible={state.isExpanded}
                onChallengePassed={() => onChallengePassed(config.id)}
                onContinue={() => onContinue(config.id)}
              />
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

const PipelineStage = React.memo(PipelineStageInner);
export default PipelineStage;
