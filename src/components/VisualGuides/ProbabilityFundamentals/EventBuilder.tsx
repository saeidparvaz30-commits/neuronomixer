"use client";

import React from "react";
import {
  type EventType,
  type Operator,
  type CompoundEvent,
  outcomesFor,
  labelFor,
  calcTheoretical,
} from "./types";

// ── Preset definitions ────────────────────────────────────────────────────────

interface Preset {
  label: string;
  firstType: EventType;
  firstOutcome: string;
  operator: Operator;
  secondType: EventType | null;
  secondOutcome: string | null;
}

const PRESETS: Preset[] = [
  {
    label: "Flip Heads AND Roll a 6",
    firstType: "coin_flip",
    firstOutcome: "Heads",
    operator: "AND",
    secondType: "die_roll",
    secondOutcome: "6",
  },
  {
    label: "Draw a Heart",
    firstType: "card_draw",
    firstOutcome: "Heart",
    operator: "none",
    secondType: null,
    secondOutcome: null,
  },
  {
    label: "NOT Flip Tails",
    firstType: "coin_flip",
    firstOutcome: "Tails",
    operator: "NOT",
    secondType: null,
    secondOutcome: null,
  },
  {
    label: "Roll a 1 OR 2",
    firstType: "die_roll",
    firstOutcome: "1",
    operator: "OR",
    secondType: "die_roll",
    secondOutcome: "2",
  },
];

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "coin_flip", label: "Coin Flip" },
  { value: "die_roll", label: "Die Roll" },
  { value: "card_draw", label: "Card Draw" },
];

const OPERATORS: { value: Operator; label: string }[] = [
  { value: "none", label: "None (single event)" },
  { value: "AND", label: "AND" },
  { value: "OR", label: "OR" },
  { value: "NOT", label: "NOT" },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface EventBuilderProps {
  event: CompoundEvent;
  onChange: (updated: CompoundEvent) => void;
  onReset: () => void;
}

export default function EventBuilder({ event, onChange, onReset }: EventBuilderProps) {
  function patch(partial: Partial<CompoundEvent>) {
    const merged = { ...event, ...partial };
    merged.theoretical = calcTheoretical(
      merged.firstType,
      merged.firstOutcome,
      merged.operator,
      merged.secondType,
      merged.secondOutcome,
    );
    onChange(merged);
  }

  function handleFirstType(type: EventType) {
    const firstOutcome = outcomesFor(type)[0] as string;
    patch({ firstType: type, firstOutcome });
  }

  function handleOperator(op: Operator) {
    if (op === "NOT" || op === "none") {
      patch({ operator: op, secondType: null, secondOutcome: null });
    } else {
      const secondType = event.secondType ?? "coin_flip";
      const secondOutcome = outcomesFor(secondType)[0] as string;
      patch({ operator: op, secondType, secondOutcome });
    }
  }

  function handleSecondType(type: EventType) {
    const secondOutcome = outcomesFor(type)[0] as string;
    patch({ secondType: type, secondOutcome });
  }

  function applyPreset(p: Preset) {
    const updated: CompoundEvent = {
      firstType: p.firstType,
      firstOutcome: p.firstOutcome,
      operator: p.operator,
      secondType: p.secondType,
      secondOutcome: p.secondOutcome,
      theoretical: calcTheoretical(
        p.firstType,
        p.firstOutcome,
        p.operator,
        p.secondType,
        p.secondOutcome,
      ),
    };
    onChange(updated);
  }

  const showSecond = event.operator === "AND" || event.operator === "OR";

  return (
    <div className="space-y-5">
      {/* Preset buttons */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[#94a3b8] mb-2">
          Quick Presets
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="px-3 py-1.5 text-[12px] rounded-lg border border-[#1e293b] text-[#94a3b8] hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Event 1 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-1.5">
            Event Type
          </label>
          <select
            value={event.firstType}
            onChange={(e) => handleFirstType(e.target.value as EventType)}
            className="w-full bg-[#0f172a] border border-[#1e293b] text-white text-[13px] rounded-xl px-3 py-2 focus:outline-none focus:border-[#d4af37] transition-colors"
          >
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-1.5">
            Outcome
          </label>
          <select
            value={event.firstOutcome}
            onChange={(e) => patch({ firstOutcome: e.target.value })}
            className="w-full bg-[#0f172a] border border-[#1e293b] text-white text-[13px] rounded-xl px-3 py-2 focus:outline-none focus:border-[#d4af37] transition-colors"
          >
            {outcomesFor(event.firstType).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Operator */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-1.5">
          Operator
        </label>
        <select
          value={event.operator}
          onChange={(e) => handleOperator(e.target.value as Operator)}
          className="w-full bg-[#0f172a] border border-[#1e293b] text-white text-[13px] rounded-xl px-3 py-2 focus:outline-none focus:border-[#d4af37] transition-colors"
        >
          {OPERATORS.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>
      </div>

      {/* Event 2 — shown only for AND / OR */}
      {showSecond && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-1.5">
              Second Event Type
            </label>
            <select
              value={event.secondType ?? "coin_flip"}
              onChange={(e) => handleSecondType(e.target.value as EventType)}
              className="w-full bg-[#0f172a] border border-[#1e293b] text-white text-[13px] rounded-xl px-3 py-2 focus:outline-none focus:border-[#d4af37] transition-colors"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-1.5">
              Second Outcome
            </label>
            <select
              value={event.secondOutcome ?? ""}
              onChange={(e) => patch({ secondOutcome: e.target.value })}
              className="w-full bg-[#0f172a] border border-[#1e293b] text-white text-[13px] rounded-xl px-3 py-2 focus:outline-none focus:border-[#d4af37] transition-colors"
            >
              {outcomesFor(event.secondType ?? "coin_flip").map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Event summary chip */}
      <div className="rounded-xl border border-[#1e293b] bg-[#1e293b]/40 px-4 py-2.5 text-[13px] text-white font-mono">
        {buildEventLabel(event)}
      </div>

      {/* Same-draw note: both events share one sample space */}
      {showSecond && event.secondType === event.firstType && (
        <p className="text-[11px] text-[#94a3b8] leading-relaxed">
          Both events use the same {labelFor(event.firstType).toLowerCase()}, so ONE draw
          decides both, like overlapping regions in a Venn diagram. Pick a different second
          event type if you want two independent experiments.
        </p>
      )}

      {/* Reset */}
      <button
        onClick={onReset}
        className="px-4 py-1.5 text-[12px] rounded-xl border border-[#1e293b] text-[#94a3b8] hover:border-[#94a3b8] hover:text-white transition-colors"
      >
        Reset
      </button>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

export function buildEventLabel(event: CompoundEvent): string {
  const a = `${labelFor(event.firstType)}: ${event.firstOutcome}`;
  if (event.operator === "none") return `P(${a})`;
  if (event.operator === "NOT") return `P(NOT ${a})`;
  const b =
    event.secondType && event.secondOutcome
      ? `${labelFor(event.secondType)}: ${event.secondOutcome}`
      : "...";
  return `P(${a} ${event.operator} ${b})`;
}
