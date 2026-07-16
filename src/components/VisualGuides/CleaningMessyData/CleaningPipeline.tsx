"use client";

import React from "react";
import { STEPS, StepId, StepState, CATEGORY_MAP_ENTRIES } from "./types";

interface Props {
  steps: StepState;
  onToggle: (id: StepId) => void;
  /** One live, computed effect line per step (computed in the client from the data). */
  readouts: Record<StepId, string>;
}

export default function CleaningPipeline({ steps, onToggle, readouts }: Props) {
  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-1">
        The cleaning pipeline
      </p>
      <p className="text-[11px] text-[#475569] leading-relaxed mb-4">
        Toggle steps in any order you like; the pipeline always executes top to bottom.
        Watch what each one does to the table and the scoreboard, including what happens
        when you map synonyms before trimming.
      </p>
      <ol className="flex flex-col gap-2">
        {STEPS.map((s, i) => {
          const on = steps[s.id];
          return (
            <li key={s.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onToggle(s.id)}
                className={`w-full text-left rounded-xl border px-3.5 py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                  on
                    ? "border-[var(--color-accent)] bg-[#1e293b]"
                    : "border-[#1e293b] hover:border-[#334155]"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-5 h-5 shrink-0 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                        on
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[#0a0e1a]"
                          : "border-[#334155] text-[#475569]"
                      }`}
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    <span className={`text-[12px] font-semibold ${on ? "text-white" : "text-[#94a3b8]"}`}>
                      {s.label}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 text-[9px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 border ${
                      on
                        ? "text-[var(--color-success)] border-[var(--color-success)]/40"
                        : "text-[#475569] border-[#334155]"
                    }`}
                  >
                    {on ? "applied" : "off"}
                  </span>
                </span>
                <span className="block text-[11px] text-[#94a3b8] leading-relaxed mt-1.5">
                  {s.description}{" "}
                  <span className="text-[#475569]">Applies to: {s.appliesTo}.</span>
                </span>
                <span className="block text-[11px] font-mono text-[var(--color-accent)] mt-1.5">
                  {readouts[s.id]}
                </span>
                {s.id === "map" && (
                  <span className="block mt-2 rounded-lg bg-[#162032] border border-[#1e293b] p-2">
                    <span className="block text-[9px] font-semibold uppercase tracking-wide text-[#475569] mb-1">
                      The dictionary (exact-match keys)
                    </span>
                    <span className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                      {CATEGORY_MAP_ENTRIES.map((e) => (
                        <span key={e.from} className="font-mono text-[10px] text-[#94a3b8]">
                          &quot;{e.from}&quot; &rarr; {e.to}
                        </span>
                      ))}
                    </span>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
