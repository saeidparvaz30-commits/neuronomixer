"use client";

import React from "react";
import { DEFECTS, DefectId } from "./data";

interface Props {
  active: Record<DefectId, boolean>;
  cycled: ReadonlySet<DefectId>;
  onToggle: (id: DefectId) => void;
}

export default function DefectPanel({ active, cycled, onToggle }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {DEFECTS.map((d) => {
        const isOn = active[d.id];
        const isCycled = cycled.has(d.id);
        return (
          <div
            key={d.id}
            className="rounded-2xl border bg-[#0f172a] p-4 transition-colors"
            style={{
              borderColor: isOn ? "var(--color-warning)" : "#1e293b",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-white">{d.label}</p>
                <p className="text-[11px] text-[#94a3b8] leading-relaxed mt-1">
                  {d.action}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onToggle(d.id)}
                aria-pressed={isOn}
                aria-label={`${isOn ? "Repair" : "Inject"}: ${d.label}`}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                  isOn
                    ? "border-[var(--color-success)] text-[var(--color-success)] hover:opacity-80"
                    : "border-[#334155] text-white hover:border-[var(--color-warning)] hover:text-[var(--color-warning)]"
                }`}
              >
                {isOn ? "Repair" : "Inject"}
              </button>
            </div>
            <div className="mt-2 min-h-[18px]">
              {isCycled ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Diagnosed: hits {d.hitsLabel}
                </span>
              ) : isOn ? (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-warning)]">
                  Injected. Watch the meters, then repair it.
                </span>
              ) : (
                <span className="text-[10px] text-[#475569]">
                  Inject it, read the meters, repair it.
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
