"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface Props {
  options: string[];
  correctAnswer: string;
  notQuiteHint: string;
  revealed: boolean;
  onReveal: () => void;
}

export default function RevealButton({ options, correctAnswer, notQuiteHint, revealed, onReveal }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  if (revealed) return null;

  function handlePick(option: string) {
    if (selected === correctAnswer) return; // already correct
    setSelected(option);
    if (option === correctAnswer) {
      // Small delay so user sees the green flash before the full reveal appears
      setTimeout(() => onReveal(), 600);
    }
  }

  const isCorrect = selected === correctAnswer;

  return (
    <div className="mt-4 space-y-2">
      {options.map((option) => {
        const isPicked = selected === option;
        const isWrong = isPicked && !isCorrect;
        const isRight = isPicked && isCorrect;

        let borderColor = "border-[#1e293b]";
        let bg = "bg-transparent hover:bg-[#1e293b]/60 hover:border-[#334155]";
        let textColor = "text-[#94a3b8]";
        let icon: React.ReactNode = null;

        if (isRight) {
          borderColor = "border-[#3bb4a4]/60";
          bg = "bg-[#3bb4a4]/10";
          textColor = "text-[#3bb4a4]";
          icon = (
            <svg className="w-4 h-4 shrink-0 text-[#3bb4a4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          );
        } else if (isWrong) {
          borderColor = "border-[#ef4444]/40";
          bg = "bg-[#ef4444]/5";
          textColor = "text-[#ef4444]/80";
          icon = (
            <svg className="w-4 h-4 shrink-0 text-[#ef4444]/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          );
        }

        return (
          <button
            key={option}
            type="button"
            disabled={isCorrect}
            onClick={() => handlePick(option)}
            className={`w-full text-left px-4 py-2.5 rounded-xl border transition-all duration-150 flex items-center gap-3 text-[13px] font-medium ${borderColor} ${bg} ${textColor}`}
          >
            {icon && icon}
            <span>{option}</span>
          </button>
        );
      })}

      <AnimatePresence>
        {selected && !isCorrect && (
          <motion.p
            key="hint"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-[11px] text-[#94a3b8] italic pt-1"
          >
            Not quite: {notQuiteHint}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
