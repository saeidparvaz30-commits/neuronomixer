"use client";

import React from "react";

interface Props {
  label: string;
  color: string;
}

export default function BiasTypeTag({ label, color }: Props) {
  return (
    <span
      aria-label={`Bias type: ${label}`}
      className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest"
      style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
    >
      {label}
    </span>
  );
}
