"use client";

import React from "react";
import { motion } from "framer-motion";
import type { BiasType } from "./types";

interface Props {
  caseId: BiasType;
}

// ── Per-case after-reveal visualizations ─────────────────────────────────────

function SurvivorshipReveal() {
  // Illustrative counts. "All" is computed as returned + crashed, so the full
  // fleet can never show fewer hits than the survivors alone.
  const raw = [
    { label: "Wings",    returned: 30, crashed: 3,  color: "#3b82f6" },
    { label: "Fuselage", returned: 28, crashed: 2,  color: "#3b82f6" },
    { label: "Tail",     returned: 3,  crashed: 2,  color: "#3b82f6" },
    { label: "Engines",  returned: 2,  crashed: 29, color: "#ef4444" },
  ];
  const bars = raw.map((b) => ({ ...b, all: b.returned + b.crashed }));
  const max = Math.max(...bars.map((b) => b.all));
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-[#94a3b8] mb-1">Hits by section (illustrative counts): returned planes vs. ALL planes (returned + crashed)</p>
      {bars.map(({ label, returned, all, color }) => (
        <div key={label}>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[11px] text-[#94a3b8]">{label}</span>
            <div className="flex gap-3 text-[10px]">
              <span className="text-[#475569]">returned: {returned}</span>
              <span className="font-bold" style={{ color }}>all: {all}</span>
            </div>
          </div>
          <div className="relative h-3 bg-[#1e293b] rounded-full overflow-hidden">
            {/* Returned bar (faded) */}
            <div className="absolute h-3 rounded-full opacity-30" style={{ width: `${(returned / max) * 100}%`, background: "#94a3b8" }} />
            {/* True bar */}
            <motion.div
              className="absolute h-3 rounded-full"
              style={{ background: color }}
              initial={{ width: 0 }}
              animate={{ width: `${(all / max) * 100}%` }}
              transition={{ duration: 0.7, delay: 0.1 }}
            />
          </div>
        </div>
      ))}
      <p className="text-[11px] text-[#ef4444] font-semibold mt-2">↑ Reinforce engines, not wings.</p>
    </div>
  );
}

function NonresponseReveal() {
  const respondents = { share: 0.15, pct: 78 };
  const nonRespondents = { share: 0.85, pct: 35 };
  // Weighted average computed from the two groups: 0.15*78 + 0.85*35 = 41.45
  const trueAvg = respondents.share * respondents.pct + nonRespondents.share * nonRespondents.pct;
  const groups = [
    { label: "Respondents (15%)", pct: respondents.pct, color: "#d4af37" },
    { label: "Non-respondents (85%)", pct: nonRespondents.pct, color: "#ef4444" },
    { label: "True average (weighted)", pct: trueAvg, color: "#3bb4a4" },
  ];
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-[#94a3b8] mb-1">Satisfaction by response group</p>
      {groups.map(({ label, pct, color }) => (
        <div key={label}>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[11px]" style={{ color }}>{label}</span>
            <span className="text-[11px] font-bold" style={{ color }}>{pct.toFixed(pct % 1 === 0 ? 0 : 1)}%</span>
          </div>
          <div className="bg-[#1e293b] rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-3 rounded-full"
              style={{ background: color }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
        </div>
      ))}
      <p className="text-[11px] text-[#94a3b8] mt-2">
        True satisfaction is {trueAvg.toFixed(1)}% (0.15 × 78 + 0.85 × 35), not 78%.
      </p>
    </div>
  );
}

function SelectionReveal() {
  // Counts are the source of truth; every percentage below is computed from them.
  const strata = [
    { hospital: "X", risk: "Low",  survived: 450, total: 900 },  // 50%
    { hospital: "X", risk: "High", survived: null, total: null }, // not accepted
    { hospital: "Y", risk: "Low",  survived: 102, total: 200 },  // 51%
    { hospital: "Y", risk: "High", survived: 240, total: 800 },  // 30%
  ] as const;
  const aggFor = (h: "X" | "Y") => {
    const rows = strata.filter((r) => r.hospital === h && r.total !== null);
    const survived = rows.reduce((s, r) => s + (r.survived ?? 0), 0);
    const total = rows.reduce((s, r) => s + (r.total ?? 0), 0);
    return { survived, total, pct: total > 0 ? (survived / total) * 100 : 0 };
  };
  const aggX = aggFor("X");
  const aggY = aggFor("Y");
  return (
    <div>
      <p className="text-[11px] text-[#94a3b8] mb-3">Survival stratified by patient risk</p>
      <div className="grid grid-cols-2 gap-2">
        {strata.map(({ hospital, risk, survived, total }) => {
          const pct = total !== null && survived !== null ? (survived / total) * 100 : null;
          return (
            <div key={`${hospital}-${risk}`} className="rounded-xl border border-[#1e293b] p-3">
              <p className="text-[10px] text-[#94a3b8] mb-1">Hospital {hospital} · {risk} Risk</p>
              {pct !== null ? (
                <>
                  <div className="bg-[#1e293b] rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="h-2 rounded-full bg-[#3bb4a4]"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                  <p className="text-[12px] font-bold text-[#3bb4a4] mt-1">
                    {pct.toFixed(0)}% ({survived}/{total})
                  </p>
                </>
              ) : (
                <p className="text-[11px] text-[#475569] italic mt-1">Not accepted</p>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-[#94a3b8] mt-3">
        Overall (computed from the strata above): Hospital X {aggX.pct.toFixed(0)}% ({aggX.survived}/{aggX.total}) vs
        Hospital Y {aggY.pct.toFixed(0)}% ({aggY.survived}/{aggY.total}). On the comparable low-risk patients the
        hospitals perform about the same (51% vs 50%). Hospital X simply avoids high-risk cases, and Y&apos;s lower
        overall rate comes entirely from carrying that high-risk caseload.
      </p>
    </div>
  );
}

function MeasurementReveal() {
  const groups = [
    { label: "18-30", reported: 250, actual: 180, color: "#f97316" },
    { label: "50-70", reported: 80, actual: 140, color: "#3bb4a4" },
  ];
  return (
    <div>
      <p className="text-[11px] text-[#94a3b8] mb-3">Self-reported vs accelerometer (minutes/week)</p>
      {groups.map(({ label, reported, actual, color }) => (
        <div key={label} className="mb-3">
          <p className="text-[11px] font-semibold text-white mb-1">{label} years</p>
          <div className="space-y-1.5">
            {[{ k: "Self-reported", v: reported, c: "#475569" }, { k: "Measured", v: actual, c: color }].map(({ k, v, c }) => (
              <div key={k} className="flex items-center gap-2">
                <span className="text-[10px] w-24 shrink-0" style={{ color: c }}>{k}</span>
                <div className="flex-1 bg-[#1e293b] rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-2 rounded-full"
                    style={{ background: c }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(v / 270) * 100}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
                <span className="text-[10px] w-10 text-right font-bold" style={{ color: c }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <p className="text-[11px] text-[#94a3b8]">True gap: 40 min, not 170 min.</p>
    </div>
  );
}

function ConfirmationReveal() {
  // 30 picks total, matching the case narrative: 5 winners (avg +13%),
  // 10 neutral (avg +2%), 15 losers (avg -4%). All averages below are computed.
  const all = [
    { label: "W1", ret: 12, type: "win" },
    { label: "W2", ret: 18, type: "win" },
    { label: "W3", ret: 9,  type: "win" },
    { label: "W4", ret: 15, type: "win" },
    { label: "W5", ret: 11, type: "win" },
    { label: "N1", ret: 5,  type: "neutral" },
    { label: "N2", ret: 3,  type: "neutral" },
    { label: "N3", ret: 0,  type: "neutral" },
    { label: "N4", ret: 1,  type: "neutral" },
    { label: "N5", ret: 2,  type: "neutral" },
    { label: "N6", ret: 4,  type: "neutral" },
    { label: "N7", ret: 0,  type: "neutral" },
    { label: "N8", ret: 2,  type: "neutral" },
    { label: "N9", ret: 1,  type: "neutral" },
    { label: "N10", ret: 2, type: "neutral" },
    { label: "L1", ret: -6, type: "loss" },
    { label: "L2", ret: -2, type: "loss" },
    { label: "L3", ret: -8, type: "loss" },
    { label: "L4", ret: -3, type: "loss" },
    { label: "L5", ret: -5, type: "loss" },
    { label: "L6", ret: -1, type: "loss" },
    { label: "L7", ret: -4, type: "loss" },
    { label: "L8", ret: -7, type: "loss" },
    { label: "L9", ret: -2, type: "loss" },
    { label: "L10", ret: -4, type: "loss" },
    { label: "L11", ret: -3, type: "loss" },
    { label: "L12", ret: -5, type: "loss" },
    { label: "L13", ret: -6, type: "loss" },
    { label: "L14", ret: -2, type: "loss" },
    { label: "L15", ret: -2, type: "loss" },
  ];
  const colorMap: Record<string, string> = { win: "#3bb4a4", neutral: "#475569", loss: "#ef4444" };
  const avgOf = (items: { ret: number }[]) => items.reduce((s, x) => s + x.ret, 0) / items.length;
  const shownAvg = avgOf(all.filter((x) => x.type === "win"));
  const trueAvg = avgOf(all);

  return (
    <div>
      <p className="text-[11px] text-[#94a3b8] mb-2">All {all.length} advisor picks (simplified)</p>
      <div className="flex flex-wrap gap-1">
        {all.map(({ label, ret, type }, idx) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: idx * 0.02 }}
            className="px-1.5 py-0.5 rounded text-[9px] font-bold"
            style={{ background: `${colorMap[type]}20`, color: colorMap[type], border: `1px solid ${colorMap[type]}40` }}
          >
            {ret > 0 ? "+" : ""}{ret}%
          </motion.div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-[11px]">
        <span className="text-[#475569]">5 shown: <span className="text-[#3bb4a4] font-bold">avg +{shownAvg.toFixed(0)}%</span></span>
        <span className="text-[#475569]">All {all.length}: <span className="text-[#ef4444] font-bold">avg {trueAvg >= 0 ? "+" : ""}{trueAvg.toFixed(1)}%</span></span>
        <span className="text-[#475569]">Market: <span className="font-bold text-white">+7%</span></span>
      </div>
    </div>
  );
}

const REVEAL_MAP: Record<BiasType, React.FC> = {
  survivorship: SurvivorshipReveal,
  nonresponse:  NonresponseReveal,
  selection:    SelectionReveal,
  measurement:  MeasurementReveal,
  confirmation: ConfirmationReveal,
};

export default function BeforeAfterVisualization({ caseId }: Props) {
  const Viz = REVEAL_MAP[caseId];
  return (
    <div
      role="img"
      aria-label={`True picture visualization for ${caseId}`}
      className="rounded-2xl border border-[#3bb4a4]/30 bg-[#3bb4a4]/5 p-5"
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#3bb4a4] mb-3">True Picture</p>
      <Viz />
    </div>
  );
}
