"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Scenario, FramingType, ScenarioInfo } from "./types";
import RawDataViewer from "./RawDataViewer";
import DecisionPrompt from "./DecisionPrompt";
import RevealPanel from "./RevealPanel";
import FramingToggle from "./FramingToggle";

interface Props {
  info: ScenarioInfo;
  userAnswer: string | null;
  revealed: boolean;
  framing: FramingType;
  onAnswer: (answer: string) => void;
  onFramingChange: (f: FramingType) => void;
  scenarioIndex: number;
}

export default function ScenarioCard({
  info,
  userAnswer,
  revealed,
  framing,
  onAnswer,
  onFramingChange,
  scenarioIndex,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: scenarioIndex * 0.05 }}
      className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6"
    >
      {/* Scenario header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[1px] text-[#d4af37]">
            Scenario {scenarioIndex + 1}
          </span>
          <h3 className="text-[17px] font-bold text-white mt-0.5">{info.title}</h3>
        </div>
        <div className="shrink-0 w-9 h-9 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center text-[14px] font-black text-[#d4af37]">
          {scenarioIndex + 1}
        </div>
      </div>

      {/* Context */}
      <p className="text-[13px] text-[#94a3b8] leading-relaxed mb-4">{info.context}</p>

      {/* Raw data */}
      <div className="mb-5">
        <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-widest mb-2">Raw Data</p>
        <RawDataViewer scenario={info.id} />
      </div>

      {/* Decision prompt */}
      <DecisionPrompt
        question={info.decisionQuestion}
        options={info.options}
        correctAnswer={info.correctAnswer}
        notQuiteHint={info.notQuiteHint}
        selectedAnswer={userAnswer}
        onAnswer={onAnswer}
      />

      {/* Reveal */}
      <AnimatePresence>
        {revealed && (
          <RevealPanel
            key="reveal"
            scenario={info.id}
            revealText={info.revealText}
            conceptTerms={info.conceptTerms}
          />
        )}
      </AnimatePresence>

      {/* Framing toggle — only after reveal */}
      {revealed && (
        <FramingToggle
          framing={framing}
          onChange={onFramingChange}
          framings={info.framings}
        />
      )}
    </motion.div>
  );
}
