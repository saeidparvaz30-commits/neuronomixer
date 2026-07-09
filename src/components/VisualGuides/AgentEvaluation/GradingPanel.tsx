"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useGuideMotion } from "@/lib/guideMotion";
import {
  Transcript,
  CheckResult,
  ACCENT_PINK,
  RUBRIC_PASS_THRESHOLD,
  runOutcomeChecks,
  runRubricChecks,
  outcomePass,
  rubricVerdict,
} from "./types";

function PassIcon({ pass }: { pass: boolean }) {
  return pass ? (
    <svg
      className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--color-success)]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ) : (
    <svg
      className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#ef4444]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CheckRow({ check }: { check: CheckResult }) {
  return (
    <li className="flex items-start gap-2 py-2 border-b border-white/[0.05] last:border-b-0">
      <PassIcon pass={check.pass} />
      <div>
        <p className="text-[12px] font-semibold text-[#f1f5f9] leading-snug">
          {check.label}{" "}
          <span
            className={`text-[10px] font-bold uppercase ${
              check.pass ? "text-[var(--color-success)]" : "text-[#ef4444]"
            }`}
          >
            {check.pass ? "pass" : "fail"}
          </span>
        </p>
        <p className="text-[11px] text-[#94a3b8] leading-relaxed">{check.detail}</p>
      </div>
    </li>
  );
}

function VerdictChip({ pass, text }: { pass: boolean; text: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
        pass
          ? "text-[var(--color-success)] border-[#22c55e]/40 bg-[#22c55e]/10"
          : "text-[#ef4444] border-[#ef4444]/40 bg-[#ef4444]/10"
      }`}
    >
      {text}
    </span>
  );
}

type Props = {
  transcript: Transcript;
};

export default function GradingPanel({ transcript }: Props) {
  const { fadeIn } = useGuideMotion();

  const outcomeChecks = useMemo(() => runOutcomeChecks(transcript), [transcript]);
  const rubricChecks = useMemo(() => runRubricChecks(transcript), [transcript]);
  const oPass = outcomePass(outcomeChecks);
  const rVerdict = rubricVerdict(rubricChecks);
  const agree = oPass === rVerdict.pass;

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Code-based outcome grader */}
        <div className="rounded-xl border border-[#1e293b] p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#93c5fd]">
              Code-based grader (outcome)
            </p>
            <VerdictChip pass={oPass} text={oPass ? "pass" : "fail"} />
          </div>
          <p className="text-[11px] text-[#475569] leading-relaxed mb-1">
            Objective checks on the final state. Fast and cheap, but blind to how
            the agent got there.
          </p>
          <ul>
            {outcomeChecks.map((c) => (
              <CheckRow key={c.id} check={c} />
            ))}
          </ul>
        </div>

        {/* Rubric judge */}
        <div className="rounded-xl border border-[#1e293b] p-4">
          <div className="flex items-center justify-between mb-2">
            <p
              className="text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: ACCENT_PINK }}
            >
              Rubric judge (process)
            </p>
            <VerdictChip
              pass={rVerdict.pass}
              text={`${rVerdict.passed}/${rVerdict.total} ${rVerdict.pass ? "pass" : "fail"}`}
            />
          </div>
          <p className="text-[11px] text-[#475569] leading-relaxed mb-1">
            Grades the whole trajectory. Verdict passes at {RUBRIC_PASS_THRESHOLD} of{" "}
            {rVerdict.total} criteria. In production this judge is an LLM reading the
            transcript; here each criterion runs as a deterministic check so every
            verdict is reproducible.
          </p>
          <ul>
            {rubricChecks.map((c) => (
              <CheckRow key={c.id} check={c} />
            ))}
          </ul>
        </div>
      </div>

      {/* Agreement banner + lesson */}
      <div
        className={`rounded-xl border p-4 ${
          agree ? "border-[#22c55e]/30 bg-[#22c55e]/5" : "border-[#f97316]/40 bg-[#f97316]/5"
        }`}
      >
        <p
          className={`text-[11px] font-bold uppercase tracking-wide mb-1.5 ${
            agree ? "text-[var(--color-success)]" : "text-[var(--color-warning)]"
          }`}
        >
          {agree ? "The graders agree" : "The graders disagree"}
        </p>
        <p className="text-[12px] text-[#94a3b8] leading-relaxed">{transcript.lesson}</p>
      </div>
    </motion.div>
  );
}
