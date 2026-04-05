"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { NetworkType } from "./types";
import { RNN_SEQUENCE, LSTM_SEQUENCE, SENTENCE_TOKENS } from "./sequenceData";

interface Props {
  networkType: NetworkType;
  currentStep: number;
  onStepChange: (step: number | ((prev: number) => number)) => void;
}

export default function SequenceStepper({ networkType, currentStep, onStepChange }: Props) {
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeColor = networkType === "rnn" ? "#1e5d8a" : "#a855f7";
  const sequence = networkType === "rnn" ? RNN_SEQUENCE : LSTM_SEQUENCE;

  useEffect(() => {
    if (isAutoPlay) {
      autoRef.current = setInterval(() => {
        onStepChange((prev: number) => {
          if (prev >= SENTENCE_TOKENS.length - 1) {
            setIsAutoPlay(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else if (autoRef.current) {
      clearInterval(autoRef.current);
      autoRef.current = null;
    }
    return () => {
      if (autoRef.current) clearInterval(autoRef.current);
    };
  }, [isAutoPlay, onStepChange]);

  function toggleAutoPlay() {
    if (isAutoPlay) {
      setIsAutoPlay(false);
    } else {
      if (currentStep >= SENTENCE_TOKENS.length - 1) {
        onStepChange(0);
      }
      setIsAutoPlay(true);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Token blocks */}
      <div className="flex gap-2 flex-wrap">
        {SENTENCE_TOKENS.map((token, i) => {
          const isActive = i === currentStep;
          const isDone = i < currentStep;
          const h = sequence[i].hiddenState;

          return (
            <button
              key={i}
              onClick={() => onStepChange(i)}
              className="relative flex flex-col items-center rounded-xl border-2 px-3 py-2 min-w-[64px] transition-all"
              style={{
                borderColor: isActive ? activeColor : isDone ? `${activeColor}60` : "#334155",
                background: isActive
                  ? `${activeColor}20`
                  : isDone
                  ? `${activeColor}08`
                  : "transparent",
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="stepper-highlight"
                  className="absolute inset-0 rounded-[10px]"
                  style={{ background: `${activeColor}18` }}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}

              <span
                className="relative z-10 text-sm font-bold"
                style={{ color: isActive ? activeColor : isDone ? "#94a3b8" : "#475569" }}
              >
                {token}
              </span>
              <span
                className="relative z-10 text-[9px] mt-0.5"
                style={{ color: isActive ? activeColor : "#334155" }}
              >
                t={i + 1}
              </span>

              {/* Hidden state mini bar (shown for completed + active steps) */}
              {(isDone || isActive) && (
                <div className="relative z-10 flex gap-0.5 mt-1.5 w-full">
                  {h.map((v, j) => (
                    <div
                      key={j}
                      className="h-1.5 flex-1 rounded-full transition-all duration-500"
                      style={{
                        background: `hsl(${180 + v * 80}, 60%, ${40 + v * 30}%)`,
                        opacity: 0.8,
                      }}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => onStepChange(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="px-3 py-1.5 rounded-lg text-sm border border-[#334155] text-[#94a3b8] hover:border-[#475569] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          ◀ Prev
        </button>
        <button
          onClick={() => onStepChange(Math.min(SENTENCE_TOKENS.length - 1, currentStep + 1))}
          disabled={currentStep === SENTENCE_TOKENS.length - 1}
          className="px-3 py-1.5 rounded-lg text-sm border border-[#334155] text-[#94a3b8] hover:border-[#475569] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          Next ▶
        </button>
        <button
          onClick={toggleAutoPlay}
          className="px-3 py-1.5 rounded-lg text-sm border transition-all font-medium"
          style={{
            borderColor: isAutoPlay ? activeColor : "#334155",
            color: isAutoPlay ? activeColor : "#94a3b8",
            background: isAutoPlay ? `${activeColor}15` : "transparent",
          }}
        >
          {isAutoPlay ? "⏸ Pause" : "▶ Auto"}
        </button>
        <button
          onClick={() => { onStepChange(0); setIsAutoPlay(false); }}
          className="px-3 py-1.5 rounded-lg text-sm border border-[#334155] text-[#475569] hover:text-[#94a3b8] transition-all"
        >
          ↺ Reset
        </button>

        <span className="text-xs text-[#475569] ml-auto">
          Step {currentStep + 1} / {SENTENCE_TOKENS.length}
        </span>
      </div>
    </div>
  );
}
