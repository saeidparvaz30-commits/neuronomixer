"use client";

import React from "react";
import {
  ClinicId,
  ClinicOutcomes,
  GroupOutcome,
  ViewId,
  ParadoxState,
  CLINICS,
  CLINIC_META,
  CLINIC_TOTAL,
  SHARE_MIN,
  SHARE_MAX,
  pooledOutcome,
  rateOf,
  fmtPct,
  fmtGapPts,
  tieSevereSharePct,
  tieSevereSharePctRaw,
} from "./types";

interface Props {
  north: ClinicOutcomes;
  river: ClinicOutcomes;
  northShare: number;
  riverShare: number;
  onShareChange: (id: ClinicId, share: number) => void;
  view: ViewId;
  onViewChange: (v: ViewId) => void;
  paradox: ParadoxState;
  reversalFound: boolean;
}

const MILD_COLOR = "#60a5fa";

function RateBar({
  color,
  label,
  outcome,
}: {
  color: string;
  label: string;
  outcome: GroupOutcome;
}) {
  const r = rateOf(outcome);
  return (
    <div className="flex items-center gap-2">
      <span className="w-[72px] shrink-0 text-[11px] text-[#94a3b8]">{label}</span>
      <div className="relative h-5 flex-1 rounded bg-[#1e293b] overflow-hidden">
        <span
          className="absolute top-0 bottom-0 left-0 rounded-sm transition-all duration-300"
          style={{ background: color, width: `${r * 100}%` }}
        />
      </div>
      <span className="w-[140px] shrink-0 text-right text-[11px] font-mono text-[#f1f5f9]">
        {fmtPct(r)}{" "}
        <span className="text-[#475569]">
          ({outcome.recovered}/{outcome.treated})
        </span>
      </span>
    </div>
  );
}

function winnerLabel(w: "north" | "river" | "tie"): string {
  if (w === "tie") return "Dead heat";
  return CLINIC_META[w].label;
}

