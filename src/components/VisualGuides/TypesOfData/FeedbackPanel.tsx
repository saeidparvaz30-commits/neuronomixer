"use client";

import React, { useEffect, useState } from "react";

interface Props {
  message: string | null;
  isCorrect: boolean;
  correctCount: number;
  total: number;
}

export default function FeedbackPanel({ message, isCorrect, correctCount, total }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) { setVisible(false); return; }
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(t);
  }, [message]);

  return (
    <div className="flex items-center gap-3 flex-wrap min-h-[28px]">
      {/* Count */}
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-[#3bb4a4]" />
        <span className="text-[11px] text-[#94a3b8]">
          {correctCount} of {total} sorted correctly
        </span>
      </div>

      {/* Transient message */}
      {visible && message && (
        <span
          role="status"
          aria-live="polite"
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-opacity ${
            isCorrect
              ? "bg-[#3bb4a4]/15 text-[#3bb4a4]"
              : "bg-red-500/10 text-red-400"
          }`}
        >
          {message}
        </span>
      )}
    </div>
  );
}
