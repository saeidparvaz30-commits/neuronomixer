"use client";

import React from "react";
import {
  EvaluatedModel,
  FAILURE_LABEL,
  LATENCY_LABEL,
  PINK,
  contextLabel,
  formatUsd,
} from "./types";

export type EditableField = "capability" | "priceIn" | "priceOut";

type Props = {
  rows: EvaluatedModel[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (id: string, field: EditableField, value: number) => void;
  onResetDefaults: () => void;
  edited: boolean;
};

function NumberCell({
  value,
  ariaLabel,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  ariaLabel: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      aria-label={ariaLabel}
      onChange={(e) => {
        const v = Number(e.target.value);
        onChange(Number.isFinite(v) ? Math.min(Math.max(v, min), max) : min);
      }}
      className="w-[72px] bg-[#1e293b] border border-[#334155] rounded-md px-2 py-1 text-[12px] font-mono text-[#f1f5f9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
    />
  );
}

export default function ModelTable({
  rows,
  selectedId,
  onSelect,
  onEdit,
  onResetDefaults,
  edited,
}: Props) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-[11px] text-[#475569]">
          Capability index and prices are editable assumptions (defaults as of July
          2026). Edit a value and the chart, frontier, and statuses recompute.
        </p>
        <button
          onClick={onResetDefaults}
          disabled={!edited}
          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-[#1e293b] text-[#94a3b8] hover:border-[#d4af37] hover:text-[#d4af37] transition-colors disabled:opacity-40 disabled:hover:border-[#1e293b] disabled:hover:text-[#94a3b8]"
        >
          Reset defaults
        </button>
      </div>

      <div className="rounded-xl border border-[#1e293b] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#1e293b] text-left">
                {[
                  "model",
                  "hosting",
                  "latency",
                  "context",
                  "capability",
                  "$ in / Mtok",
                  "$ out / Mtok",
                  "blended",
                  "status",
                  "",
                ].map((h, i) => (
                  <th
                    key={i}
                    className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const isSelected = r.model.id === selectedId;
                return (
                  <tr
                    key={r.model.id}
                    className="transition-opacity duration-300"
                    style={{
                      background: i % 2 === 0 ? "#0f172a" : "#162032",
                      opacity: r.pass ? 1 : 0.55,
                    }}
                  >
                    <td className="px-3 py-2 text-[#f1f5f9] font-semibold whitespace-nowrap">
                      {r.model.name}
                    </td>
                    <td className="px-3 py-2 text-[#94a3b8] whitespace-nowrap">
                      {r.model.openWeights ? "Open weights" : "Hosted API"}
                    </td>
                    <td className="px-3 py-2 text-[#94a3b8]">
                      {LATENCY_LABEL[r.model.latency]}
                    </td>
                    <td className="px-3 py-2 font-mono text-[#94a3b8]">
                      {contextLabel(r.model.contextK)}
                    </td>
                    <td className="px-3 py-2">
                      <NumberCell
                        value={r.model.capability}
                        ariaLabel={`${r.model.name} capability index`}
                        min={0}
                        max={100}
                        step={1}
                        onChange={(v) => onEdit(r.model.id, "capability", v)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <NumberCell
                        value={r.model.priceIn}
                        ariaLabel={`${r.model.name} price per million input tokens in dollars`}
                        min={0.01}
                        max={1000}
                        step={0.05}
                        onChange={(v) => onEdit(r.model.id, "priceIn", v)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <NumberCell
                        value={r.model.priceOut}
                        ariaLabel={`${r.model.name} price per million output tokens in dollars`}
                        min={0.01}
                        max={1000}
                        step={0.05}
                        onChange={(v) => onEdit(r.model.id, "priceOut", v)}
                      />
                    </td>
                    <td className="px-3 py-2 font-mono text-[#f1f5f9]">
                      {formatUsd(r.blended)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.onFrontier ? (
                        <span className="text-[11px] font-semibold" style={{ color: PINK }}>
                          &#9679; frontier
                        </span>
                      ) : r.pass ? (
                        <span className="text-[11px] font-semibold text-[#3bb4a4]">
                          passes, dominated
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#475569]">
                          &times; {r.failures.map((f) => FAILURE_LABEL[f]).join(", ")}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => onSelect(r.model.id)}
                        aria-pressed={isSelected}
                        aria-label={`Select ${r.model.name}`}
                        className={`px-3 py-1 rounded-lg text-[11px] font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                          isSelected
                            ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                            : "border-[#334155] text-[#94a3b8] hover:border-[#d4af37] hover:text-[#d4af37]"
                        }`}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
