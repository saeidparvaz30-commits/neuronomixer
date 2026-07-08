"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StageId } from "./types";

type Props = { stageId: StageId; isPassed: boolean; onPass: () => void; isVisible: boolean };

// ── Challenge 1: Spot the Problems ─────────────────────────────────────────

const C1_COLS = ["id", "name", "city", "revenue", "date"];
const C1_ROWS = [
  { id: 1, name: "Alice", city: "New York", revenue: "4500",  date: "2024-03-15" },
  { id: 2, name: "Bob",   city: "London",   revenue: null,    date: "2024-04-22" },
  { id: 3, name: "Carol", city: "Tokyo",    revenue: "8200",  date: "12/01/2024" },
  { id: 4, name: "Dave",  city: "Berlin",   revenue: "3100",  date: "2024-06-10" },
  { id: 2, name: "Bob",   city: "London",   revenue: null,    date: "2024-04-22" },
  { id: 5, name: "Eve",   city: "Paris",    revenue: "6700",  date: "2024-07-03" },
] as const;

type C1Problem = { key: string; rowIdx: number; testCol?: string; anyCol?: boolean; hint: string };
const C1_PROBLEMS: C1Problem[] = [
  { key: "null", rowIdx: 1, testCol: "revenue", hint: "Null revenue: missing numeric values break aggregations and model training." },
  { key: "date", rowIdx: 2, testCol: "date",    hint: "Date '12/01/2024' mixes formats; the rest use ISO YYYY-MM-DD standard." },
  { key: "dup",  rowIdx: 4, anyCol: true,       hint: "Exact duplicate of Row 1: same id, name, city, revenue, and date." },
];

function matchProblem(rowIdx: number, col: string): C1Problem | null {
  return C1_PROBLEMS.find((p) => p.rowIdx === rowIdx && (p.anyCol || p.testCol === col)) ?? null;
}

