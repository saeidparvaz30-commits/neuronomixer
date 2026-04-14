"use client";

import React from "react";
import type { DatasetType } from "./types";
import { DATASETS } from "./types";

interface Props {
  dataset: DatasetType;
}

export default function QuestionPrompt({ dataset }: Props) {
  const ds = DATASETS.find((d) => d.id === dataset)!;
  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-1">
        Your question
      </p>
      <p className="text-[16px] font-semibold text-white leading-snug">
        &ldquo;{ds.question}&rdquo;
      </p>
    </div>
  );
}
