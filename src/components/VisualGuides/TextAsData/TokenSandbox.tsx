"use client";

import React, { useMemo } from "react";
import {
  PipelineOptions,
  PipelineToken,
  WordCount,
  STOP_WORDS,
} from "./textPipeline";

interface Props {
  text: string;
  onTextChange: (t: string) => void;
  opts: PipelineOptions;
  onToggle: (k: keyof PipelineOptions) => void;
  togglesTried: ReadonlySet<keyof PipelineOptions>;
  pipe: readonly PipelineToken[];
  counts: readonly WordCount[];
}

const MAX_CHARS = 2000;
const MAX_CHIPS = 60;
const TOP_N = 12;

interface Segment {
  text: string;
  token: PipelineToken | null;
}

const TOGGLE_META: {
  key: keyof PipelineOptions;
  label: string;
  blurb: string;
}[] = [
  {
    key: "lowercase",
    label: "Lowercase",
    blurb: "Fold case so Count and count become one word.",
  },
  {
    key: "stopwords",
    label: "Remove stop words",
    blurb: "Drop very common function words from the counts.",
  },
  {
    key: "stem",
    label: "Crude stemming",
    blurb: "Strip s, ing, and ed suffixes with rough rules.",
  },
];

export default function TokenSandbox({
  text,
  onTextChange,
  opts,
  onToggle,
  togglesTried,
  pipe,
  counts,
}: Props) {
  // Rebuild the source text as segments so token boundaries can be
  // highlighted in place: token spans vs. the discarded characters between.
  const segments = useMemo<Segment[]>(() => {
    const segs: Segment[] = [];
    let pos = 0;
    for (const t of pipe) {
      if (t.raw.start > pos) segs.push({ text: text.slice(pos, t.raw.start), token: null });
      segs.push({ text: t.raw.text, token: t });
      pos = t.raw.end;
    }
    if (pos < text.length) segs.push({ text: text.slice(pos), token: null });
    return segs;
  }, [pipe, text]);

  const keptTokens = useMemo(() => pipe.filter((t) => t.final !== null), [pipe]);
  const removedCount = pipe.length - keptTokens.length;
  const lowercasedCount = useMemo(
    () => pipe.filter((t) => t.lowercased).length,
    [pipe]
  );
  const stemmedCount = useMemo(
    () => pipe.filter((t) => t.stemmed).length,
    [pipe]
  );

  const effectCount: Record<keyof PipelineOptions, number> = {
    lowercase: lowercasedCount,
    stopwords: removedCount,
    stem: stemmedCount,
  };

  const topWords = counts.slice(0, TOP_N);
  const maxCount = topWords.length > 0 ? topWords[0].count : 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left: text box + token views */}
      <div className="lg:col-span-3 flex flex-col gap-4">
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-5">
          <label
            htmlFor="text-as-data-sandbox"
            className="block text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-2"
          >
            Your text (edit it, the counts follow every keystroke)
          </label>
          <textarea
            id="text-as-data-sandbox"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            maxLength={MAX_CHARS}
            rows={4}
            placeholder="Type or paste some text"
            className="w-full rounded-xl px-4 py-3 text-[14px] text-white bg-[#1e293b] border border-white/10 focus:outline-none focus:border-[#3bb4a4] resize-none transition-colors placeholder:text-[#475569]"
          />
          <p className="text-[10px] text-[#475569] mt-1 text-right">
            {text.length} of {MAX_CHARS} characters
          </p>
        </div>

        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-2">
            What the tokenizer sees
          </p>
          <div className="text-[13px] leading-[1.9] whitespace-pre-wrap break-words">
            {segments.length === 0 && (
              <span className="text-[#475569]">Nothing yet. Type above.</span>
            )}
            {segments.map((seg, i) =>
              seg.token === null ? (
                <span key={i} className="text-[#475569]">
                  {seg.text}
                </span>
              ) : seg.token.final === null ? (
                <span
                  key={i}
                  className="rounded px-0.5 text-[#475569] line-through decoration-[#ef4444]/60"
                  title="Removed by the stop list"
                >
                  {seg.text}
                </span>
              ) : (
                <span
                  key={i}
                  className="rounded px-0.5 bg-[#1e293b] text-[#f1f5f9] border-b border-[#3bb4a4]/50"
                >
                  {seg.text}
                </span>
              )
            )}
          </div>
          <p className="text-[10px] text-[#475569] mt-3 leading-relaxed">
            Underlined spans are word tokens: runs of letters and digits,
            with one apostrophe allowed inside. Dim characters (spaces,
            punctuation) never make it into the data. Struck-through tokens
            were removed by the stop list.
          </p>
        </div>

        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-2">
            After the pipeline: the tokens that get counted
          </p>
          <div className="flex flex-wrap gap-1.5">
            {keptTokens.length === 0 && (
              <span className="text-[12px] text-[#475569]">
                No tokens survive the current pipeline.
              </span>
            )}
            {keptTokens.slice(0, MAX_CHIPS).map((t, i) => {
              const changed = t.final !== t.raw.text;
              return (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[11px] font-mono ${
                    changed
                      ? "border-[#3bb4a4]/50 text-[#3bb4a4]"
                      : "border-[#1e293b] text-[#94a3b8]"
                  }`}
                >
                  {changed && (
                    <span className="text-[#475569] line-through decoration-[#475569]">
                      {t.raw.text}
                    </span>
                  )}
                  {changed && <span aria-hidden="true">→</span>}
                  {t.final}
                </span>
              );
            })}
            {keptTokens.length > MAX_CHIPS && (
              <span className="text-[11px] text-[#475569] self-center">
                +{keptTokens.length - MAX_CHIPS} more
              </span>
            )}
          </div>
          <p className="text-[10px] text-[#475569] mt-3 leading-relaxed">
            Teal chips show a token the pipeline rewrote, with the original
            struck through before the arrow. These final forms are what the
            frequency chart counts.
          </p>
        </div>
      </div>

      {/* Right: toggles + stats + chart */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-3">
            Normalization pipeline (applied in this order)
          </p>
          <div className="flex flex-col gap-2">
            {TOGGLE_META.map((t) => {
              const on = opts[t.key];
              const tried = togglesTried.has(t.key);
              return (
                <button
                  key={t.key}
                  aria-pressed={on}
                  onClick={() => onToggle(t.key)}
                  className={`text-left rounded-xl border px-3 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                    on
                      ? "border-[var(--color-accent)] bg-[#1e293b]"
                      : "border-[#1e293b] hover:border-[#334155]"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className={`text-[12px] font-semibold ${on ? "text-white" : "text-[#94a3b8]"}`}>
                      {t.label}
                    </span>
                    <span className="flex items-center gap-2">
                      {tried && (
                        <span className="text-[10px] text-[var(--color-success)]">tried</span>
                      )}
                      <span
                        className={`text-[10px] font-mono font-bold ${
                          on ? "text-[var(--color-accent)]" : "text-[#475569]"
                        }`}
                      >
                        {on ? "ON" : "OFF"}
                      </span>
                    </span>
                  </span>
                  <span className="block text-[10px] text-[#475569] mt-0.5 leading-relaxed">
                    {t.blurb}
                    {on && (
                      <span className="text-[#94a3b8]">
                        {" "}
                        Right now: {effectCount[t.key]}{" "}
                        {t.key === "stopwords"
                          ? effectCount[t.key] === 1
                            ? "token removed."
                            : "tokens removed."
                          : effectCount[t.key] === 1
                            ? "token changed."
                            : "tokens changed."}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <details className="mt-3">
            <summary className="text-[10px] text-[#475569] cursor-pointer hover:text-[#94a3b8] transition-colors">
              Show the {STOP_WORDS.length}-word stop list this guide uses
            </summary>
            <p className="text-[10px] font-mono text-[#475569] mt-2 leading-relaxed">
              {STOP_WORDS.join(", ")}
            </p>
            <p className="text-[10px] text-[#475569] mt-1.5 leading-relaxed">
              Matching is exact, so with Lowercase off, a capitalized
              &quot;The&quot; slips past the entry &quot;the&quot;. Stage
              order is part of the pipeline design.
            </p>
          </details>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-3.5">
            <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
              Tokens kept
            </p>
            <p className="text-xl font-black font-mono text-[#f1f5f9]">
              {keptTokens.length}
            </p>
          </div>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-3.5">
            <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
              Distinct words
            </p>
            <p className="text-xl font-black font-mono text-[#f1f5f9]">
              {counts.length}
            </p>
          </div>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-3.5">
            <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
              Stop words cut
            </p>
            <p className="text-xl font-black font-mono text-[#f1f5f9]">
              {removedCount}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-3">
            Word frequency (top {topWords.length} of {counts.length} distinct)
          </p>
          {topWords.length === 0 ? (
            <p className="text-[11px] text-[#475569]">
              Nothing to count yet.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {topWords.map(({ word, count }) => (
                <div key={word} className="flex items-center gap-2">
                  <span className="w-[88px] shrink-0 text-right text-[11px] font-mono text-[#94a3b8] truncate">
                    {word}
                  </span>
                  <div className="relative h-4 flex-1 rounded bg-[#1e293b] overflow-hidden">
                    <span
                      className="absolute left-0 top-0 bottom-0 rounded-sm bg-[var(--color-accent)]/80 transition-[width] duration-200"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-[28px] shrink-0 text-[11px] font-mono text-[#94a3b8]">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-[#475569] mt-3 leading-relaxed">
            This bag-of-words vector is the oldest text representation in the
            book, and it still powers plenty of search and classification.
            Flip the switches above and watch rows merge and vanish.
          </p>
        </div>
      </div>
    </div>
  );
}
