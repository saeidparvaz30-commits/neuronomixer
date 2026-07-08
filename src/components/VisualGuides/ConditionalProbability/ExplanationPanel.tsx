"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ScenarioType } from "./types";

interface ExplanationPanelProps {
  scenario: ScenarioType;
  selectedNodeId: string | null;
}

interface ScenarioExplanation {
  title: string;
  context: string;
  insight: string;
  keyTakeaway: string;
}

const EXPLANATIONS: Record<ScenarioType, ScenarioExplanation> = {
  medical_testing: {
    title: "Why the Base Rate Matters",
    context:
      "When a disease is rare (1% prevalence), most people who test positive are actually healthy, even when the test catches 95% of true cases (its sensitivity; overall accuracy here is about 90%). This is the \"base rate fallacy\": ignoring how common the condition is.",
    insight:
      "With 1000 people: ~10 have the disease. The test correctly identifies ~9.5 of them (Test+). But of the 990 healthy people, 10% also test positive: that is ~99 false positives. So of ~108 total positives, only ~9 are true positives.",
    keyTakeaway:
      "P(Disease | Test+) ≈ 8.8%, not 95%. Rare events require tests with very low false-positive rates to avoid being swamped by false positives.",
  },
  marbles: {
    title: "Without Replacement Changes Everything",
    context:
      "When you draw a marble and keep it, the composition of the urn changes. The probability of the second draw depends on what happened first; these events are not independent.",
    insight:
      "Starting with 5 red and 3 blue: P(Red 1st) = 5/8. After drawing red, only 4 red and 3 blue remain: P(Red 2nd | Red 1st) = 4/7 ≈ 0.571. But P(Red 2nd | Blue 1st) = 5/7 ≈ 0.714. The first draw changes the second.",
    keyTakeaway:
      "Sampling without replacement creates dependence. Conditional probabilities track how the sample space shrinks after each event.",
  },
  manufacturing: {
    title: "Reverse Inference: Which Factory?",
    context:
      "If you find a defective item, which factory is it more likely from? Even though Factory A produces fewer items (40%), it has a higher defect rate (5% vs 3%).",
    insight:
      "Factory A produces 40% of items with 5% defects → 0.02 defective fraction. Factory B produces 60% with 3% defects → 0.018 defective fraction. Total defect rate = 3.8%. P(Factory A | Defective) = 0.02 / 0.038 ≈ 52.6%.",
    keyTakeaway:
      "Despite Factory A making fewer items, its higher defect rate means defective items are slightly more likely to come from Factory A. This is Bayes' theorem in action.",
  },
};

export default function ExplanationPanel({ scenario, selectedNodeId }: ExplanationPanelProps) {
  const exp = EXPLANATIONS[scenario];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={scenario}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 space-y-4"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-1">
            Explanation
          </p>
          <h3 className="text-[15px] font-bold text-white">{exp.title}</h3>
        </div>

        <p className="text-[13px] text-[#94a3b8] leading-relaxed">{exp.context}</p>

        {/* Numerical walkthrough */}
        <div className="p-3 rounded-xl bg-[#1e293b]/60 border border-[#1e293b]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-accent)] mb-1.5">
            Step-by-Step
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed">{exp.insight}</p>
        </div>

        {/* Key takeaway */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#3bb4a4]/8 border border-[#3bb4a4]/20">
          <svg
            className="w-4 h-4 text-[#3bb4a4] flex-shrink-0 mt-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p className="text-[12px] text-[#94a3b8] leading-snug">{exp.keyTakeaway}</p>
        </div>

        {/* Prompt to interact */}
        {!selectedNodeId && (
          <p className="text-[11px] text-[#475569] italic">
            Tip: Click any tree node above to see how the sample space shrinks.
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
