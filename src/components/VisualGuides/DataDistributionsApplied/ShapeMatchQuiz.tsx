"use client";

import React from "react";
import { QUIZ_ITEMS, SHAPE_OPTIONS, type ShapeId } from "./data";
import Histogram from "./Histogram";

interface Props {
  /** answers[i] = chosen ShapeId for quiz item i, or null if unanswered */
  answers: (ShapeId | null)[];
  onAnswer: (itemIndex: number, choice: ShapeId) => void;
  onRetry: () => void;
  correctCount: number;
}

const QUIZ_FMT = (v: number) =>
  Math.abs(v) >= 100 ? `${Math.round(v)}` : `${Math.round(v * 10) / 10}`;

export default function ShapeMatchQuiz({ answers, onAnswer, onRetry, correctCount }: Props) {
  const answeredCount = answers.filter((a) => a !== null).length;
  const allAnswered = answeredCount === QUIZ_ITEMS.length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-[12px] text-[#94a3b8]">
          Four fresh columns, no context, no mean or median lines. Diagnose each from shape
          alone. Get at least 3 of 4 right.
        </p>
        <div className="flex items-center gap-3">
          <span
            className="text-[12px] font-semibold font-mono"
            style={{
              color:
                allAnswered && correctCount >= 3
                  ? "var(--color-success)"
                  : "#94a3b8",
            }}
          >
            {correctCount} / {QUIZ_ITEMS.length} correct
          </span>
          {answeredCount > 0 && (
            <button
              onClick={onRetry}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              Retry exercise
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {QUIZ_ITEMS.map((item, i) => {
          const chosen = answers[i];
          const isCorrect = chosen === item.correct;
          return (
            <div
              key={item.id}
              className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4"
            >
              <p className="text-[12px] font-semibold text-white mb-2">{item.title}</p>
              <Histogram
                values={item.values}
                binCount={28}
                fmt={QUIZ_FMT}
                ariaLabel={`Histogram of ${item.title} with 28 bins. Pick the diagnosis that matches its shape.`}
              />
              <div
                className="flex flex-wrap gap-2 mt-3"
                role="radiogroup"
                aria-label={`Diagnosis for ${item.title}`}
              >
                {SHAPE_OPTIONS.map((opt) => {
                  const isChosen = chosen === opt.id;
                  const showState = chosen !== null && isChosen;
                  return (
                    <button
                      key={opt.id}
                      role="radio"
                      aria-checked={isChosen}
                      disabled={chosen !== null}
                      onClick={() => onAnswer(i, opt.id)}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                        showState
                          ? isCorrect
                            ? "border-[var(--color-success)] text-[var(--color-success)]"
                            : "border-[var(--color-warning)] text-[var(--color-warning)]"
                          : chosen !== null
                            ? "border-[#1e293b] text-[#475569]"
                            : "border-[#334155] text-[#94a3b8] hover:border-[#d4af37] hover:text-white"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {chosen !== null && (
                <p
                  className="text-[11px] leading-relaxed mt-3"
                  style={{
                    color: isCorrect ? "var(--color-success)" : "var(--color-warning)",
                  }}
                >
                  {isCorrect ? "Correct. " : `Not quite: this one is ${
                    SHAPE_OPTIONS.find((o) => o.id === item.correct)?.label.toLowerCase() ?? ""
                  }. `}
                  <span className="text-[#94a3b8]">{item.explanation}</span>
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
