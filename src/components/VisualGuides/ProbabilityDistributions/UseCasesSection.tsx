"use client";

import React from "react";
import { DistributionType, DISTRIBUTIONS } from "./types";

interface Props {
  type: DistributionType;
}

export default function UseCasesSection({ type }: Props) {
  const meta = DISTRIBUTIONS[type];

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">
        Real-World Use Cases
      </p>
      <ul className="space-y-2">
        {meta.useCases.map(uc => (
          <li key={uc} className="flex items-start gap-2">
            <span
              className="mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: meta.color }}
            />
            <span className="text-[12px] text-[#94a3b8] leading-snug">{uc}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
