"use client";

import React from "react";
import {
  CANONICAL_PATH,
  PATH_LENGTH,
  Strictness,
  STRICTNESS_META,
  Token,
  tokenById,
  VALUE_POSITIONS,
  VOCAB,
  VOCAB_SIZE,
} from "./types";
import { allowedTokenIds } from "./grammar";

const VOCAB_GROUPS: { label: string; kinds: Token["kind"][] }[] = [
  { label: "Structure", kinds: ["struct", "key"] },
  { label: "Values", kinds: ["str", "other"] },
  { label: "Distractors", kinds: ["noise"] },
  { label: "Stop", kinds: ["end"] },
];

const VALUE_SLOT_NAMES: Record<number, string> = {
  3: "tool",
  10: "city",
  14: "units",
};

type Props = {
  strictness: Strictness;
};

export default function SchemaCard({ strictness }: Props) {
  return (
    <div>
      <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
        The task: emit a tool call for the weather in Oslo, in celsius, as one exact
        token path. The generator picks from a vocabulary of {VOCAB_SIZE} tokens at every
        step, and a single grammar-illegal pick anywhere in the path makes the whole
        output unparseable. That is why per-token reliability compounds so brutally.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Intended token path */}
        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-2 uppercase tracking-wide">
            Intended token path ({PATH_LENGTH} tokens)
          </p>
          <pre className="whitespace-pre-wrap break-words bg-[#1e293b]/60 rounded-lg p-3 font-mono text-[12px] text-[#93c5fd] leading-relaxed">
            {CANONICAL_PATH.map((id) => tokenById(id).text).join(" ")}
          </pre>
          <p className="text-[11px] text-[#475569] leading-relaxed mt-2">
            Three positions are value slots ({VALUE_POSITIONS.map((p) => VALUE_SLOT_NAMES[p]).join(", ")}).
            Everything else is structure: exactly one token is legal there.
          </p>
        </div>

        {/* Vocabulary */}
        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-2 uppercase tracking-wide">
            Token vocabulary ({VOCAB_SIZE} tokens)
          </p>
          <div className="flex flex-col gap-2">
            {VOCAB_GROUPS.map((group) => {
              const tokens = VOCAB.filter((t) => group.kinds.includes(t.kind));
              return (
                <div key={group.label} className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-[#475569] uppercase tracking-wide w-20 shrink-0">
                    {group.label}
                  </span>
                  {tokens.map((t) => (
                    <span
                      key={t.id}
                      className={`px-1.5 py-0.5 rounded font-mono text-[11px] border ${
                        t.kind === "noise"
                          ? "border-[#334155] text-[#94a3b8] border-dashed"
                          : "border-[#1e293b] text-[#93c5fd]"
                      }`}
                    >
                      {t.text}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* What the current strictness allows */}
      <div className="rounded-xl border border-[#1e293b] p-4">
        <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
          Schema strictness: {STRICTNESS_META[strictness].label}
        </p>
        <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-2">
          {STRICTNESS_META[strictness].description}
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {VALUE_POSITIONS.map((pos) => (
            <p key={pos} className="text-[11px] text-[#475569]">
              <span className="font-mono text-[#93c5fd]">{VALUE_SLOT_NAMES[pos]}</span> slot
              accepts{" "}
              <span className="font-mono text-[#f1f5f9]">
                {allowedTokenIds(pos, strictness).length}
              </span>{" "}
              of {VOCAB_SIZE} tokens
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
