"use client";

import React, { useMemo } from "react";
import {
  CHECKLIST_SCENARIO,
  CHECKLIST_GROUPS,
  CHECKLIST_HIDDEN_COUNT,
} from "./types";

interface Props {
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
  solved: boolean;
}

export default function InvisibleChecklist({ selected, onToggle, solved }: Props) {
  const hiddenFound = useMemo(
    () => CHECKLIST_GROUPS.filter((g) => g.invisible && selected.has(g.id)).length,
    [selected]
  );
  const falseAlarms = useMemo(
    () => CHECKLIST_GROUPS.filter((g) => !g.invisible && selected.has(g.id)).length,
    [selected]
  );

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-6">
      <p className="text-[13px] text-[#94a3b8] leading-relaxed mb-4">{CHECKLIST_SCENARIO}</p>
      <p className="text-[11px] text-[#475569] mb-3">
        Mark every group that is invisible to this channel. Feedback is instant.
      </p>
      <div className="flex flex-col gap-2 mb-4">
        {CHECKLIST_GROUPS.map((g) => {
          const isSelected = selected.has(g.id);
          const correct = isSelected && g.invisible;
          const wrong = isSelected && !g.invisible;
          return (
            <div key={g.id}>
              <button
                aria-pressed={isSelected}
                onClick={() => onToggle(g.id)}
                className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                  correct
                    ? "border-[var(--color-success)] bg-[#162032]"
                    : wrong
                      ? "border-[var(--color-warning)] bg-[#162032]"
                      : "border-[#1e293b] hover:border-[#334155]"
                }`}
              >
                <span
                  className="mt-0.5 w-4 h-4 shrink-0 rounded border flex items-center justify-center text-[10px] font-bold"
                  style={{
                    borderColor: correct
                      ? "var(--color-success)"
                      : wrong
                        ? "var(--color-warning)"
                        : "#334155",
                    color: correct
                      ? "var(--color-success)"
                      : wrong
                        ? "var(--color-warning)"
                        : "#475569",
                  }}
                  aria-hidden="true"
                >
                  {correct ? "✓" : wrong ? "✕" : ""}
                </span>
                <span className="flex-1">
                  <span className={`block text-[12px] font-semibold ${isSelected ? "text-white" : "text-[#94a3b8]"}`}>
                    {g.label}
                  </span>
                  {isSelected && (
                    <span
                      className="block text-[11px] mt-1 leading-relaxed"
                      style={{
                        color: correct ? "var(--color-success)" : "var(--color-warning)",
                      }}
                    >
                      {g.feedback}
                    </span>
                  )}
                </span>
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-[11px] font-mono text-[#94a3b8]" aria-live="polite">
          Hidden groups found: {hiddenFound}/{CHECKLIST_HIDDEN_COUNT} · False
          alarms: {falseAlarms}
        </p>
        {solved && (
          <p className="text-[11px] font-semibold text-[var(--color-success)]">
            Solved: you found everyone the dashboard will never see.
          </p>
        )}
      </div>
    </div>
  );
}
