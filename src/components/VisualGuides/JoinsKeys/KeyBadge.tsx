"use client";

import React from "react";
import { keyColor } from "./types";

type Props = {
  value: number;
  /** Marks a key value that has no partner on the other side. */
  orphan?: boolean;
};

/**
 * Color-coded key chip. The number itself is always shown, so color is never
 * the sole indicator; orphan keys additionally get a dashed border.
 */
export default function KeyBadge({ value, orphan = false }: Props) {
  const color = keyColor(value);
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[26px] px-1.5 py-0.5 rounded-md font-mono text-[11px] font-bold border ${
        orphan ? "border-dashed" : ""
      }`}
      style={{ color, borderColor: color, background: "#0f172a" }}
    >
      {value}
    </span>
  );
}
