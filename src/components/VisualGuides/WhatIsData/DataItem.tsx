"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DataItemDef, ItemState } from "./types";

// ── Per-item visual content ────────────────────────────────────────────────

function CsvVisual({ transformed }: { transformed: boolean }) {
  const cols = [
    { name: "Date", type: "datetime", color: "#93c5fd" },
    { name: "Product", type: "varchar", color: "#d4af37" },
    { name: "Revenue", type: "float", color: "#3bb4a4" },
    { name: "Units", type: "int", color: "#a855f7" },
  ];
  const rows = [
    ["2024-01-01", "Widget A", "$1,240", "31"],
    ["2024-01-02", "Widget B", "$890", "22"],
  ];
  return (
    <div className="text-[9px] leading-tight overflow-hidden w-full">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {cols.map((c) => (
              <th
                key={c.name}
                className="px-1 py-0.5 text-left font-semibold border-b border-white/10"
                style={{ color: transformed ? c.color : "#94a3b8" }}
              >
                {c.name}
                <AnimatePresence>
                  {transformed && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="ml-0.5 text-[7px] px-0.5 rounded"
                      style={{ background: c.color + "33", color: c.color }}
                    >
                      {c.type}
                    </motion.span>
                  )}
                </AnimatePresence>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white/[0.03]" : ""}>
              {row.map((cell, j) => (
                <td key={j} className="px-1 py-0.5 text-[#94a3b8]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SqlVisual() {
  const cols = [
    { name: "id", type: "INT" },
    { name: "name", type: "VARCHAR" },
    { name: "email", type: "VARCHAR" },
    { name: "created_at", type: "TIMESTAMP" },
  ];
  return (
    <div className="text-[9px] leading-tight font-mono w-full">
      {cols.map((c) => (
        <div key={c.name} className="flex items-center gap-1 py-[1px] border-b border-white/5">
          <span className="text-[#3bb4a4] w-16 truncate">{c.name}</span>
          <span className="text-[var(--color-accent)]">{c.type}</span>
        </div>
      ))}
    </div>
  );
}

function ExcelVisual() {
  const cells = [
    ["", "A", "B", "C"],
    ["1", "Sales", "Units", "Revenue"],
    ["2", "Widget", "31", "$1,240"],
    ["3", "Gadget", "22", "$890"],
  ];
  return (
    <div className="text-[8px] leading-tight w-full overflow-hidden">
      <table className="w-full border-collapse">
        <tbody>
          {cells.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`px-0.5 py-[1px] border border-white/10 text-center ${
                    i === 0 || j === 0
                      ? "bg-white/[0.06] text-[#94a3b8] font-semibold"
                      : i === 1
                      ? "bg-[#1e5d8a]/20 text-[#93c5fd]"
                      : "text-[#94a3b8]"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JsonVisual({ transformed }: { transformed: boolean }) {
  if (transformed) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-[8px] leading-relaxed font-mono w-full"
      >
        <div className="text-white/40">{"{"}</div>
        <div className="pl-2">
          <span className="text-[var(--color-accent)]">&quot;user&quot;</span>
          <span className="text-white/40">: {"{"}</span>
        </div>
        <div className="pl-4">
          <span className="text-[var(--color-accent)]">&quot;name&quot;</span>
          <span className="text-white/40">: </span>
          <span className="text-[#3bb4a4]">&quot;Alex&quot;</span>
        </div>
        <div className="pl-4">
          <span className="text-[var(--color-accent)]">&quot;age&quot;</span>
          <span className="text-white/40">: </span>
          <span className="text-[#a855f7]">28</span>
        </div>
        <div className="pl-4">
          <span className="text-[var(--color-accent)]">&quot;tags&quot;</span>
          <span className="text-white/40">: [...]</span>
        </div>
        <div className="pl-2 text-white/40">{"}"}</div>
        <div className="text-white/40">{"}"}</div>
      </motion.div>
    );
  }
  return (
    <div className="text-[8px] leading-relaxed font-mono w-full">
      <div className="text-white/40">{"{"}</div>
      <div className="pl-2">
        <span className="text-[var(--color-accent)]">&quot;user&quot;</span>
        <span className="text-white/40">: {"{"}</span>
        <span className="text-[var(--color-accent)]">&quot;name&quot;</span>
        <span className="text-white/40">: </span>
        <span className="text-[#3bb4a4]">&quot;Alex&quot;</span>
        <span className="text-white/40">, </span>
        <span className="text-[var(--color-accent)]">&quot;age&quot;</span>
        <span className="text-white/40">: </span>
        <span className="text-[#a855f7]">28</span>
        <span className="text-white/40">, </span>
        <span className="text-[var(--color-accent)]">&quot;tags&quot;</span>
        <span className="text-white/40">: [...]{"}"}</span>
      </div>
      <div className="text-white/40">{"}"}</div>
    </div>
  );
}

function XmlVisual() {
  return (
    <div className="text-[8px] leading-relaxed font-mono w-full">
      <div>
        <span className="text-[#93c5fd]">{"<config>"}</span>
      </div>
      <div className="pl-2">
        <span className="text-[#93c5fd]">{"<server"}</span>
        <span className="text-[var(--color-accent)]"> host</span>
        <span className="text-white/40">{"=\"..."}</span>
        <span className="text-[#93c5fd]">{">"}</span>
      </div>
      <div className="pl-4">
        <span className="text-[#93c5fd]">{"<port>"}</span>
        <span className="text-[#3bb4a4]">8080</span>
        <span className="text-[#93c5fd]">{"</port>"}</span>
      </div>
      <div className="pl-2">
        <span className="text-[#93c5fd]">{"</server>"}</span>
      </div>
      <div>
        <span className="text-[#93c5fd]">{"</config>"}</span>
      </div>
    </div>
  );
}

function EmailVisual() {
  return (
    <div className="text-[9px] leading-tight w-full">
      {[
        { k: "From", v: "alex@corp.com" },
        { k: "To", v: "team@corp.com" },
        { k: "Subject", v: "Q1 Review" },
        { k: "Date", v: "Jan 15, 2024" },
      ].map(({ k, v }) => (
        <div key={k} className="flex gap-1 border-b border-white/5 py-[1px]">
          <span className="text-[var(--color-accent)] w-12 flex-shrink-0">{k}:</span>
          <span className="text-[#94a3b8] truncate">{v}</span>
        </div>
      ))}
      <div className="mt-1 text-[8px] text-white/20 italic leading-tight line-clamp-2">
        Hi team, please review the attached report and share your feedback…
      </div>
    </div>
  );
}

function SocialVisual({ transformed }: { transformed: boolean }) {
  return (
    <div className="relative w-full">
      {transformed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 2 }}
        >
          <span
            className="text-[10px] font-black uppercase tracking-widest text-[#ef4444]/40 rotate-[-20deg] select-none"
          >
            NO SCHEMA
          </span>
        </motion.div>
      )}
      <div className="flex items-start gap-1.5">
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#93c5fd] to-[#a855f7] flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-semibold text-white">@user</div>
          <div className="text-[8px] text-[#94a3b8] leading-tight mt-0.5 line-clamp-2">
            Just finished a great book on ML! Highly recommend checking it out 📚
          </div>
          <div className="mt-1 rounded bg-white/5 h-6 flex items-center justify-center">
            <span className="text-[7px] text-white/20">image</span>
          </div>
        </div>
      </div>
      {transformed && (
        <motion.div
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-1 flex gap-1.5 text-[7px]"
        >
          <span className="text-[#ef4444]/70 border border-[#ef4444]/30 rounded px-1 py-0.5">text blob</span>
          <span className="text-[#ef4444]/70 border border-[#ef4444]/30 rounded px-1 py-0.5">binary data</span>
        </motion.div>
      )}
    </div>
  );
}

function AudioVisual() {
  const bars = [6, 12, 18, 8, 22, 14, 26, 10, 18, 6, 20, 14, 8, 24, 12, 6, 18, 22, 10, 16];
  return (
    <div className="w-full">
      <div className="flex items-end gap-[2px] h-8 mb-1">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{
              height: `${h}px`,
              background: `hsl(${170 + i * 4}, 60%, ${40 + (i % 3) * 8}%)`,
            }}
          />
        ))}
      </div>
      <div className="text-[8px] text-[#94a3b8] font-mono truncate">
        interview_recording.mp3
      </div>
    </div>
  );
}

function PhotoVisual() {
  return (
    <div className="relative w-full h-16 rounded-lg overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #2d1b4e 50%, #1a3a2a 100%)",
        }}
      />
      {/* abstract shapes */}
      <div className="absolute top-2 left-3 w-8 h-8 rounded-full bg-white/5" />
      <div className="absolute bottom-1 right-2 w-12 h-5 rounded bg-white/5" />
      <div className="absolute bottom-1 left-1 text-[7px] text-white/20 font-mono leading-tight">
        <div>f/1.8 1/120s</div>
        <div>ISO 400</div>
      </div>
    </div>
  );
}

// ── Visual dispatcher ──────────────────────────────────────────────────────

function ItemVisual({ id, transformed }: { id: string; transformed: boolean }) {
  switch (id) {
    case "csv":     return <CsvVisual transformed={transformed} />;
    case "sql":     return <SqlVisual />;
    case "excel":   return <ExcelVisual />;
    case "json":    return <JsonVisual transformed={transformed} />;
    case "xml":     return <XmlVisual />;
    case "email":   return <EmailVisual />;
    case "social":  return <SocialVisual transformed={transformed} />;
    case "audio":   return <AudioVisual />;
    case "photo":   return <PhotoVisual />;
    default:        return null;
  }
}

// ── Tooltip ────────────────────────────────────────────────────────────────

function Tooltip({ item }: { item: DataItemDef }) {
  return (
    <div
      className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-[260px]
                 bg-[#0a0e1a] border border-[#1e293b] rounded-xl
                 shadow-[0_8px_32px_rgba(0,0,0,0.6)]
                 p-3 z-[200] pointer-events-none"
    >
      <div className="text-[12px] font-semibold text-white mb-0.5">{item.label}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent)] mb-2">
        {item.tooltip.type}
      </div>
      <ul className="space-y-0.5 mb-2">
        {item.tooltip.examples.map((ex) => (
          <li key={ex} className="text-[11px] text-[#94a3b8] flex gap-1">
            <span className="text-[var(--color-accent)] flex-shrink-0">·</span>
            {ex}
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-[#475569] leading-snug">{item.tooltip.keyTrait}</p>
      {/* arrow */}
      <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-[#0a0e1a] border-r border-b border-[#1e293b]" />
    </div>
  );
}

// ── DataItem ───────────────────────────────────────────────────────────────

type DataItemProps = {
  item: DataItemDef;
  state: ItemState;
  isDragging: boolean;
  isSelected: boolean;
  isError: boolean;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
  onKeyAction: (id: string) => void;
};

function DataItemInner({
  item,
  state,
  isDragging,
  isSelected,
  isError,
  onPointerDown,
  onKeyAction,
}: DataItemProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const sorted = state.bucket !== "source";
  const correct = state.isCorrect === true;

  return (
    <div className="relative" style={{ width: 200, minHeight: 140 }}>
      <motion.div
        animate={
          isError
            ? { x: [0, -8, 8, -4, 4, 0] }
            : { x: 0 }
        }
        transition={{ duration: 0.4 }}
        whileHover={!isDragging && !sorted ? { scale: 1.03 } : undefined}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onPointerDown={(e) => {
          if (!sorted) onPointerDown(e, item.id);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onKeyAction(item.id);
          }
        }}
        role="button"
        tabIndex={sorted ? -1 : 0}
        aria-label={`${item.label}: ${item.tooltip.type}`}
        aria-grabbed={isSelected}
        className={`
          flex flex-col gap-1.5 p-3 rounded-xl border transition-colors select-none
          ${sorted
            ? correct
              ? "border-[#3bb4a4]/40 bg-[#3bb4a4]/5 cursor-default"
              : "border-[#ef4444]/40 bg-[#ef4444]/5 cursor-default"
            : "touch-none border-[#1e293b] bg-[#1e293b]/60 hover:border-[#334155]"
          }
          ${isDragging ? "cursor-grabbing opacity-90" : !sorted ? "cursor-grab" : ""}
          ${isSelected ? "ring-2 ring-[var(--color-accent)]" : ""}
        `}
        style={{ width: 200, minHeight: 140 }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-white truncate">{item.label}</span>
          {correct && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-4 h-4 rounded-full bg-[#3bb4a4] flex items-center justify-center flex-shrink-0"
            >
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </motion.span>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          <ItemVisual id={item.id} transformed={correct} />
        </div>
      </motion.div>

      {/* Tooltip — only show when hovering and not actively dragging */}
      {showTooltip && !isDragging && (
        <Tooltip item={item} />
      )}
    </div>
  );
}

const DataItem = React.memo(DataItemInner);
export default DataItem;
