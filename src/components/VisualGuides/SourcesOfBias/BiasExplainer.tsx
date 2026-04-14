"use client";

import React, { useState } from "react";

interface ConceptTerm {
  term: string;
  definition: string;
}

interface Props {
  lessonText: string;
  conceptTerms: ConceptTerm[];
}

function InlineTooltip({ term, definition }: ConceptTerm) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="underline decoration-dotted underline-offset-2 text-[#d4af37] cursor-help focus:outline-none"
        aria-expanded={open}
      >
        {term}
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 rounded-xl bg-[#1e293b] border border-[#334155] shadow-xl px-3 py-2 text-[11px] text-[#f1f5f9] leading-relaxed">
          {definition}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1e293b]" />
        </span>
      )}
    </span>
  );
}

export default function BiasExplainer({ lessonText, conceptTerms }: Props) {
  // Replace concept terms with tooltip components
  const parts: React.ReactNode[] = [];
  let remaining = lessonText;
  let idx = 0;

  conceptTerms.forEach(({ term, definition }) => {
    const i = remaining.indexOf(term);
    if (i === -1) return;
    if (i > 0) parts.push(<span key={idx++}>{remaining.slice(0, i)}</span>);
    parts.push(<InlineTooltip key={idx++} term={term} definition={definition} />);
    remaining = remaining.slice(i + term.length);
  });
  parts.push(<span key={idx}>{remaining}</span>);

  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-4 mt-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-2">Key Takeaway</p>
      <p className="text-[13px] text-[#f1f5f9] leading-relaxed">{parts}</p>
    </div>
  );
}
