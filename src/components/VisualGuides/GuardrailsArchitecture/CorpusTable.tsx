"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ItemResult,
  Outcome,
  LayerId,
  LAYER_IDS,
  LAYER_META,
} from "./corpus";

type Props = {
  results: ItemResult[];
  expandedId: string | null;
  onExpand: (id: string) => void;
};

const OUTCOME_META: Record<Outcome, { label: string; color: string; short: string }> = {
  tp: { label: "Attack blocked", color: "var(--color-success)", short: "caught" },
  fn: { label: "Attack allowed", color: "#ef4444", short: "missed" },
  fp: { label: "Benign blocked", color: "var(--color-warning)", short: "false positive" },
  tn: { label: "Benign allowed", color: "#94a3b8", short: "correct" },
};

function LayerChip({ id, blocked, active }: { id: LayerId; blocked: boolean; active: boolean }) {
  const short = LAYER_META[id].label
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span
      title={`${LAYER_META[id].label}: ${!active ? "off" : blocked ? "blocked" : "allowed"}`}
      className="inline-flex items-center justify-center w-6 h-6 rounded text-[9px] font-mono font-bold"
      style={{
        background: blocked ? "rgba(236,72,153,0.18)" : "#0f172a",
        color: !active ? "#334155" : blocked ? "#ec4899" : "#475569",
        border: `1px solid ${blocked ? "#ec4899" : "#1e293b"}`,
      }}
      aria-hidden="true"
    >
      {short}
    </span>
  );
}

export default function CorpusTable({ results, expandedId, onExpand }: Props) {
  return (
    <div className="rounded-xl border border-[#1e293b] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-[#1e293b] text-left">
              <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                #
              </th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                Request string
              </th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                Kind
              </th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                Layers
              </th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                Verdict
              </th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => {
              const om = OUTCOME_META[r.outcome];
              const open = expandedId === r.item.id;
              return (
                <React.Fragment key={r.item.id}>
                  <tr
                    style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}
                    className="cursor-pointer hover:bg-[#1e293b]/50 focus-within:bg-[#1e293b]/50"
                  >
                    <td className="px-3 py-2 font-mono text-[#475569]">{r.item.id}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => onExpand(r.item.id)}
                        aria-expanded={open}
                        aria-controls={`detail-${r.item.id}`}
                        className="text-left text-[#f1f5f9] hover:text-white focus:outline-none focus-visible:underline"
                      >
                        {r.item.text}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wide"
                        style={{ color: r.item.isAttack ? "#ef4444" : "#3bb4a4" }}
                      >
                        {r.item.isAttack ? "attack" : "benign"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        {LAYER_IDS.map((id) => (
                          <LayerChip
                            key={id}
                            id={id}
                            active={r.layers[id].active}
                            blocked={r.layers[id].blocked}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="text-[10px] font-semibold"
                        style={{ color: om.color }}
                      >
                        {om.short}
                      </span>
                    </td>
                  </tr>
                  <AnimatePresence initial={false}>
                    {open && (
                      <tr style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}>
                        <td colSpan={5} className="px-3 pb-3 pt-0">
                          <motion.div
                            id={`detail-${r.item.id}`}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="rounded-lg border border-[#1e293b] bg-[#0f172a] p-3 mt-1">
                              <p className="text-[11px] text-[#94a3b8] leading-relaxed mb-3">
                                {r.item.note}
                              </p>

                              <p className="text-[10px] uppercase tracking-wide text-[#475569] mb-1">
                                Authored model response the output filter scans
                              </p>
                              <pre className="bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[10px] leading-relaxed rounded-lg p-2.5 overflow-x-auto mb-3 whitespace-pre-wrap">
                                {r.item.response}
                              </pre>

                              <p className="text-[10px] uppercase tracking-wide text-[#475569] mb-1.5">
                                Per-layer decision
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {LAYER_IDS.map((id) => {
                                  const lr = r.layers[id];
                                  const state = !lr.active
                                    ? "off"
                                    : lr.blocked
                                      ? "blocks"
                                      : "allows";
                                  const color = !lr.active
                                    ? "#475569"
                                    : lr.blocked
                                      ? "#ec4899"
                                      : "#3bb4a4";
                                  return (
                                    <div
                                      key={id}
                                      className="flex items-start justify-between gap-2 rounded-md border border-[#1e293b] px-2.5 py-1.5"
                                    >
                                      <div className="min-w-0">
                                        <p className="text-[11px] text-white">
                                          {LAYER_META[id].label}
                                        </p>
                                        <p className="text-[10px] text-[#475569]">
                                          {lr.matches.length > 0
                                            ? `matched: ${lr.matches.join(", ")}`
                                            : lr.detail}
                                        </p>
                                      </div>
                                      <span
                                        className="text-[10px] font-semibold uppercase shrink-0"
                                        style={{ color }}
                                      >
                                        {state}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>

                              <p
                                className="text-[11px] font-semibold mt-3"
                                style={{ color: om.color }}
                              >
                                Final verdict: {r.blocked ? "blocked" : "allowed"} ({om.label})
                              </p>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
