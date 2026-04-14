"use client";

import React, { useState } from "react";
import type { Scale } from "./types";
import { VALID_OPERATIONS } from "./types";

interface Props {
  scale: Scale;
}

export default function ValidOperationsPanel({ scale }: Props) {
  const [tooltip, setTooltip] = useState<string | null>(null);

  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-2">Valid Operations</p>
      {VALID_OPERATIONS.map((op) => {
        const valid = op.availableFor.includes(scale);
        return (
          <div
            key={op.name}
            className="relative flex items-start gap-2 group"
            onMouseEnter={() => setTooltip(op.name)}
            onMouseLeave={() => setTooltip(null)}
            onFocus={() => setTooltip(op.name)}
            onBlur={() => setTooltip(null)}
            tabIndex={0}
            role="listitem"
          >
            <span
              className={`shrink-0 mt-0.5 text-[12px] ${valid ? "text-[#3bb4a4]" : "text-[#475569]"}`}
              aria-hidden="true"
            >
              {valid ? "✓" : "✗"}
            </span>
            <span
              className={`text-[11px] leading-tight cursor-default ${valid ? "text-[#f1f5f9]" : "text-[#475569] line-through decoration-[#475569]/50"}`}
            >
              {op.name}
            </span>
            {tooltip === op.name && (
              <span className="absolute bottom-full left-0 mb-1.5 z-50 w-52 rounded-xl bg-[#1e293b] border border-[#334155] shadow-xl px-3 py-2 text-[11px] text-[#f1f5f9] leading-relaxed">
                {op.why}
                <span className="absolute top-full left-4 border-4 border-transparent border-t-[#1e293b]" />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
