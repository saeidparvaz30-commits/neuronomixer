"use client";

import React from "react";
import {
  DenomId,
  STORE_A,
  STORE_B,
  SPU_MIN,
  SPU_MAX,
  storeASessions,
  fmtPct,
  fmtGapPts,
} from "./types";

interface Props {
  denom: DenomId;
  onDenomChange: (d: DenomId) => void;
  spu: number;
  onSpuChange: (v: number) => void;
  visitedBoth: boolean;
}

function StoreBar({
  color,
  label,
  buyers,
  denomCount,
  unit,
}: {
  color: string;
  label: string;
  buyers: number;
  denomCount: number;
  unit: string;
}) {
  const r = denomCount === 0 ? 0 : buyers / denomCount;
  return (
    <div className="flex items-center gap-2">
      <span className="w-[62px] shrink-0 text-[11px] text-[#94a3b8]">{label}</span>
      <div className="relative h-5 flex-1 rounded bg-[#1e293b] overflow-hidden">
        <span
          className="absolute top-0 bottom-0 left-0 rounded-sm transition-all duration-300"
          style={{ background: color, width: `${r * 100}%` }}
        />
      </div>
      <span className="w-[170px] shrink-0 text-right text-[11px] font-mono text-[#f1f5f9]">
        {fmtPct(r)}{" "}
        <span className="text-[#475569]">
          ({buyers}/{denomCount} {unit})
        </span>
      </span>
    </div>
  );
}

export default function DenominatorLab({
  denom,
  onDenomChange,
  spu,
  onSpuChange,
  visitedBoth,
}: Props) {
  const aSessions = storeASessions(spu);

  const denomA = denom === "user" ? STORE_A.users : aSessions;
  const denomB = denom === "user" ? STORE_B.users : STORE_B.sessions;
  const rateA = STORE_A.buyers / denomA;
  const rateB = STORE_B.buyers / denomB;
  const unit = denom === "user" ? "users" : "sessions";

  const winner = rateA > rateB ? STORE_A : rateB > rateA ? STORE_B : null;
  const gap = Math.abs(rateA - rateB);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Comparison card */}
      <div className="lg:col-span-3 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <p className="text-[13px] font-semibold text-white">Purchase rate</p>
          <div
            role="radiogroup"
            aria-label="Rate denominator"
            className="flex items-center gap-1.5"
          >
            {(
              [
                { id: "user", label: "Per user" },
                { id: "session", label: "Per session" },
              ] as const
            ).map((d) => (
              <button
                key={d.id}
                role="radio"
                aria-checked={denom === d.id}
                onClick={() => onDenomChange(d.id)}
                className={`px-3 py-1.5 rounded-xl border text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                  denom === d.id
                    ? "border-[var(--color-accent)] text-white bg-[#1e293b]"
                    : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155]"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <StoreBar
            color={STORE_A.color}
            label={STORE_A.short}
            buyers={STORE_A.buyers}
            denomCount={denomA}
            unit={unit}
          />
          <StoreBar
            color={STORE_B.color}
            label={STORE_B.short}
            buyers={STORE_B.buyers}
            denomCount={denomB}
            unit={unit}
          />
        </div>

        <p className="text-[12px] mt-3">
          <span className="text-[#475569]">This framing says: </span>
          {winner ? (
            <>
              <span className="font-semibold text-[#f1f5f9]">{winner.short}</span>
              <span className="text-[#94a3b8]">
                {" "}
                converts better, by <span className="font-mono">{fmtGapPts(gap)}</span>
              </span>
            </>
          ) : (
            <span className="font-semibold text-[#f1f5f9]">Dead heat</span>
          )}
        </p>

        <p className="text-[11px] text-[#475569] mt-3 leading-relaxed">
          Per user asks: how likely is a person to buy this month? Per session
          asks: how likely is a single visit to end in a purchase? Both are
          honest fractions of the same table below. They answer different
          questions, so they can crown different winners.
        </p>

        {visitedBoth && (
          <div className="mt-4 rounded-xl border border-[var(--color-warning)]/40 bg-[#f97316]/5 p-3">
            <p className="text-[12px] font-semibold text-[var(--color-warning)] mb-1">
              You flipped the winner without touching the data
            </p>
            <p className="text-[11px] text-[#94a3b8] leading-relaxed">
              Nothing about the stores changed between the two headlines. Only
              the denominator did. When two dashboards disagree, check what
              each one divides by before you check who is lying.
            </p>
          </div>
        )}
      </div>

      {/* Controls + raw counts */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
          <div className="flex items-center justify-between gap-2 mb-1">
            <label
              htmlFor="store-a-spu"
              className="text-[12px] font-semibold text-white flex items-center gap-1.5"
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ background: STORE_A.color }}
                aria-hidden="true"
              />
              Store A browsing habit
            </label>
            <span className="text-[11px] font-mono text-[#f1f5f9]">{spu} sessions per user</span>
          </div>
          <p className="text-[10px] text-[#475569] mb-2 leading-relaxed">
            Store A is the app people open on the couch. More browsing means
            more sessions, while its {STORE_A.buyers} buyers still buy exactly
            once each.
          </p>
          <input
            id="store-a-spu"
            type="range"
            min={SPU_MIN}
            max={SPU_MAX}
            step={1}
            value={spu}
            onChange={(e) => onSpuChange(Number(e.target.value))}
            aria-label="Store A sessions per user"
            className="w-full"
            style={{ accentColor: STORE_A.color }}
          />
          <p className="text-[10px] text-[#475569] mt-1.5">
            {STORE_A.users} users × {spu} = {aSessions} sessions
          </p>
        </div>

        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-3">
            The whole dataset
          </p>
          <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#1e293b] text-[#94a3b8]">
                <th className="text-left px-2 py-1.5 font-semibold">Store</th>
                <th className="text-right px-2 py-1.5 font-semibold">Users</th>
                <th className="text-right px-2 py-1.5 font-semibold">Buyers</th>
                <th className="text-right px-2 py-1.5 font-semibold">Sessions</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: "#0f172a" }}>
                <td className="px-2 py-1.5 text-[#f1f5f9]">{STORE_A.short}</td>
                <td className="px-2 py-1.5 text-right font-mono text-[#94a3b8]">{STORE_A.users}</td>
                <td className="px-2 py-1.5 text-right font-mono text-[#94a3b8]">{STORE_A.buyers}</td>
                <td className="px-2 py-1.5 text-right font-mono text-[#94a3b8]">{aSessions}</td>
              </tr>
              <tr style={{ background: "#162032" }}>
                <td className="px-2 py-1.5 text-[#f1f5f9]">{STORE_B.short}</td>
                <td className="px-2 py-1.5 text-right font-mono text-[#94a3b8]">{STORE_B.users}</td>
                <td className="px-2 py-1.5 text-right font-mono text-[#94a3b8]">{STORE_B.buyers}</td>
                <td className="px-2 py-1.5 text-right font-mono text-[#94a3b8]">{STORE_B.sessions}</td>
              </tr>
            </tbody>
          </table>
          </div>
          <p className="text-[10px] text-[#475569] mt-2 leading-relaxed">
            Every buyer purchases in exactly one session, so purchase sessions
            equal buyers in both stores. Both rates on the left are computed
            from this table on every change.
          </p>
        </div>
      </div>
    </div>
  );
}
