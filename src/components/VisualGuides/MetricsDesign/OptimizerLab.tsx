"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Core,
  FEED_SLOTS,
  Guardrail,
  GUARDRAIL_MAX_PCT,
  GUARDRAIL_MIN_PCT,
  RunRecord,
  TargetId,
  TARGETS,
  TICK_MS,
  TickMetrics,
  TOTAL_TICKS,
  START_MIX,
  feedFor,
  fmtInt,
  fmtPct,
  initialMetrics,
  optimizerStep,
  startCore,
  summarize,
} from "./types";

interface Props {
  guardEnabled: boolean;
  onGuardEnabledChange: (v: boolean) => void;
  guardFloorPct: number;
  onGuardFloorChange: (v: number) => void;
  onRunComplete: (record: RunRecord) => void;
}

type Phase = "idle" | "running" | "done";

interface SimRun {
  core: Core;
  mix: number;
  history: TickMetrics[];
  constrained: boolean;
}

function freshSim(): SimRun {
  return {
    core: startCore(),
    mix: START_MIX,
    history: [initialMetrics()],
    constrained: false,
  };
}

// ── Sparkline (decorative; the tile shows the live value as text) ────────────

function Sparkline({
  values,
  stroke,
  floor,
}: {
  values: readonly number[];
  stroke: string;
  floor?: number | null;
}) {
  const W = 100;
  const H = 28;
  const vals = values.length === 1 ? [values[0], values[0]] : values;
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (floor != null) {
    min = Math.min(min, floor);
    max = Math.max(max, floor);
  }
  const pad = (max - min || Math.abs(max) || 1) * 0.12;
  min -= pad;
  max += pad;
  const span = max - min;
  const y = (v: number) => H - ((v - min) / span) * H;
  const points = vals
    .map((v, i) => `${(i / (vals.length - 1)) * W},${y(v).toFixed(2)}`)
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="w-full h-7"
      aria-hidden="true"
    >
      {floor != null && (
        <line
          x1={0}
          x2={W}
          y1={y(floor)}
          y2={y(floor)}
          stroke="#334155"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      )}
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ── The lab ──────────────────────────────────────────────────────────────────

export default function OptimizerLab({
  guardEnabled,
  onGuardEnabledChange,
  guardFloorPct,
  onGuardFloorChange,
  onRunComplete,
}: Props) {
  const [target, setTarget] = useState<TargetId>("clicks");
  const [phase, setPhase] = useState<Phase>("idle");
  const [sim, setSim] = useState<SimRun>(freshSim);
  const runIdRef = useRef(0);

  const running = phase === "running";

  // Advance one simulated day per tick while running.
  useEffect(() => {
    if (!running) return;
    const guardrail: Guardrail = {
      enabled: guardEnabled,
      minRetentionPct: guardFloorPct,
    };
    const id = window.setInterval(() => {
      setSim((prev) => {
        if (prev.history.length > TOTAL_TICKS) return prev;
        const step = optimizerStep(prev.core, prev.mix, target, guardrail);
        return {
          core: step.core,
          mix: step.mix,
          history: [...prev.history, step.metrics],
          constrained: step.constrained,
        };
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [running, target, guardEnabled, guardFloorPct]);

  // Close out the run once the final day has been simulated.
  useEffect(() => {
    if (phase !== "running" || sim.history.length !== TOTAL_TICKS + 1) return;
    setPhase("done");
    runIdRef.current += 1;
    onRunComplete({
      id: runIdRef.current,
      target,
      guardrail: { enabled: guardEnabled, minRetentionPct: guardFloorPct },
      history: sim.history,
    });
  }, [phase, sim.history, target, guardEnabled, guardFloorPct, onRunComplete]);

  const day = sim.history.length - 1;
  const latest = sim.history[sim.history.length - 1];
  const feed = feedFor(latest.mix, day);
  const baitCount = feed.filter((f) => f.bait).length;
  const summary = phase === "done" ? summarize(sim.history) : null;
  const clicksChangePct =
    summary === null
      ? 0
      : ((summary.final.clicks - summary.start.clicks) / summary.start.clicks) *
        100;

  const handleRun = () => {
    setSim(freshSim());
    setPhase("running");
  };
  const handleReset = () => {
    setSim(freshSim());
    setPhase("idle");
  };

  const tiles: {
    key: string;
    label: string;
    value: string;
    note: string;
    color: string;
    series: number[];
    floor?: number | null;
  }[] = [
    {
      key: "clicks",
      label: "Clicks per day",
      value: fmtInt(latest.clicks),
      note: "users x impressions x CTR",
      color: "var(--color-accent)",
      series: sim.history.map((h) => h.clicks),
    },
    {
      key: "ctr",
      label: "Click-through rate",
      value: fmtPct(latest.ctr, 2),
      note: "per impression, trust-adjusted",
      color: "#3bb4a4",
      series: sim.history.map((h) => h.ctr),
    },
    {
      key: "retention",
      label: "Retention, day over day",
      value: fmtPct(latest.retention),
      note: guardEnabled ? `guardrail floor ${guardFloorPct}%` : "no guardrail",
      color: "var(--color-success)",
      series: sim.history.map((h) => h.retention),
      floor: guardEnabled ? guardFloorPct / 100 : null,
    },
    {
      key: "users",
      label: "Active users",
      value: fmtInt(latest.users),
      note: "yesterday's users x retention + 400",
      color: "#a855f7",
      series: sim.history.map((h) => h.users),
    },
    {
      key: "mix",
      label: "Clickbait share",
      value: fmtPct(latest.mix, 0),
      note: "the optimizer's one lever",
      color: "var(--color-warning)",
      series: sim.history.map((h) => h.mix),
    },
    {
      key: "trust",
      label: "User trust",
      value: `${Math.round(latest.trust * 100)} / 100`,
      note: "latent: no real dashboard shows it",
      color: "#ec4899",
      series: sim.history.map((h) => h.trust),
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Controls */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-3">
            Give the optimizer a target
          </p>
          <div
            role="radiogroup"
            aria-label="Metric the optimizer maximizes"
            className="flex flex-col gap-2 mb-4"
          >
            {TARGETS.map((t) => {
              const isActive = target === t.id;
              return (
                <button
                  key={t.id}
                  role="radio"
                  aria-checked={isActive}
                  disabled={running}
                  onClick={() => setTarget(t.id)}
                  className={`px-3 py-2 rounded-xl border text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:opacity-60 ${
                    isActive
                      ? "border-[var(--color-accent)] bg-[#1e293b]"
                      : "border-[#1e293b] hover:border-[#334155]"
                  }`}
                >
                  <span
                    className={`block text-[12px] font-semibold ${
                      isActive ? "text-white" : "text-[#94a3b8]"
                    }`}
                  >
                    {t.label}
                  </span>
                  <span className="block text-[10px] text-[#475569] leading-relaxed mt-0.5">
                    {t.hint}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-[#1e293b] p-3 mb-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-semibold text-white">
                Retention guardrail
              </span>
              <button
                aria-pressed={guardEnabled}
                disabled={running}
                onClick={() => onGuardEnabledChange(!guardEnabled)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:opacity-60 ${
                  guardEnabled
                    ? "border-[var(--color-success)] text-[var(--color-success)]"
                    : "border-[#334155] text-[#94a3b8]"
                }`}
              >
                {guardEnabled ? "On" : "Off"}
              </button>
            </div>
            <label className="block text-[10px] text-[#94a3b8] mb-1">
              Reject moves projected to drop retention below{" "}
              <span className="font-mono font-bold text-white">
                {guardFloorPct}%
              </span>
            </label>
            <input
              type="range"
              min={GUARDRAIL_MIN_PCT}
              max={GUARDRAIL_MAX_PCT}
              step={1}
              value={guardFloorPct}
              disabled={!guardEnabled || running}
              onChange={(e) => onGuardFloorChange(Number(e.target.value))}
              aria-label="Minimum retention the guardrail enforces, in percent"
              className="w-full disabled:opacity-50"
              style={{ accentColor: "var(--color-success)" }}
            />
            <p className="text-[10px] text-[#475569] leading-relaxed mt-2">
              When the guardrail is on, the optimizer discards any move whose
              projected next-day retention crosses the floor. A constraint, not
              a target.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRun}
              disabled={running}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {phase === "done" ? "Run again" : "Run the optimizer"}
            </button>
            <button
              onClick={handleReset}
              disabled={phase === "idle" && day === 0}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Model rules: the data behind every number on the dashboards */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-2">
            The rules of this world
          </p>
          <ul className="text-[11px] text-[#94a3b8] leading-relaxed space-y-1.5 list-disc pl-4">
            <li>
              Clickbait clicks better: 16% base CTR vs 4.5% for a quality piece.
            </li>
            <li>
              The audience tolerates up to 30% bait. Above that, trust erodes
              toward a lower level, and it recovers only slowly when the mix
              cleans up.
            </li>
            <li>
              Trust drives retention: the day-over-day return rate runs from
              45% at zero trust to 90% at full trust.
            </li>
            <li>
              Users compound: tomorrow&apos;s audience is today&apos;s times
              retention, plus 400 new signups.
            </li>
            <li>
              Distrustful users click less: effective CTR is scaled down as
              trust falls.
            </li>
            <li>
              Each day the optimizer nudges the clickbait share up to 4 points
              in whichever direction improves its target one day ahead.
            </li>
          </ul>
        </div>
      </div>

      {/* Dashboards + feed */}
      <div className="lg:col-span-3 flex flex-col gap-4">
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
            <p className="text-[13px] font-semibold text-white">
              Live dashboards
            </p>
            <div className="flex items-center gap-2">
              {running && sim.constrained && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[var(--color-warning)] text-[var(--color-warning)]">
                  guardrail binding
                </span>
              )}
              <span className="text-[11px] font-mono text-[#94a3b8]">
                Day {day} of {TOTAL_TICKS}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {tiles.map((tile) => (
              <div
                key={tile.key}
                className="rounded-xl border border-[#1e293b] p-3"
              >
                <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                  {tile.label}
                </p>
                <p
                  className="text-lg font-black font-mono leading-none mb-2"
                  style={{ color: tile.color }}
                >
                  {tile.value}
                </p>
                <Sparkline
                  values={tile.series}
                  stroke={tile.color}
                  floor={tile.floor ?? null}
                />
                <p className="text-[9px] text-[#475569] mt-1.5">{tile.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Today's front page */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
            <p className="text-[13px] font-semibold text-white">
              Today&apos;s front page
            </p>
            <p className="text-[11px] text-[#94a3b8]">
              <span
                className="font-mono font-bold"
                style={{
                  color:
                    baitCount > FEED_SLOTS / 2
                      ? "var(--color-warning)"
                      : "#94a3b8",
                }}
              >
                {baitCount} of {FEED_SLOTS}
              </span>{" "}
              slots are clickbait
            </p>
          </div>
          <ul className="flex flex-col gap-1.5">
            {feed.map((item, i) => (
              <li
                key={i}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] ${
                  item.bait
                    ? "border-[#f97316]/40 bg-[#1e293b]"
                    : "border-[#1e293b]"
                }`}
              >
                <span
                  className={`shrink-0 w-[52px] text-center text-[9px] font-semibold uppercase tracking-wide rounded px-1 py-0.5 ${
                    item.bait
                      ? "text-[var(--color-warning)] border border-[#f97316]/40"
                      : "text-[#475569] border border-[#334155]"
                  }`}
                >
                  {item.bait ? "bait" : "quality"}
                </span>
                <span
                  className={item.bait ? "text-[#f1f5f9]" : "text-[#94a3b8]"}
                >
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Run summary */}
        {summary && (
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-5">
            <p className="text-[13px] font-semibold text-white mb-3">
              Run complete: {TARGETS.find((t) => t.id === target)!.label},
              guardrail{" "}
              {guardEnabled ? `at ${guardFloorPct}% retention` : "off"}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-[#1e293b] p-3">
                <p className="text-[10px] text-[#475569] mb-1">Peak clicks</p>
                <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                  {fmtInt(summary.peak.clicks)}
                </p>
                <p className="text-[10px] text-[#475569] mt-0.5">
                  on day {summary.peakDay}
                </p>
              </div>
              <div className="rounded-xl border border-[#1e293b] p-3">
                <p className="text-[10px] text-[#475569] mb-1">Final clicks</p>
                <p
                  className="text-[14px] font-mono font-bold"
                  style={{
                    color:
                      clicksChangePct < 0
                        ? "var(--color-warning)"
                        : "var(--color-success)",
                  }}
                >
                  {fmtInt(summary.final.clicks)}
                </p>
                <p className="text-[10px] text-[#475569] mt-0.5">
                  {clicksChangePct >= 0 ? "+" : ""}
                  {clicksChangePct.toFixed(0)}% vs day 0&apos;s{" "}
                  {fmtInt(summary.start.clicks)}
                </p>
              </div>
              <div className="rounded-xl border border-[#1e293b] p-3">
                <p className="text-[10px] text-[#475569] mb-1">Retention</p>
                <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                  {fmtPct(summary.final.retention)}
                </p>
                <p className="text-[10px] text-[#475569] mt-0.5">
                  was {fmtPct(summary.start.retention)} on day 0
                </p>
              </div>
              <div className="rounded-xl border border-[#1e293b] p-3">
                <p className="text-[10px] text-[#475569] mb-1">Active users</p>
                <p className="text-[14px] font-mono font-bold text-[#a855f7]">
                  {fmtInt(summary.final.users)}
                </p>
                <p className="text-[10px] text-[#475569] mt-0.5">
                  was {fmtInt(summary.start.users)} on day 0
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