function Challenge1({ isPassed, onPass }: { isPassed: boolean; onPass: () => void }) {
  const [found, setFound]           = useState<Set<string>>(new Set());
  const [wrongFlash, setWrongFlash] = useState<string | null>(null);
  const [tooltip, setTooltip]       = useState<string | null>(null);

  function handleCell(rowIdx: number, col: string) {
    if (isPassed) return;
    const problem = matchProblem(rowIdx, col);
    const key     = `${rowIdx}:${col}`;

    if (problem) {
      if (found.has(problem.key)) return;
      const next = new Set(found);
      next.add(problem.key);
      setFound(next);
      setTooltip(problem.hint);
      setTimeout(() => setTooltip(null), 3500);
      if (next.size === C1_PROBLEMS.length) setTimeout(onPass, 500);
    } else {
      setWrongFlash(key);
      setTimeout(() => setWrongFlash(null), 500);
    }
  }

  function getCellProblem(rowIdx: number, col: string): C1Problem | null {
    const p = matchProblem(rowIdx, col);
    return p && found.has(p.key) ? p : null;
  }

  return (
    <div>
      <p className="text-[13px] text-[#94a3b8] mb-2">
        Click on cells that contain data quality problems. Find all{" "}
        <strong className="text-white">3 issues</strong>.{" "}
        <span className="text-[var(--color-accent)]">{found.size}/3 found</span>
      </p>

      <div className="overflow-x-auto rounded-xl border border-[#1e293b]">
        <table className="w-full border-collapse min-w-max">
          <thead>
            <tr className="bg-[#1e293b]">
              {C1_COLS.map((c) => (
                <th key={c} scope="col" className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8] text-left">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {C1_ROWS.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? "bg-[#0f172a]" : "bg-[#1e293b]/20"}>
                {C1_COLS.map((col) => {
                  const cellKey = `${ri}:${col}`;
                  const problem = getCellProblem(ri, col);
                  const isFound = !!problem;
                  const isWrong = wrongFlash === cellKey;
                  const val     = row[col as keyof typeof row];

                  return (
                    <td
                      key={col}
                      onClick={() => handleCell(ri, col)}
                      className={`px-3 py-2 text-[12px] cursor-pointer select-none transition-colors relative group ${
                        isFound ? "bg-[#ef4444]/15 text-[#ef4444]" :
                        isWrong ? "bg-red-900/20 text-[#ef4444]"   :
                        "text-[#f1f5f9] hover:bg-white/5"
                      }`}
                    >
                      {val === null ? <span className="italic text-[#475569]">null</span> : String(val)}
                      {isFound && <span className="ml-1 text-[#ef4444]">⚠</span>}

                      {/* Hover tooltip on found cells */}
                      {isFound && (
                        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-2.5 py-1.5 rounded-lg bg-[#1e293b] border border-[#ef4444]/30 text-[10px] text-[#ef4444] leading-snug pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity shadow-xl">
                          {problem!.hint}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-[#1e293b]" />
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {tooltip && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-2 px-3 py-2 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30 text-[12px] text-[#ef4444]">
            {tooltip}
          </motion.div>
        )}
      </AnimatePresence>

      {isPassed && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          className="mt-2 px-3 py-2 rounded-lg bg-[#3bb4a4]/10 border border-[#3bb4a4]/30 text-[12px] text-[var(--color-success)]">
          All 3 problems found! Nulls, format inconsistencies, and duplicates appear in virtually every real-world dataset. Hover the red cells to review each issue.
        </motion.div>
      )}
    </div>
  );
}

// ── Challenge 2: Match the Source ──────────────────────────────────────────

const SNIPPETS_BASE = [
  { id: "iot",  display: `{ "temp": 23.5,\n  "humidity": 67,\n  "ts": "2024-01-15T10:23Z" }` },
  { id: "csv",  display: `Name,Email,Phone\nAlice,alice@corp.com,555-1234\nBob,bob@corp.com,555-5678` },
  { id: "xml",  display: `<response>\n  <status>200</status>\n  <data>...</data>\n</response>` },
  { id: "form", display: `[ Name field ]\n[ Email field ]\n[ Message area ]\n[ Submit button ]` },
];
const TARGETS_BASE  = ["IoT Sensor", "CSV Export", "XML API", "Web Form"];
const CORRECT: Record<string, string> = { "IoT Sensor": "iot", "CSV Export": "csv", "XML API": "xml", "Web Form": "form" };

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Challenge2({ isPassed, onPass, isVisible }: { isPassed: boolean; onPass: () => void; isVisible: boolean }) {
  // Shuffle once on mount
  const [snippets] = useState(() => shuffleArr(SNIPPETS_BASE));
  const [targets]  = useState(() => shuffleArr(TARGETS_BASE));

  const [selected, setSelected] = useState<string | null>(null);
  const [matches,  setMatches]  = useState<Record<string, string>>({});  // label → snippetId
  const [errors,   setErrors]   = useState<Set<string>>(new Set());

  // SVG line state
  const containerRef  = useRef<HTMLDivElement>(null);
  const snippetEls    = useRef<Record<string, HTMLButtonElement | null>>({});
  const targetEls     = useRef<Record<string, HTMLDivElement | null>>({});
  const [svgDims, setSvgDims]   = useState({ w: 0, h: 0 });
  const [lines, setLines]       = useState<Array<{ x1: number; y1: number; x2: number; y2: number }>>([]);

  const recalcLines = useCallback(() => {
    if (!containerRef.current) return;
    const cr = containerRef.current.getBoundingClientRect();
    setSvgDims({ w: cr.width, h: cr.height });
    const next: typeof lines = [];
    for (const [label, snipId] of Object.entries(matches)) {
      const se = snippetEls.current[snipId];
      const te = targetEls.current[label];
      if (!se || !te) continue;
      const sr = se.getBoundingClientRect();
      const tr = te.getBoundingClientRect();
      next.push({
        x1: sr.right  - cr.left,
        y1: sr.top    + sr.height / 2 - cr.top,
        x2: tr.left   - cr.left,
        y2: tr.top    + tr.height / 2 - cr.top,
      });
    }
    setLines(next);
  }, [matches]);

  // Recalc when matches change
  useEffect(() => {
    const t = setTimeout(recalcLines, 60);
    return () => clearTimeout(t);
  }, [recalcLines]);

  // Recalc when panel re-opens (after animation settles)
  useEffect(() => {
    if (!isVisible) return;
    const t = setTimeout(recalcLines, 400);
    return () => clearTimeout(t);
  }, [isVisible, recalcLines]);

  function pickSnippet(id: string) {
    if (isPassed || Object.values(matches).includes(id)) return;
    setSelected(selected === id ? null : id);
  }

  function pickTarget(label: string) {
    if (isPassed || !selected || matches[label]) return;
    if (CORRECT[label] === selected) {
      const next = { ...matches, [label]: selected };
      setMatches(next);
      setSelected(null);
      if (Object.keys(next).length === 4) setTimeout(onPass, 500);
    } else {
      setErrors((prev) => new Set([...prev, label]));
      setTimeout(() => {
        setErrors((prev) => { const n = new Set(prev); n.delete(label); return n; });
        setSelected(null);
      }, 700);
    }
  }

  const matchedSnippets = new Set(Object.values(matches));

  return (
    <div>
      <p className="text-[13px] text-[#94a3b8] mb-4">
        Click a data snippet to select it, then click the matching source type. Match all{" "}
        <strong className="text-white">4 pairs</strong>.
      </p>

      <div ref={containerRef} className="relative">
        {/* SVG curved connecting lines */}
        {lines.length > 0 && svgDims.w > 0 && (
          <svg
            className="absolute top-0 left-0 pointer-events-none"
            width={svgDims.w}
            height={svgDims.h}
            style={{ zIndex: 5 }}
          >
            {lines.map((l, i) => {
              const mx = (l.x1 + l.x2) / 2;
              return (
                <path
                  key={i}
                  d={`M${l.x1},${l.y1} C${mx},${l.y1} ${mx},${l.y2} ${l.x2},${l.y2}`}
                  stroke="#3bb4a4"
                  strokeWidth="1.5"
                  fill="none"
                  strokeDasharray="5 3"
                  opacity="0.65"
                />
              );
            })}
          </svg>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Snippets */}
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8] mb-1">Data Snippets</p>
            {snippets.map((s) => {
              const isMatched  = matchedSnippets.has(s.id);
              const isSelected = selected === s.id;
              return (
                <button
                  key={s.id}
                  ref={(el) => { snippetEls.current[s.id] = el; }}
                  onClick={() => pickSnippet(s.id)}
                  className={`text-left px-3 py-2 rounded-lg border text-[11px] font-mono whitespace-pre transition-all ${
                    isSelected ? "border-[var(--color-accent)]   bg-[var(--color-accent)]/10  text-[var(--color-accent)]  cursor-pointer"           :
                    isMatched  ? "border-[#3bb4a4]   bg-[#3bb4a4]/10  text-[var(--color-success)]  cursor-default opacity-80" :
                    "border-[#1e293b] bg-[#1e293b]/30 text-[#94a3b8] hover:border-[#334155] hover:text-white cursor-pointer"
                  }`}
                >
                  {s.display}
                  {isMatched && <span className="block mt-1 text-[9px] not-italic text-[#3bb4a4]/70 font-sans">✓ matched</span>}
                </button>
              );
            })}
          </div>

          {/* Targets */}
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8] mb-1">Source Types</p>
            {targets.map((label) => {
              const isMatched = !!matches[label];
              const isError   = errors.has(label);
              // Find matched snippet label for display
              const matchedSnippetId = matches[label];
              const matchedSnippet   = SNIPPETS_BASE.find((s) => s.id === matchedSnippetId);

              return (
                <motion.div
                  key={label}
                  ref={(el: HTMLDivElement | null) => { targetEls.current[label] = el; }}
                  onClick={() => pickTarget(label)}
                  animate={isError ? { x: [0, -8, 8, -4, 4, 0] } : { x: 0 }}
                  transition={{ duration: 0.35 }}
                  className={`px-3 py-3 rounded-lg border min-h-[48px] transition-all ${
                    isMatched ? "border-[#3bb4a4] bg-[#3bb4a4]/10 cursor-default"            :
                    isError   ? "border-[#ef4444] bg-[#ef4444]/10 cursor-pointer"            :
                    selected  ? "border-[#334155] bg-[#1e293b]/30 cursor-pointer hover:border-[var(--color-accent)]/50" :
                    "border-[#1e293b] bg-[#1e293b]/20 cursor-default"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isMatched && (
                      <svg className="w-3.5 h-3.5 text-[#3bb4a4] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    <span className={`text-[12px] font-semibold ${isMatched ? "text-[var(--color-success)]" : "text-white"}`}>{label}</span>
                  </div>
                  {/* Show which snippet was matched (review mode) */}
                  {isMatched && matchedSnippet && (
                    <p className="text-[9px] text-[#3bb4a4]/60 font-mono mt-0.5 truncate">
                      ← {matchedSnippet.display.split("\n")[0]}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {isPassed && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          className="mt-3 px-3 py-2 rounded-lg bg-[#3bb4a4]/10 border border-[#3bb4a4]/30 text-[12px] text-[var(--color-success)]">
          All sources matched! These are the raw inputs that land in your staging area during the collection phase.
        </motion.div>
      )}
    </div>
  );
}

// ── Challenge 3: Fix the Data ──────────────────────────────────────────────

// Each item stores the correct answer as a string + a hint map keyed by option text
const FIX_ITEMS_BASE = [
  {
    id: "null",  label: "revenue",  rawVal: "N/A",
    options: ["Replace with median", "Remove row", "Leave as-is"],
    correctOpt: "Replace with median", cleanVal: "4750.00",
    correctExp: "Imputation with the median preserves the row and avoids bias from extreme values; the whole record is saved.",
    wrongHints: {
      "Remove row":  "Removing the row loses valid data in other columns; imputation preserves the full record.",
      "Leave as-is": "Leaving N/A will break numeric operations and model training downstream.",
    } as Record<string, string>,
  },
  {
    id: "typo",  label: "city",     rawVal: "new yrok",
    options: ["Correct to New York", "Delete value", "Leave as-is"],
    correctOpt: "Correct to New York", cleanVal: "New York",
    correctExp: "Fuzzy string matching (e.g. Levenshtein distance) catches these typos automatically; 'new yrok' is clearly 'New York'.",
    wrongHints: {
      "Delete value": "Deleting turns it null; the typo is fixable via fuzzy matching, so correct it instead.",
      "Leave as-is":  "Typos cause inconsistent groupings; 'new yrok' and 'New York' appear as separate cities.",
    } as Record<string, string>,
  },
  {
    id: "fmt",   label: "revenue",  rawVal: "$1,200.00",
    options: ["Strip to 1200.00", "Convert to string", "Leave as-is"],
    correctOpt: "Strip to 1200.00", cleanVal: "1200.00",
    correctExp: "Stripping the $ and commas converts the value to a proper float; arithmetic and aggregation work correctly.",
    wrongHints: {
      "Convert to string": "Keeping it as a string means arithmetic and aggregation fail; numeric type is required.",
      "Leave as-is":       "The $ sign and commas break numeric aggregation; always standardize to a raw numeric type.",
    } as Record<string, string>,
  },
];

function Challenge3({ isPassed, onPass }: { isPassed: boolean; onPass: () => void }) {
  const [fixed,      setFixed]      = useState<Set<string>>(new Set());
  const [wrongHints, setWrongHints] = useState<Record<string, string>>({});

  // Shuffle each item's options once on mount so correct answer isn't always first
  const [items] = useState(() =>
    FIX_ITEMS_BASE.map((item) => ({ ...item, options: shuffleArr(item.options) }))
  );

  function pick(id: string, opt: string) {
    if (isPassed || fixed.has(id)) return;
    const item = items.find((f) => f.id === id)!;
    if (opt === item.correctOpt) {
      const next = new Set(fixed);
      next.add(id);
      setFixed(next);
      setWrongHints((p) => { const n = { ...p }; delete n[id]; return n; });
      if (next.size === items.length) setTimeout(onPass, 500);
    } else {
      const hint = item.wrongHints[opt];
      if (hint) setWrongHints((p) => ({ ...p, [id]: hint }));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-[#94a3b8]">
        Choose the correct fix for each data problem. Get all <strong className="text-white">3</strong> right.
      </p>
      {items.map((item) => {
        const isFixed = fixed.has(item.id);
        const hint    = wrongHints[item.id];
        return (
          <div key={item.id} className="rounded-xl border border-[#1e293b] bg-[#1e293b]/20 p-4">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className="text-[11px] text-[#94a3b8] uppercase tracking-wide">{item.label}</span>
              <motion.span
                animate={isFixed ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
                className={`px-2 py-0.5 rounded font-mono text-[12px] border ${
                  isFixed
                    ? "bg-[#3bb4a4]/15 text-[var(--color-success)] border-[#3bb4a4]/30"
                    : "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/30"
                }`}
              >
                {isFixed ? item.cleanVal : item.rawVal}
              </motion.span>
              {isFixed && (
                <svg className="w-4 h-4 text-[#3bb4a4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-2">
              {item.options.map((opt) => {
                const isCorrectOpt = opt === item.correctOpt;
                return (
                  <button
                    key={opt}
                    onClick={() => pick(item.id, opt)}
                    disabled={isFixed}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                      isFixed && isCorrectOpt
                        ? "border-[#3bb4a4] bg-[#3bb4a4]/10 text-[var(--color-success)]"
                        : "border-[#334155] text-[#94a3b8] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-40 disabled:cursor-not-allowed"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              {isFixed ? (
                <motion.p key="correct" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="text-[11px] text-[var(--color-success)] leading-relaxed">
                  ✓ {item.correctExp}
                </motion.p>
              ) : hint ? (
                <motion.p key="hint" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="text-[11px] text-[#ef4444]">
                  {hint}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
      {isPassed && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          className="px-3 py-2 rounded-lg bg-[#3bb4a4]/10 border border-[#3bb4a4]/30 text-[12px] text-[var(--color-success)]">
          Data fixed! Imputation, typo correction, and type standardization form the backbone of any cleaning pipeline.
        </motion.div>
      )}
    </div>
  );
}

// ── Challenge 4: Create the Feature ───────────────────────────────────────

const C4_ROWS = [
  { first_name: "Alice", last_name: "Johnson", purchase_amount: "$240" },
  { first_name: "Bob",   last_name: "Smith",   purchase_amount: "$89"  },
  { first_name: "Carol", last_name: "Chen",    purchase_amount: "$512" },
];

function validConcat(v: string): boolean {
  const s = v.toLowerCase().replace(/\s/g, "");
  return (
    s.includes("first_name") &&
    s.includes("last_name") &&
    ["+", "concat(", "||", "&", ","].some((op) => s.includes(op))
  );
}

function Challenge4({ isPassed, onPass }: { isPassed: boolean; onPass: () => void }) {
  const [formula,    setFormula]    = useState("");
  const [showMerged, setShowMerged] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  function submit() {
    if (isPassed) return;
    if (validConcat(formula)) {
      setShowMerged(true);
      setError(null);
      setTimeout(onPass, 900);
    } else {
      setError('Try: first_name + " " + last_name  or  concat(first_name, last_name)');
    }
  }

  return (
    <div>
      <p className="text-[13px] text-[#94a3b8] mb-3">
        Create a{" "}
        <code className="text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-1 rounded text-[12px]">full_name</code> column by merging{" "}
        <code className="text-[#3b82f6] bg-[#3b82f6]/10 px-1 rounded text-[12px]">first_name</code> and{" "}
        <code className="text-[#3b82f6] bg-[#3b82f6]/10 px-1 rounded text-[12px]">last_name</code>.
      </p>
      <div className="overflow-x-auto rounded-xl border border-[#1e293b] mb-4">
        <table className="w-full border-collapse min-w-max">
          <thead>
            <tr className="bg-[#1e293b]">
              {["first_name", "last_name", "purchase_amount", ...(showMerged ? ["full_name ✨"] : [])].map((h) => (
                <th key={h} scope="col" className={`px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-left ${h.includes("full") ? "text-[#3b82f6]" : "text-[#94a3b8]"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {C4_ROWS.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? "bg-[#0f172a]" : "bg-[#1e293b]/20"}>
                <td className="px-3 py-2 text-[12px] text-[#f1f5f9]">{row.first_name}</td>
                <td className="px-3 py-2 text-[12px] text-[#f1f5f9]">{row.last_name}</td>
                <td className="px-3 py-2 text-[12px] text-[#f1f5f9]">{row.purchase_amount}</td>
                {showMerged && (
                  <motion.td
                    initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: ri * 0.12 + 0.1 }}
                    className="px-3 py-2 text-[12px] text-[#93c5fd] bg-[#3b82f6]/10"
                  >
                    {`${row.first_name} ${row.last_name}`}
                  </motion.td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isPassed ? (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          className="px-3 py-2 rounded-lg bg-[#3bb4a4]/10 border border-[#3bb4a4]/30 text-[12px] text-[var(--color-success)]">
          Feature created! Your formula:{" "}
          <code className="text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-1 rounded">{formula || "accepted"}</code>. Column merging is one of the most common transformation operations in any data pipeline.
        </motion.div>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder='e.g. first_name + " " + last_name'
              className="flex-1 px-3 py-2 rounded-xl bg-[#1e293b] border border-[#334155] text-[13px] text-white placeholder-[#475569] focus:outline-none focus:border-[var(--color-accent)]/50"
            />
            <button onClick={submit} className="px-4 py-2 rounded-xl bg-[var(--color-accent)] text-[#0a0e1a] text-[13px] font-semibold hover:opacity-90 transition-opacity">
              Apply
            </button>
          </div>
          <AnimatePresence>
            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="mt-2 text-[11px] text-[#ef4444]">
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

// ── Challenge 5: Quality Check ─────────────────────────────────────────────

const TF_QS = [
  {
    id: "nulls",
    q: "This dataset has null values.",
    correct: false,
    trueExp:  "Actually no: the dataset shows 0 nulls. All missing values were handled in the Cleaning stage via imputation.",
    falseExp: "Correct! The Cleaning stage resolved all null values; the table confirms 0 nulls remain.",
  },
  {
    id: "derived",
    q: "The spend_tier column is a derived feature.",
    correct: true,
    trueExp:  "Correct! spend_tier was engineered during Transformation by binning purchase_amount into Low / Medium / High categories.",
    falseExp: "Actually, spend_tier did not exist in the raw data; it was created during the Transformation stage.",
  },
  {
    id: "mlready",
    q: "This dataset is ready for machine learning without further changes.",
    correct: true,
    trueExp:  "Correct! The data is clean, consistently typed, and has engineered features; it can go straight into a model pipeline.",
    falseExp: "Actually, this dataset is ML-ready: clean, typed, and feature-engineered. Further preprocessing would be algorithm-specific, not data preparation.",
  },
];

function Challenge5({ isPassed, onPass }: { isPassed: boolean; onPass: () => void }) {
  // answers: null = unanswered, true/false = answered
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({
    nulls: null, derived: null, mlready: null,
  });
  // correctSet: tracks which questions are answered correctly (can't re-answer those)
  const [correct, setCorrect] = useState<Set<string>>(new Set());

  function answer(id: string, val: boolean) {
    if (isPassed || correct.has(id)) return;  // locked if already correct

    const q       = TF_QS.find((q) => q.id === id)!;
    const isRight = val === q.correct;

    const nextAns = { ...answers, [id]: val };
    setAnswers(nextAns);

    if (isRight) {
      const nextCorrect = new Set(correct);
      nextCorrect.add(id);
      setCorrect(nextCorrect);
      if (TF_QS.every((q) => nextCorrect.has(q.id))) {
        setTimeout(onPass, 600);
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-[#94a3b8]">
        Answer all <strong className="text-white">3</strong> true/false questions about the final dataset.
        Wrong answers can be corrected.
      </p>
      {TF_QS.map((q) => {
        const ans       = answers[q.id];
        const isCorrect = correct.has(q.id);
        const isWrong   = ans !== null && !isCorrect;

        return (
          <div key={q.id} className={`rounded-xl border p-4 transition-colors ${
            isCorrect ? "border-[#3bb4a4]/40 bg-[#3bb4a4]/5"  :
            isWrong   ? "border-[#ef4444]/40 bg-[#ef4444]/5"  :
            "border-[#1e293b] bg-[#1e293b]/20"
          }`}>
            <p className="text-[13px] text-white font-medium mb-3">{q.q}</p>
            <div className="flex gap-2 mb-2">
              {([true, false] as const).map((val) => {
                const isChosen    = ans === val;
                const isCorrectOpt = val === q.correct;
                return (
                  <button
                    key={String(val)}
                    onClick={() => answer(q.id, val)}
                    disabled={isCorrect}   // only lock once answered correctly
                    className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold border transition-all ${
                      isCorrect && isCorrectOpt
                        ? "border-[#3bb4a4] bg-[#3bb4a4]/15 text-[var(--color-success)]"
                        : isWrong && isChosen
                        ? "border-[#ef4444] bg-[#ef4444]/15 text-[#ef4444]"
                        : "border-[#334155] text-[#94a3b8] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-40 disabled:cursor-not-allowed"
                    }`}
                  >
                    {val ? "True" : "False"}
                  </button>
                );
              })}
            </div>
            <AnimatePresence mode="wait">
              {ans !== null && (
                <motion.p
                  key={String(ans)}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`text-[11px] leading-relaxed ${isCorrect ? "text-[var(--color-success)]" : "text-[#ef4444]"}`}
                >
                  {ans ? q.trueExp : q.falseExp}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        );
      })}
      {isPassed && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          className="px-3 py-2 rounded-lg bg-[#3bb4a4]/10 border border-[#3bb4a4]/30 text-[12px] text-[var(--color-success)]">
          Quality check passed! You can now confidently hand this dataset to a data scientist or ML engineer.
        </motion.div>
      )}
    </div>
  );
}

// ── Dispatcher ─────────────────────────────────────────────────────────────

function MiniChallengeInner({ stageId, isPassed, onPass, isVisible }: Props) {
  switch (stageId) {
    case "raw-source":     return <Challenge1 isPassed={isPassed} onPass={onPass} />;
    case "collection":     return <Challenge2 isPassed={isPassed} onPass={onPass} isVisible={isVisible} />;
    case "cleaning":       return <Challenge3 isPassed={isPassed} onPass={onPass} />;
    case "transformation": return <Challenge4 isPassed={isPassed} onPass={onPass} />;
    case "analysis-ready": return <Challenge5 isPassed={isPassed} onPass={onPass} />;
  }
}

const MiniChallenge = React.memo(MiniChallengeInner);
export default MiniChallenge;
