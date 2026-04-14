"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CaseStudy } from "./types";
import BiasTypeTag from "./BiasTypeTag";
import DataPanel from "./DataPanel";
import RevealButton from "./RevealButton";
import BeforeAfterVisualization from "./BeforeAfterVisualization";
import BiasExplainer from "./BiasExplainer";

interface Props {
  study: CaseStudy;
  revealed: boolean;
  onReveal: () => void;
}

export default function CaseStudyCard({ study, revealed, onReveal }: Props) {
  return (
    <div
      role="tabpanel"
      id="case-panel"
      aria-labelledby="case-tab"
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold text-white mb-2">{study.title}</h2>
          <BiasTypeTag label={study.biasLabel} color={study.biasColor} />
        </div>
      </div>

      {/* Context */}
      <p className="text-[13px] text-[#94a3b8] leading-relaxed">{study.context}</p>

      {/* Observed data */}
      <DataPanel
        caseId={study.id}
        headline={study.observedHeadline}
        conclusion={study.falseConclusion}
      />

      {/* Hidden explanation */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-3">
          What do you think is wrong with this conclusion?
        </p>
        <RevealButton
          options={study.options}
          correctAnswer={study.correctAnswer}
          notQuiteHint={study.notQuiteHint}
          revealed={revealed}
          onReveal={onReveal}
        />
      </div>

      {/* After reveal */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
            aria-live="polite"
          >
            <BeforeAfterVisualization caseId={study.id} />
            <BiasExplainer lessonText={study.lessonText} conceptTerms={study.conceptTerms} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
