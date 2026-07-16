"use client";

import React from "react";
import { OverlapStats, PipelineOptions } from "./textPipeline";

interface Props {
  docA: string;
  docB: string;
  onDocAChange: (t: string) => void;
  onDocBChange: (t: string) => void;
  opts: PipelineOptions;
  vocabA: ReadonlySet<string>;
  vocabB: ReadonlySet<string>;
  overlap: OverlapStats;
}

const MAX_CHARS = 2500;
const MAX_SHARED_CHIPS = 24;

const COLOR_A = "#60a5fa";
const COLOR_B = "#3bb4a4";

export default function DocOverlap({
  docA,
  docB,
  onDocAChange,
  onDocBChange,
  opts,
  vocabA,
  vocabB,
  overlap,
}: Props) {
  const activeStages = [
    opts.lowercase ? "lowercase" : null,
    opts.stopwords ? "stop-word removal" : null,
    opts.stem ? "crude stemming" : null,
  ].filter((s): s is string => s !== null);

  const pctShared =
    overlap.union === 0 ? 0 : (overlap.shared.length / overlap.union) * 100;
  const pctOnlyA =
    overlap.union === 0 ? 0 : (overlap.onlyA.length / overlap.union) * 100;
  const pctOnlyB =
    overlap.union === 0 ? 0 : (overlap.onlyB.length / overlap.union) * 100;

  return (
    <div className="flex flex-col gap-4">
      {/* Two documents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(
          [
            {
              id: "text-as-data-doc-a",
              label: "Document A",
              value: docA,
              onChange: onDocAChange,
              vocab: vocabA,
              color: COLOR_A,
            },
            {
              id: "text-as-data-doc-b",
              label: "Document B",
              value: docB,
              onChange: onDocBChange,
              vocab: vocabB,
              color: COLOR_B,
            },
          ] as const
        ).map((doc) => (
          <div
            key={doc.id}
            className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-5"
          >
            <label
              htmlFor={doc.id}
              className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-2"
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ background: doc.color }}
                aria-hidden="true"
              />
              {doc.label}
            </label>
            <textarea
              id={doc.id}
              value={doc.value}
              onChange={(e) => doc.onChange(e.target.value)}
              maxLength={MAX_CHARS}
              rows={5}
              placeholder="Paste or type a document"
              className="w-full rounded-xl px-4 py-3 text-[13px] text-white bg-[#1e293b] border border-white/10 focus:outline-none focus:border-[#3bb4a4] resize-none transition-colors placeholder:text-[#475569]"
            />
            <p className="text-[10px] text-[#475569] mt-1.5">
              Vocabulary after your pipeline:{" "}
              <span className="font-mono text-[#94a3b8]">{doc.vocab.size}</span>{" "}
              distinct words
            </p>
          </div>
        ))}
      </div>

      {/* Overlap results */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8]">
            Shared vocabulary (Jaccard overlap)
          </p>
          <p className="text-[10px] text-[#475569]">
            {activeStages.length > 0
              ? `Section 1 pipeline applied to both: ${activeStages.join(", ")}.`
              : "No normalization active: raw tokens compared exactly."}
          </p>
        </div>

        {/* Segmented union bar */}
        <div
          className="relative h-6 w-full rounded-lg bg-[#1e293b] overflow-hidden flex"
          role="img"
          aria-label={`Of ${overlap.union} distinct words across both documents, ${overlap.onlyA.length} appear only in document A, ${overlap.shared.length} are shared, and ${overlap.onlyB.length} appear only in document B.`}
        >
          {overlap.union > 0 && (
            <>
              <span
                className="h-full transition-[width] duration-200"
                style={{ width: `${pctOnlyA}%`, background: COLOR_A }}
              />
              <span
                className="h-full transition-[width] duration-200"
                style={{ width: `${pctShared}%`, background: "var(--color-accent)" }}
              />
              <span
                className="h-full transition-[width] duration-200"
                style={{ width: `${pctOnlyB}%`, background: COLOR_B }}
              />
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[10px] text-[#94a3b8]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: COLOR_A }} />
            only in A: <span className="font-mono">{overlap.onlyA.length}</span>
          </span>
          <span className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ background: "var(--color-accent)" }}
            />
            shared: <span className="font-mono">{overlap.shared.length}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: COLOR_B }} />
            only in B: <span className="font-mono">{overlap.onlyB.length}</span>
          </span>
        </div>

        {/* Jaccard formula, computed live */}
        <div className="mt-4 rounded-xl border border-[#1e293b] p-4">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-2">
            Jaccard similarity of the two vocabularies
          </p>
          <p className="font-mono text-[13px] text-[#93c5fd]">
            J = |A ∩ B| / |A ∪ B| = {overlap.shared.length} / {overlap.union}{" "}
            ={" "}
            <span className="text-[var(--color-accent)] font-bold">
              {overlap.union === 0 ? "0.00" : overlap.jaccard.toFixed(2)}
            </span>
          </p>
          <p className="text-[10px] text-[#475569] mt-2 leading-relaxed">
            1.00 means identical vocabularies, 0.00 means no word in common.
            Turn on lowercasing or stemming in section 1 and watch the
            overlap move: normalization decides which words count as the
            same word.
          </p>
        </div>

        {/* Shared words */}
        <div className="mt-4">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-2">
            The {overlap.shared.length} shared{" "}
            {overlap.shared.length === 1 ? "word" : "words"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {overlap.shared.length === 0 && (
              <span className="text-[11px] text-[#475569]">
                No shared vocabulary under the current pipeline.
              </span>
            )}
            {overlap.shared.slice(0, MAX_SHARED_CHIPS).map((w) => (
              <span
                key={w}
                className="rounded-lg border border-[#d4af37]/30 px-1.5 py-0.5 text-[11px] font-mono text-[var(--color-accent)]"
              >
                {w}
              </span>
            ))}
            {overlap.shared.length > MAX_SHARED_CHIPS && (
              <span className="text-[11px] text-[#475569] self-center">
                +{overlap.shared.length - MAX_SHARED_CHIPS} more
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