export default function ClinicParadoxLab({
  north,
  river,
  northShare,
  riverShare,
  onShareChange,
  view,
  onViewChange,
  paradox,
  reversalFound,
}: Props) {
  const northPooled = pooledOutcome(north);
  const riverPooled = pooledOutcome(river);
  const pooledGap = Math.abs(rateOf(northPooled) - rateOf(riverPooled));
  const mildGap = Math.abs(rateOf(north.mild) - rateOf(river.mild));
  const severeGap = Math.abs(rateOf(north.severe) - rateOf(river.severe));

  const tieRaw = tieSevereSharePctRaw("north", rateOf(riverPooled));
  const tieReachable = tieRaw <= SHARE_MAX;
  const tiePct = Math.round(tieSevereSharePct("north", rateOf(riverPooled)));

  const rows: { clinic: ClinicId; severity: "mild" | "severe"; o: GroupOutcome }[] = [
    { clinic: "north", severity: "mild", o: north.mild },
    { clinic: "north", severity: "severe", o: north.severe },
    { clinic: "river", severity: "mild", o: river.mild },
    { clinic: "river", severity: "severe", o: river.severe },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Comparison card */}
      <div className="lg:col-span-3 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <p className="text-[13px] font-semibold text-white">
            Recovery rate, {CLINIC_TOTAL} patients per clinic
          </p>
          <div
            role="radiogroup"
            aria-label="Aggregation level"
            className="flex items-center gap-1.5"
          >
            {(
              [
                { id: "pooled", label: "Pooled" },
                { id: "grouped", label: "By severity" },
              ] as const
            ).map((v) => (
              <button
                key={v.id}
                role="radio"
                aria-checked={view === v.id}
                onClick={() => onViewChange(v.id)}
                className={`px-3 py-1.5 rounded-xl border text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                  view === v.id
                    ? "border-[var(--color-accent)] text-white bg-[#1e293b]"
                    : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155]"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {view === "pooled" ? (
          <div className="flex flex-col gap-2.5">
            <RateBar color={CLINIC_META.north.color} label="Northside" outcome={northPooled} />
            <RateBar color={CLINIC_META.river.color} label="Riverside" outcome={riverPooled} />
            <p className="text-[12px] mt-2">
              <span className="text-[#475569]">Pooled verdict: </span>
              <span className="font-semibold text-[#f1f5f9]">
                {winnerLabel(paradox.pooledWinner)}
              </span>
              {paradox.pooledWinner !== "tie" && (
                <span className="text-[#94a3b8]">
                  {" "}
                  leads by <span className="font-mono">{fmtGapPts(pooledGap)}</span>
                </span>
              )}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8] mb-2">
                Mild cases
              </p>
              <div className="flex flex-col gap-2.5">
                <RateBar color={CLINIC_META.north.color} label="Northside" outcome={north.mild} />
                <RateBar color={CLINIC_META.river.color} label="Riverside" outcome={river.mild} />
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8] mb-2">
                Severe cases
              </p>
              <div className="flex flex-col gap-2.5">
                <RateBar color={CLINIC_META.north.color} label="Northside" outcome={north.severe} />
                <RateBar color={CLINIC_META.river.color} label="Riverside" outcome={river.severe} />
              </div>
            </div>
            <p className="text-[12px]">
              <span className="text-[#475569]">Group verdict: </span>
              <span className="font-semibold text-[#f1f5f9]">
                {winnerLabel(paradox.mildWinner)}
              </span>
              {paradox.mildWinner !== "tie" && (
                <span className="text-[#94a3b8]">
                  {" "}
                  leads mild by <span className="font-mono">{fmtGapPts(mildGap)}</span>
                </span>
              )}
              {paradox.severeWinner !== "tie" && (
                <span className="text-[#94a3b8]">
                  {" "}
                  and {winnerLabel(paradox.severeWinner)} leads severe by{" "}
                  <span className="font-mono">{fmtGapPts(severeGap)}</span>
                </span>
              )}
            </p>
          </div>
        )}

        {paradox.active && (
          <div className="mt-4 rounded-xl border border-[var(--color-warning)]/40 bg-[#f97316]/5 p-3">
            <p className="text-[12px] font-semibold text-[var(--color-warning)] mb-1">
              Reversal live
            </p>
            <p className="text-[11px] text-[#94a3b8] leading-relaxed">
              {winnerLabel(paradox.mildWinner)} wins the mild group and the
              severe group, yet {winnerLabel(paradox.pooledWinner)} wins the
              pooled table. Same patients, opposite headline. Toggle the two
              views above to see both verdicts on the exact data below.
            </p>
          </div>
        )}

        {/* Raw counts */}
        <table className="w-full border-collapse text-[11px] mt-4">
          <thead>
            <tr className="bg-[#1e293b] text-[#94a3b8]">
              <th className="text-left px-2 py-1.5 font-semibold">Clinic</th>
              <th className="text-left px-2 py-1.5 font-semibold">Severity</th>
              <th className="text-right px-2 py-1.5 font-semibold">Treated</th>
              <th className="text-right px-2 py-1.5 font-semibold">Recovered</th>
              <th className="text-right px-2 py-1.5 font-semibold">Rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={`${r.clinic}-${r.severity}`}
                style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}
              >
                <td className="px-2 py-1.5 text-[#f1f5f9]">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ background: CLINIC_META[r.clinic].color }}
                      aria-hidden="true"
                    />
                    {CLINIC_META[r.clinic].label}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-[#94a3b8] capitalize">{r.severity}</td>
                <td className="px-2 py-1.5 text-right font-mono text-[#94a3b8]">{r.o.treated}</td>
                <td className="px-2 py-1.5 text-right font-mono text-[#94a3b8]">{r.o.recovered}</td>
                <td className="px-2 py-1.5 text-right font-mono text-[#f1f5f9]">
                  {fmtPct(rateOf(r.o))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[10px] text-[#475569] mt-2 leading-relaxed">
          Every rate above is recovered divided by treated from this table, and
          the table is rebuilt from the sliders on every move.
        </p>
      </div>

      {/* Controls */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        {CLINICS.map((c) => {
          const share = c.id === "north" ? northShare : riverShare;
          const o = c.id === "north" ? north : river;
          return (
            <div key={c.id} className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <div className="flex items-center justify-between gap-2 mb-1">
                <label
                  htmlFor={`severe-share-${c.id}`}
                  className="text-[12px] font-semibold text-white flex items-center gap-1.5"
                >
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ background: c.color }}
                    aria-hidden="true"
                  />
                  {c.label} case mix
                </label>
                <span className="text-[11px] font-mono text-[#f1f5f9]">{share}% severe</span>
              </div>
              <p className="text-[10px] text-[#475569] mb-2 leading-relaxed">{c.note}</p>
              <input
                id={`severe-share-${c.id}`}
                type="range"
                min={SHARE_MIN}
                max={SHARE_MAX}
                step={1}
                value={share}
                onChange={(e) => onShareChange(c.id, Number(e.target.value))}
                aria-label={`${c.label} share of severe cases, percent`}
                className="w-full"
                style={{ accentColor: c.color }}
              />
              <div
                className="mt-2 h-3 w-full rounded overflow-hidden flex"
                role="img"
                aria-label={`${c.label} treats ${o.mild.treated} mild and ${o.severe.treated} severe patients.`}
              >
                <span
                  className="h-full transition-all duration-300"
                  style={{ background: MILD_COLOR, width: `${(o.mild.treated / CLINIC_TOTAL) * 100}%` }}
                />
                <span
                  className="h-full transition-all duration-300"
                  style={{
                    background: "var(--color-warning)",
                    width: `${(o.severe.treated / CLINIC_TOTAL) * 100}%`,
                  }}
                />
              </div>
              <p className="text-[10px] text-[#475569] mt-1.5">
                {o.mild.treated} mild · {o.severe.treated} severe · fixed skill: mild{" "}
                {fmtPct(c.mildRate, 0)}, severe {fmtPct(c.severeRate, 0)}
              </p>
            </div>
          );
        })}

        <div
          className={`rounded-2xl border p-5 transition-colors ${
            reversalFound
              ? "border-[var(--color-success)]/40 bg-[#22c55e]/5"
              : "border-[#1e293b] bg-[#0f172a]"
          }`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-2">
            Hunt the reversal point
          </p>
          {reversalFound ? (
            <p className="text-[11px] text-[#94a3b8] leading-relaxed">
              <span className="text-[var(--color-success)] font-semibold">Found it. </span>
              A clinic can win every severity group and still lose the pooled
              table, purely because it takes the harder mix. Keep dragging to
              feel how wide the reversal region is.
            </p>
          ) : tieReachable ? (
            <p className="text-[11px] text-[#94a3b8] leading-relaxed">
              With Riverside as it is now, the two pooled rates tie near{" "}
              <span className="font-mono text-[#f1f5f9]">{tiePct}%</span> severe
              at Northside, computed from the fixed skills and Riverside&apos;s
              current pooled rate. Drag Northside past that point: the pooled
              winner flips while both group winners stay put.
            </p>
          ) : (
            <p className="text-[11px] text-[#94a3b8] leading-relaxed">
              With Riverside&apos;s current mix, no reachable Northside severe
              share ties the pooled rates: the tie point is past{" "}
              <span className="font-mono text-[#f1f5f9]">{SHARE_MAX}%</span>,
              computed from the fixed skills and Riverside&apos;s current
              pooled rate. The flip is out of reach until you pull
              Riverside&apos;s mix back down.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
