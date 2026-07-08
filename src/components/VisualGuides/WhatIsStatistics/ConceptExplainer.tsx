"use client";

import React, { useState, useRef, useEffect } from "react";

interface Props {
  term: string;
  definition: string;
}

export default function ConceptExplainer({ term, definition }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => e.key === "Enter" && setOpen((v) => !v)}
        className="underline decoration-dotted underline-offset-2 text-[var(--color-accent)] cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] rounded"
        aria-label={`Definition of ${term}`}
        aria-expanded={open}
      >
        {term}
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 rounded-xl bg-[#1e293b] border border-[#334155] shadow-xl px-3 py-2 text-xs text-[#f1f5f9] leading-relaxed"
        >
          {definition}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1e293b]" />
        </span>
      )}
    </span>
  );
}
