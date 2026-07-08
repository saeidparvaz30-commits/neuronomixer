"use client";

import React from "react";

interface Props {
  question: string;
  options: string[];
  correctAnswer: string;
  notQuiteHint: string;
  selectedAnswer: string | null;
  onAnswer: (answer: string) => void;
}

export default function DecisionPrompt({
  question,
  options,
  correctAnswer,
  notQuiteHint,
  selectedAnswer,
  onAnswer,
}: Props) {
  const isCorrect = selectedAnswer === correctAnswer;
  const isWrong = selectedAnswer !== null && !isCorrect;

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <p className="text-[13px] font-semibold text-white mb-4">{question}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Answer choices">
        {options.map((opt) => {
          const isSelected = selectedAnswer === opt;
          const isThisCorrect = opt === correctAnswer && isSelected;
          const isThisWrong = isSelected && !isThisCorrect;

          return (
            <button
              key={opt}
              type="button"
              role="button"
              aria-pressed={isSelected}
              aria-label={`Answer: ${opt}`}
              onClick={() => onAnswer(opt)}
              disabled={isCorrect}
              className={`px-4 py-2 rounded-xl text-[13px] font-semibold border transition-all ${
                isThisCorrect
                  ? "bg-[#3bb4a4]/20 border-[#3bb4a4] text-[#3bb4a4]"
                  : isThisWrong
                  ? "bg-red-500/10 border-red-500/50 text-red-400"
                  : isCorrect
                  ? "border-[#1e293b] text-[#475569] cursor-not-allowed"
                  : "border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37]"
              }`}
            >
              {isThisCorrect && (
                <span className="mr-1.5" aria-hidden="true">✓</span>
              )}
              {isThisWrong && (
                <span className="mr-1.5" aria-hidden="true">✗</span>
              )}
              {opt}
            </button>
          );
        })}
      </div>

      {isWrong && (
        <p className="mt-3 text-[12px] text-[#94a3b8] bg-[#1e293b] rounded-lg px-3 py-2" aria-live="polite">
          Not quite. {notQuiteHint}
        </p>
      )}
      {isCorrect && (
        <p className="mt-3 text-[12px] text-[#3bb4a4] font-medium" aria-live="polite">
          Correct! See the explanation below.
        </p>
      )}
    </div>
  );
}
