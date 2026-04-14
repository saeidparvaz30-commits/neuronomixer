"use client";

import React from "react";
import type { BiasType } from "./types";

interface Props {
  caseId: BiasType;
  headline: string;
  conclusion: string;
}

// ── Observed-data visualizations (biased view) ────────────────────────────────

function SurvivorshipViz() {
  const bars = [
    { label: "Wings", count: 30, color: "#ef4444" },
    { label: "Fuselage", count: 28, color: "#ef4444" },
    { label: "Tail", count: 3, color: "#3b82f6" },
    { label: "Engines", count: 2, color: "#3b82f6" },
  ];
  const max = 30;
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-[#94a3b8] mb-2">Bullet holes on returned planes (per 100 sq ft)</p>
      {bars.map(({ label, count, color }) => (
        <div key={label} className="flex items-center gap-2">
          <span className="text-[11px] text-[#94a3b8] w-16 shrink-0">{label}</span>
          <div className="flex-1 bg-[#1e293b] rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all"
              style={{ width: `${(count / max) * 100}%`, background: color }}
            />
          </div>
          <span className="text-[11px] w-5 text-right font-bold" style={{ color }}>{count}</span>
        </div>
      ))}
    </div>
  );
}

function NonresponseViz() {
  const bars = [
    { label: "Engineering", pct: 82 },
    { label: "Sales", pct: 71 },
    { label: "Support", pct: 80 },
  ];
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-[#94a3b8] mb-2">Satisfaction (respondents only, 15% response rate)</p>
      {bars.map(({ label, pct }) => (
        <div key={label} className="flex items-center gap-2">
          <span className="text-[11px] text-[#94a3b8] w-20 shrink-0">{label}</span>
          <div className="flex-1 bg-[#1e293b] rounded-full h-3">
            <div className="h-3 rounded-full bg-[#3bb4a4]" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[11px] font-bold text-[#3bb4a4] w-8 text-right">{pct}%</span>
        </div>
      ))}
    </div>
  );
}

function SelectionViz() {
  const rows = [
    { hospital: "Hospital X", survival: 50 },
    { hospital: "Hospital Y", survival: 25 },
  ];
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-[#94a3b8] mb-2">5-year survival rate, complex surgeries</p>
      {rows.map(({ hospital, survival }) => (
        <div key={hospital}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] font-semibold text-white">{hospital}</span>
            <span className="text-[12px] font-bold text-[#d4af37]">{survival}%</span>
          </div>
          <div className="bg-[#1e293b] rounded-full h-4">
            <div className="h-4 rounded-full bg-[#d4af37]" style={{ width: `${survival}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MeasurementViz() {
  const bars = [
    { label: "18-30 yrs", mins: 250 },
    { label: "50-70 yrs", mins: 80 },
  ];
  const max = 250;
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-[#94a3b8] mb-2">Self-reported weekly exercise (minutes)</p>
      {bars.map(({ label, mins }) => (
        <div key={label}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] text-[#94a3b8]">{label}</span>
            <span className="text-[12px] font-bold text-[#f97316]">{mins} min</span>
          </div>
          <div className="bg-[#1e293b] rounded-full h-3">
            <div className="h-3 rounded-full bg-[#f97316]" style={{ width: `${(mins / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ConfirmationViz() {
  const picks = [
    { label: "Pick 1", ret: 12, color: "#3bb4a4" },
    { label: "Pick 2", ret: 18, color: "#3bb4a4" },
    { label: "Pick 3", ret: 9, color: "#3bb4a4" },
    { label: "Pick 4", ret: 15, color: "#3bb4a4" },
    { label: "Pick 5", ret: 11, color: "#3bb4a4" },
  ];
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-[#94a3b8] mb-2">5 advisor picks shown to you</p>
      {picks.map(({ label, ret, color }) => (
        <div key={label} className="flex items-center gap-2">
          <span className="text-[11px] text-[#94a3b8] w-10 shrink-0">{label}</span>
          <div className="flex-1 bg-[#1e293b] rounded-full h-3">
            <div className="h-3 rounded-full" style={{ width: `${(ret / 20) * 100}%`, background: color }} />
          </div>
          <span className="text-[11px] font-bold w-8 text-right" style={{ color }}>+{ret}%</span>
        </div>
      ))}
      <div className="mt-2 pt-2 border-t border-[#1e293b] flex items-center justify-between">
        <span className="text-[11px] text-[#94a3b8]">Market avg</span>
        <span className="text-[11px] font-bold text-[#94a3b8]">+7%</span>
      </div>
    </div>
  );
}

const VIZ_MAP: Record<BiasType, React.FC> = {
  survivorship: SurvivorshipViz,
  nonresponse: NonresponseViz,
  selection: SelectionViz,
  measurement: MeasurementViz,
  confirmation: ConfirmationViz,
};

export default function DataPanel({ caseId, headline, conclusion }: Props) {
  const Viz = VIZ_MAP[caseId];

  return (
    <div
      role="img"
      aria-label={`Observed data visualization: ${headline}`}
      className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5"
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-1">Observed Data</p>
      <p className="text-[14px] font-bold text-white mb-4">{headline}</p>
      <Viz />
      <div className="mt-4 pt-3 border-t border-[#1e293b]">
        <p className="text-[11px] font-semibold text-[#d4af37] uppercase tracking-wider mb-1">Conclusion drawn</p>
        <p className="text-[12px] text-[#94a3b8] italic">&ldquo;{conclusion}&rdquo;</p>
      </div>
    </div>
  );
}
