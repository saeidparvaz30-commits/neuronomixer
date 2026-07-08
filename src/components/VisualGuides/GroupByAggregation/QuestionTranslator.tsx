"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuideMotion } from "@/lib/guideMotion";
import {
  TRANSACTIONS,
  MEASURE_OPTIONS,
  QUESTIONS,
  GROUP_COLORS,
  aggregate,
  formatAgg,
  measureLabel,
  measureById,
  sameResult,
  type GroupCol,
  type AggRow,
} from "./types";

const RADIO_BTN =
  "px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]";

function radioClass(active: boolean): string {
  return `${RADIO_BTN} ${
    active
      ? "bg-[var(--color-accent)] text-[#0a0e1a]"
      : "bg-[#1e293b] text-[#94a3b8] hover:text-white"
  }`;
}

interface RenderedRow extends AggRow {
  rendered: string;
}

function ResultTable({
  groupCol,
  header,
  rows,
}: {
  groupCol: GroupCol;
  header: string;
  rows: RenderedRow[];
}) {
  const m = header; // aggregate column header text
  return (
    <div className="rounded-xl border border-[#1e293b] overflow-hidden max-w-[340px]">
      <div className="grid grid-cols-[1fr_1fr] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8] bg-[#1e293b]">
        <span>{groupCol}</span>
        <span className="text-right">{m}</span>
      </div>
      {rows.map((r, i) => (
        <div
          key={r.key}
          className="grid grid-cols-[1fr_1fr] items-center px-3 py-1.5 text-[12px] font-mono"
          style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}
        >
          <span className="inline-flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: GROUP_COLORS[groupCol][r.key] }}
              aria-hidden="true"
            />
            <span className="text-[#f1f5f9]">{r.key}</span>
          </span>
          <span className="text-right text-[#f1f5f9]">{r.rendered}</span>
        </div>
      ))}
    </div>
  );
}

interface Attempt {
  groupCol: GroupCol;
  measureId: string;
  correct: boolean;
  rows: RenderedRow[];
}

interface Props {
  solved: ReadonlySet<string>;
  onSolved: (questionId: string) => void;
}

export default function QuestionTranslator({ solved, onSolved }: Props) {
  const { fadeIn } = useGuideMotion();
  const [picks, setPicks] = useState<Record<string, { groupCol: GroupCol | null; measureId: string | null }>>(
    Object.fromEntries(QUESTIONS.map((q) => [q.id, { groupCol: null, measureId: null }]))
  );
  const [attempts, setAttempts] = useState<Record<string, Attempt | null>>(
    Object.fromEntries(QUESTIONS.map((q) => [q.id, null]))
  );

  function check(qId: string) {
    const q = QUESTIONS.find((x) => x.id === qId);
    const pick = picks[qId];
    if (!q || !pick.groupCol || !pick.measureId) return;
    const userM = measureById(pick.measureId);
    const expectedM = measureById(q.measureId);
    const userRows = aggregate(TRANSACTIONS, pick.groupCol, userM.fn, userM.valueCol);
    const expectedRows = aggregate(TRANSACTIONS, q.groupCol, expectedM.fn, expectedM.valueCol);
    const correct = pick.groupCol === q.groupCol && sameResult(userRows, expectedRows);
    setAttempts((prev) => ({
      ...prev,
      [qId]: {
        groupCol: pick.groupCol as GroupCol,
        measureId: pick.measureId as string,
        correct,
        rows: userRows.map((r) => ({
          ...r,
          rendered: formatAgg(userM.fn, userM.valueCol, r.value),
        })),
      },
    }));
    if (correct) onSolved(qId);
  }

  return (
    <div className="flex flex-col gap-4">
      {QUESTIONS.map((q, qi) => {
        const pick = picks[q.id];
        const attempt = attempts[q.id];
        const isSolved = solved.has(q.id);
        return (
          <div key={q.id} className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <p className="text-[13px] font-semibold text-white">
                Q{qi + 1}. &quot;{q.text}&quot;
              </p>
              {isSolved && (
                <span className="text-[11px] font-semibold text-[var(--color-success)] flex items-center gap-1 shrink-0">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Solved
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#475569] uppercase tracking-wide">
                  Group by
                </span>
                <div
                  role="radiogroup"
                  aria-label={`Question ${qi + 1}: grouping column`}
                  className="flex gap-1.5"
                >
                  {(["region", "product"] as const).map((c) => (
                    <button
                      key={c}
                      role="radio"
                      aria-checked={pick.groupCol === c}
                      onClick={() =>
                        setPicks((prev) => ({ ...prev, [q.id]: { ...prev[q.id], groupCol: c } }))
                      }
                      className={radioClass(pick.groupCol === c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#475569] uppercase tracking-wide">Measure</span>
                <div
                  role="radiogroup"
                  aria-label={`Question ${qi + 1}: measure`}
                  className="flex flex-wrap gap-1.5"
                >
                  {MEASURE_OPTIONS.map((m) => (
                    <button
                      key={m.id}
                      role="radio"
                      aria-checked={pick.measureId === m.id}
                      onClick={() =>
                        setPicks((prev) => ({
                          ...prev,
                          [q.id]: { ...prev[q.id], measureId: m.id },
                        }))
                      }
                      className={radioClass(pick.measureId === m.id)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => check(q.id)}
                disabled={!pick.groupCol || !pick.measureId}
                className="px-4 py-1.5 rounded-lg text-[12px] font-semibold border border-[#334155] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors disabled:opacity-40 disabled:hover:border-[#334155] disabled:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              >
                Check answer
              </button>
            </div>

            <AnimatePresence mode="wait">
              {attempt && (
                <motion.div
                  key={`${attempt.groupCol}-${attempt.measureId}`}
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                >
                  <p
                    className="text-[12px] font-semibold mb-2"
                    style={{
                      color: attempt.correct ? "var(--color-success)" : "var(--color-warning)",
                    }}
                  >
                    {attempt.correct
                      ? "Correct. Your recipe produces exactly the expected table:"
                      : `Not quite. Your recipe computes the ${measureLabel(
                          measureById(attempt.measureId).fn,
                          measureById(attempt.measureId).valueCol
                        )} per ${attempt.groupCol}, which answers a different question:`}
                  </p>
                  <ResultTable
                    groupCol={attempt.groupCol}
                    header={measureById(attempt.measureId).label.toLowerCase()}
                    rows={attempt.rows}
                  />
                  {!attempt.correct && (
                    <p className="text-[11px] text-[#475569] mt-2">
                      Reread the question: the word after &quot;per&quot; or &quot;each&quot;
                      names the grouping column, and the verb (total, count, average) names the
                      aggregate.
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
      <p className="text-[11px] text-[#475569]">
        Solved {solved.size} of {QUESTIONS.length}. Solve at least 2 to complete the guide.
      </p>
    </div>
  );
}
