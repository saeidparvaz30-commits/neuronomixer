"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuideMotion } from "@/lib/guideMotion";
import { Choice, CorpusItem } from "./types";
import { countWords } from "./judge";

type Props = {
  items: readonly CorpusItem[];
  picks: Readonly<Record<number, Choice>>;
  onPick: (id: number, choice: Choice) => void;
  matches: number;
};

const SLOT_LABEL: Record<Choice, string> = { first: "Answer 1", second: "Answer 2" };

export default function HumanBaseline({ items, picks, onPick, matches }: Props) {
  const { fadeIn } = useGuideMotion();
  const allPicked = items.every((item) => picks[item.id] !== undefined);

  return (
    <div>
      <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
        Before trusting an automated judge, do its job yourself. For each question below,
        pick the answer you would grade higher. Your pick locks in, then you see what an
        expert panel decided and why. This is the human baseline every judge on this page
        is measured against.
      </p>

      {items.map((item, idx) => {
        const picked = picks[item.id];
        const revealed = picked !== undefined;
        const matched = picked === item.human;

        return (
          <div key={item.id} className="rounded-xl border border-[#1e293b] p-4 mb-4">
            <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
              Question {idx + 1} of {items.length}
            </p>
            <p className="text-[13px] font-semibold text-white mb-3">{item.question}</p>

            <div
              role="radiogroup"
              aria-label={`Pick the better answer for: ${item.question}`}
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
            >
              {(["first", "second"] as const).map((slot) => {
                const answer = item[slot];
                const isPicked = picked === slot;
                const isGold = item.human === slot;
                return (
                  <button
                    key={slot}
                    role="radio"
                    aria-checked={isPicked}
                    disabled={revealed}
                    onClick={() => onPick(item.id, slot)}
                    className={`text-left rounded-xl border p-3.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                      isPicked
                        ? "border-[var(--color-accent)] bg-[#d4af37]/5"
                        : revealed
                          ? "border-[#1e293b] opacity-80 cursor-default"
                          : "border-[#1e293b] hover:border-[#334155] cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wide ${
                          isPicked ? "text-[var(--color-accent)]" : "text-[#475569]"
                        }`}
                      >
                        {SLOT_LABEL[slot]}
                        {isPicked ? " (your pick)" : ""}
                      </span>
                      {revealed && isGold && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#3bb4a4]/50 text-[#3bb4a4]">
                          Panel pick
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#f1f5f9] leading-relaxed mb-2">
                      {answer.text}
                    </p>
                    <p className="text-[10px] text-[#475569] font-mono">
                      {answer.author} · {countWords(answer.text)} words
                    </p>
                  </button>
                );
              })}
            </div>

            <AnimatePresence>
              {revealed && (
                <motion.div
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className={`mt-3 rounded-lg border p-3 ${
                    matched ? "border-[#3bb4a4]/40" : "border-[var(--color-warning)]/40"
                  }`}
                >
                  <p
                    className={`text-[11px] font-semibold ${
                      matched ? "text-[#3bb4a4]" : "text-[var(--color-warning)]"
                    }`}
                  >
                    {matched
                      ? `You matched the panel: ${SLOT_LABEL[item.human]}.`
                      : `The panel picked ${SLOT_LABEL[item.human]}, you picked ${picked ? SLOT_LABEL[picked] : ""}.`}
                  </p>
                  <p className="text-[11px] text-[#94a3b8] leading-relaxed mt-1">
                    {item.note}
                  </p>
                  <p className="text-[10px] text-[#475569] mt-2 font-mono">
                    Rubric reading: A1 accuracy {item.first.features.accuracy}/4, coverage{" "}
                    {item.first.features.coverage}/3, clarity {item.first.features.clarity}
                    /3 · A2 accuracy {item.second.features.accuracy}/4, coverage{" "}
                    {item.second.features.coverage}/3, clarity{" "}
                    {item.second.features.clarity}/3
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {allPicked && (
        <div className="rounded-xl border border-[var(--color-accent)]/40 p-4">
          <p className="text-[12px] text-[#f1f5f9] leading-relaxed">
            You agreed with the expert panel on{" "}
            <span className="font-mono font-bold text-[var(--color-accent)]">
              {matches} of {items.length}
            </span>{" "}
            answers. Grading is judgment, and even careful humans disagree sometimes.
            That is exactly why agreement gets measured instead of assumed, and the same
            measurement now gets pointed at the automated judge below.
          </p>
        </div>
      )}
    </div>
  );
}
