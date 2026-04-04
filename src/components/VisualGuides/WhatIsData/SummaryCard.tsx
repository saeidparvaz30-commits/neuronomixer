"use client";

import { motion } from "framer-motion";
import Link from "next/link";

type SummaryCardProps = {
  onReset: () => void;
};

const SUMMARY = [
  {
    id: "structured",
    label: "Structured Data",
    color: "#3b82f6",
    items: ["CSV Sales Data", "SQL Database Table", "Excel Spreadsheet"],
    explanation:
      "Structured data lives in rows and columns with a strictly defined schema. Every record follows the same format, making it easy for machines to query and analyze at scale.",
    keyTrait: "Fits neatly into tables with predefined columns and data types.",
  },
  {
    id: "semi",
    label: "Semi-Structured Data",
    color: "#d4af37",
    items: ["JSON API Response", "XML Configuration", "Email with Metadata"],
    explanation:
      "Semi-structured data has self-describing markers (keys, tags, headers) but doesn't conform to a rigid tabular schema. The structure is flexible — fields can be nested, optional, or variable.",
    keyTrait: "Uses tags or keys to organize data without enforcing a fixed schema.",
  },
  {
    id: "unstructured",
    label: "Unstructured Data",
    color: "#a855f7",
    items: ["Social Media Post", "Audio Waveform", "Photograph"],
    explanation:
      "Unstructured data has no predefined format. Text, audio, images, and video are raw blobs of bytes with meaning that must be extracted by NLP, computer vision, or other ML techniques.",
    keyTrait: "No predefined format — meaning must be inferred by algorithms.",
  },
];

export default function SummaryCard({ onReset }: SummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", bounce: 0.25, duration: 0.6 }}
      className="mt-8 rounded-2xl border border-white/[0.08] bg-[#0f172a] overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/[0.07]">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-5 h-px bg-[var(--color-accent)]" />
          <span className="text-[10px] font-semibold uppercase tracking-[2px] text-[var(--color-accent)]">
            Guide Complete
          </span>
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-white">
          {"You've got it! 🎉"}
        </h2>
        <p className="text-sm text-[#94a3b8] mt-1">
          You correctly sorted all 9 data samples. Here&apos;s a quick recap of what you learned.
        </p>
      </div>

      {/* Three columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.07]">
        {SUMMARY.map((s) => (
          <div key={s.id} className="p-5">
            {/* Color-coded heading */}
            <div
              className="text-[11px] font-bold uppercase tracking-[1.5px] mb-2"
              style={{ color: s.color }}
            >
              {s.label}
            </div>

            {/* Items */}
            <ul className="space-y-1 mb-3">
              {s.items.map((item) => (
                <li key={item} className="flex items-center gap-1.5 text-[12px] text-white">
                  <svg
                    className="w-3 h-3 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke={s.color}
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>

            {/* Explanation */}
            <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
              {s.explanation}
            </p>

            {/* Key trait callout */}
            <div
              className="rounded-lg px-3 py-2 text-[11px] font-medium leading-snug"
              style={{ background: s.color + "15", color: s.color }}
            >
              {s.keyTrait}
            </div>
          </div>
        ))}
      </div>

      {/* Footer buttons */}
      <div className="px-6 py-4 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-end gap-3">
        <button
          onClick={onReset}
          className="px-5 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
        >
          Try Again
        </button>
        <Link
          href="/visual-guides"
          className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
        >
          Back to Guides &rarr;
        </Link>
      </div>
    </motion.div>
  );
}
