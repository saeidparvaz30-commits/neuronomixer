"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CaseStudy {
  title: string;
  year: string;
  context: string;
  rootCause: string;
  lesson: string;
}

const CASE_STUDIES: CaseStudy[] = [
  {
    title: "1936 Literary Digest Poll",
    year: "1936",
    context:
      "The Literary Digest mailed 10 million questionnaires to readers selected from telephone directories and car registration lists, predicting a landslide victory for Alf Landon over FDR. FDR won by a historic margin.",
    rootCause: "Convenience Bias",
    lesson:
      "The prediction missed by roughly 19-20 percentage points. Two biases compounded: the sampling frame (phone and car owners in 1936) skewed wealthy, and only about 2.4 million of the 10 million ballots were returned, adding non-response bias on top.",
  },
  {
    title: "WWII Survivorship Bias",
    year: "1943",
    context:
      "The Allied forces analyzed bullet-hole patterns on returning bombers and considered reinforcing the most-hit areas. Statistician Abraham Wald pointed out the critical flaw: the planes that never returned had been hit in the unobserved spots.",
    rootCause: "Survivorship Bias",
    lesson:
      "Missing data (casualties) is as important as observed data. Only studying survivors gives a systematically distorted picture of the whole population.",
  },
  {
    title: "Clinical Trial Exclusions",
    year: "Ongoing",
    context:
      "For decades, clinical trials systematically excluded pregnant women, the elderly, and ethnic minorities. Dosage guidelines and drug efficacy data were built on unrepresentative samples, leading to harmful outcomes for excluded groups.",
    rootCause: "Non-Representative Sampling",
    lesson:
      "Non-representative sampling limits external validity. Results valid for one subgroup may not (and often do not) generalize to other populations.",
  },
  {
    title: "Online Self-Selection Polls",
    year: "Modern",
    context:
      "Online polls on news sites and social media allow any visitor to participate voluntarily. Only highly opinionated or engaged users bother to respond, systematically skewing results toward the most extreme views.",
    rootCause: "Voluntary Response Bias",
    lesson:
      "Voluntary response bias distorts public opinion surveys. People with strong opinions are far more likely to participate, making results unrepresentative of the silent majority.",
  },
];

const ROOT_CAUSE_COLORS: Record<string, string> = {
  "Convenience Bias": "#ef4444",
  "Survivorship Bias": "#f97316",
  "Non-Representative Sampling": "#a855f7",
  "Voluntary Response Bias": "#93c5fd",
};

interface Props {
  onExpand: () => void;
}

export default function BiasGallery({ onExpand }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  function handleToggle() {
    if (!isOpen) {
      onExpand();
    }
    setIsOpen(v => !v);
  }

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-[18px]">⚠️</span>
          <div className="text-left">
            <p className="text-[14px] font-bold text-white">Famous Sampling Failures</p>
            <p className="text-[11px] text-[#475569]">
              4 historical case studies. Click to expand.
            </p>
          </div>
        </div>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-[#475569] flex-shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-white/[0.06]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                {CASE_STUDIES.map(({ title, year, context, rootCause, lesson }) => {
                  const color = ROOT_CAUSE_COLORS[rootCause] ?? "#94a3b8";
                  return (
                    <motion.div
                      key={title}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-4"
                      style={{ borderLeftColor: color, borderLeftWidth: "3px" }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="text-[13px] font-bold text-white leading-snug">{title}</h3>
                          <span className="text-[10px] text-[#475569]">{year}</span>
                        </div>
                        <span
                          className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
                          style={{ color, borderColor: color + "50", background: color + "15" }}
                        >
                          {rootCause}
                        </span>
                      </div>

                      <p className="text-[11px] text-[#94a3b8] leading-relaxed mb-3">{context}</p>

                      <div
                        className="rounded-lg px-3 py-2 border"
                        style={{ borderColor: color + "30", background: color + "0a" }}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color }}>
                          Key Lesson
                        </p>
                        <p className="text-[11px] text-[#94a3b8] leading-snug">&ldquo;{lesson}&rdquo;</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <p className="text-[11px] text-[#334155] mt-4 text-center">
                These failures share a common thread: non-random sampling leads to systematically wrong conclusions.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
