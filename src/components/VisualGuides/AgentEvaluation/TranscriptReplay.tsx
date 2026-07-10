"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuideMotion } from "@/lib/guideMotion";
import {
  Transcript,
  TranscriptId,
  TRANSCRIPTS,
  TASK_PROMPT,
  TOOLBOX,
  STEP_STYLE,
  ACCENT_PINK,
} from "./types";
import GradingPanel from "./GradingPanel";

type Props = {
  activeId: TranscriptId;
  revealed: Record<TranscriptId, number>;
  onSelect: (id: TranscriptId) => void;
  onStepForward: (id: TranscriptId) => void;
  onRestartTranscript: (id: TranscriptId) => void;
};

function StepRow({ step, index }: { step: Transcript["steps"][number]; index: number }) {
  const style = STEP_STYLE[step.kind];
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-start gap-3 py-2.5 border-b border-white/[0.05] last:border-b-0"
    >
      <span className="text-[10px] font-mono text-[#475569] w-5 shrink-0 pt-0.5 text-right">
        {index + 1}
      </span>
      <span
        className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 mt-0.5 w-[86px] text-center"
        style={{ color: style.color, borderColor: style.color }}
      >
        {style.label}
      </span>
      <div className="min-w-0">
        <p className="text-[12px] text-[#f1f5f9] leading-relaxed">{step.text}</p>
        {step.kind === "tool_call" && (
          <p className="font-mono text-[11px] text-[#93c5fd] mt-0.5 break-all">
            {step.toolName}({step.toolInput})
          </p>
        )}
      </div>
    </motion.li>
  );
}

export default function TranscriptReplay({
  activeId,
  revealed,
  onSelect,
  onStepForward,
  onRestartTranscript,
}: Props) {
  const { fadeIn } = useGuideMotion();
  const transcript = TRANSCRIPTS.find((t) => t.id === activeId) ?? TRANSCRIPTS[0];
  const shown = revealed[transcript.id];
  const total = transcript.steps.length;
  const done = shown >= total;

  return (
    <div>
      {/* Transcript selector */}
      <div
        className="inline-flex flex-wrap rounded-xl border border-[#1e293b] bg-[#0f172a] p-1 gap-1 mb-3"
        role="radiogroup"
        aria-label="Transcript to replay"
      >
        {TRANSCRIPTS.map((t) => {
          const isActive = activeId === t.id;
          const graded = revealed[t.id] >= t.steps.length;
          return (
            <button
              key={t.id}
              role="radio"
              aria-checked={isActive}
              onClick={() => onSelect(t.id)}
              className={`relative px-4 py-2 rounded-lg text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                isActive ? "text-white" : "text-[#94a3b8] hover:text-white"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="transcript-pill"
                  className="absolute inset-0 rounded-lg"
                  style={{ background: ACCENT_PINK }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="relative z-10">
                {t.label}
                {graded && (
                  <>
                    <span aria-hidden="true"> ✓</span>
                    <span className="sr-only"> (graded)</span>
                  </>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
        {transcript.tagline}
      </p>

      {/* Task card */}
      <pre className="bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[11px] leading-relaxed rounded-xl p-4 overflow-x-auto mb-4">
{`TASK:  ${TASK_PROMPT}
TOOLS: ${TOOLBOX.join("  ")}`}
      </pre>

      {/* Steps */}
      <div className="rounded-xl border border-[#1e293b] overflow-hidden mb-4">
        <div className="px-4 py-2.5 bg-[#1e293b] flex items-center justify-between">
          <p className="text-[12px] font-semibold text-white">Transcript replay</p>
          <span className="text-[11px] text-[#94a3b8] font-mono" aria-live="polite">
            step {Math.min(shown, total)} of {total}
          </span>
        </div>
        <ul className="px-4 py-1">
          <AnimatePresence initial={false}>
            {transcript.steps.slice(0, shown).map((step, i) => (
              <StepRow key={`${transcript.id}-${i}`} step={step} index={i} />
            ))}
          </AnimatePresence>
        </ul>
        <div className="px-4 py-3 border-t border-white/[0.05] flex flex-wrap items-center gap-3">
          <button
            onClick={() => onStepForward(transcript.id)}
            disabled={done}
            className="px-4 py-2 rounded-xl text-[12px] font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            style={{ background: ACCENT_PINK }}
          >
            {done ? "Replay finished" : "Next step"}
          </button>
          <button
            onClick={() => onRestartTranscript(transcript.id)}
            className="px-4 py-2 rounded-xl text-[12px] font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            Restart transcript
          </button>
          {!done && (
            <span className="text-[11px] text-[#475569]">
              Step to the end to see both graders score this run.
            </span>
          )}
        </div>
      </div>

      {/* Grading appears when the full trajectory has been read */}
      <AnimatePresence>
        {done && (
          <motion.div
            key={`grading-${transcript.id}`}
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <GradingPanel transcript={transcript} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
