"use client";

import React, { useMemo } from "react";
import {
  AGE_LEVEL_LABELS,
  AgeLevel,
  GENDER_LEVEL_LABELS,
  GenderLevel,
  generalizeAge,
  generalizeGender,
  generalizeZip,
  HEALTH_RECORDS,
  kAnonymity,
  Settings,
  TARGET_K,
  uniqueMatchCount,
  utility,
  ZIP_LEVEL_LABELS,
  ZipLevel,
} from "./types";

interface Props {
  settings: Settings;
  onChangeZip: (level: ZipLevel) => void;
  onChangeAge: (level: AgeLevel) => void;
  onChangeGender: (level: GenderLevel) => void;
}

function LevelControl({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: number;
  onChange: (level: number) => void;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-2">
        {label}
      </p>
      <div
        role="radiogroup"
        aria-label={`Generalization level for ${label}`}
        className="flex flex-wrap gap-1.5"
      >
        {options.map((opt, i) => {
          const active = value === i;
          return (
            <button
              key={opt}
              role="radio"
              aria-checked={active}
              onClick={() => onChange(i)}
              className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                active
                  ? "border-[var(--color-accent)] text-white bg-[#1e293b]"
                  : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155]"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DefensePhase({
  settings,
  onChangeZip,
  onChangeAge,
  onChangeGender,
}: Props) {
  const kResult = useMemo(() => kAnonymity(settings), [settings]);
  const util = useMemo(() => utility(settings), [settings]);
  const uniqueNow = useMemo(() => uniqueMatchCount(settings), [settings]);

  const kMet = kResult.k >= TARGET_K;
  const [minZip, minAge, minGender] = kResult.smallestClassKey.split("|");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* Left: controls + generalized release */}
      <div className="lg:col-span-3 flex flex-col gap-4">
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-5">
          <p className="text-[13px] font-semibold text-white mb-3">
            Choose how much detail the release keeps
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <LevelControl
              label="ZIP code"
              options={ZIP_LEVEL_LABELS}
              value={settings.zip}
              onChange={(l) => onChangeZip(l as ZipLevel)}
            />
            <LevelControl
              label="Age"
              options={AGE_LEVEL_LABELS}
              value={settings.age}
              onChange={(l) => onChangeAge(l as AgeLevel)}
            />
            <LevelControl
              label="Gender"
              options={GENDER_LEVEL_LABELS}
              value={settings.gender}
              onChange={(l) => onChangeGender(l as GenderLevel)}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-5">
          <p className="text-[13px] font-semibold text-white mb-1">
            The release, as the world now sees it
          </p>
          <p className="text-[11px] text-[#475569] mb-3 leading-relaxed">
            Same {HEALTH_RECORDS.length} records, published at your chosen
            detail. An asterisk means the column was removed.
          </p>
          <div className="overflow-x-auto max-h-[320px] overflow-y-auto rounded-lg">
            <table className="w-full border-collapse text-[12px]">
              <thead className="sticky top-0">
                <tr className="bg-[#1e293b] text-[#94a3b8]">
                  <th className="text-left font-semibold px-3 py-2">ZIP</th>
                  <th className="text-left font-semibold px-3 py-2">Age</th>
                  <th className="text-left font-semibold px-3 py-2">Gender</th>
                  <th className="text-left font-semibold px-3 py-2">
                    Diagnosis
                  </th>
                </tr>
              </thead>
              <tbody>
                {HEALTH_RECORDS.map((r, i) => (
                  <tr
                    key={r.id}
                    className={i % 2 === 0 ? "bg-[#0f172a]" : "bg-[#162032]"}
                  >
                    <td className="px-3 py-1.5 font-mono text-[#94a3b8] whitespace-nowrap">
                      {generalizeZip(r.zip, settings.zip)}
                    </td>
                    <td className="px-3 py-1.5 font-mono text-[#94a3b8] whitespace-nowrap">
                      {generalizeAge(r.age, settings.age)}
                    </td>
                    <td className="px-3 py-1.5 text-[#94a3b8]">
                      {generalizeGender(r.gender, settings.gender)}
                    </td>
                    <td className="px-3 py-1.5 text-[#f1f5f9] whitespace-nowrap">
                      {r.diagnosis}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right: k, attack re-run, utility */}
      <div className="lg:col-span-2 flex flex-col gap-3">
        <div
          className="rounded-2xl border bg-[#0f172a] p-4 transition-colors"
          style={{
            borderColor: kMet ? "var(--color-success)" : "#1e293b",
          }}
        >
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            k-anonymity of this release
          </p>
          <div className="flex items-baseline gap-2">
            <p
              className="text-3xl font-black font-mono"
              style={{
                color: kMet ? "var(--color-success)" : "var(--color-warning)",
              }}
            >
              k = {kResult.k}
            </p>
            <p className="text-[11px] text-[#475569]">target: k ≥ {TARGET_K}</p>
            {kMet && (
              <span className="text-[10px] font-semibold text-[var(--color-success)]">
                ✓ reached
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#94a3b8] mt-2 leading-relaxed">
            Every published row is identical to at least {kResult.k - 1} other
            row{kResult.k - 1 === 1 ? "" : "s"} on (ZIP, age, gender). The
            release splits into {kResult.classCount} group
            {kResult.classCount === 1 ? "" : "s"}; the smallest is{" "}
            <span className="font-mono text-[#f1f5f9]">
              ({minZip}, {minAge}, {minGender})
            </span>{" "}
            with {kResult.k} {kResult.k === 1 ? "person" : "people"}.
          </p>
          {/* Class-size strip */}
          <div
            className="flex items-end gap-[3px] mt-3 h-10"
            role="img"
            aria-label={`Bar strip of equivalence class sizes: ${kResult.classSizes.join(", ")} people per group, smallest ${kResult.k}.`}
          >
            {kResult.classSizes.map((size, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm min-w-[3px]"
                style={{
                  height: `${(size / HEALTH_RECORDS.length) * 100}%`,
                  background:
                    size < TARGET_K ? "var(--color-warning)" : "#334155",
                }}
              />
            ))}
          </div>
          <p className="text-[10px] text-[#475569] mt-1">
            One bar per group of identical rows. Orange bars are groups smaller
            than {TARGET_K}.
          </p>
        </div>

        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            The attack, re-run against this release
          </p>
          <p
            className="text-2xl font-black font-mono"
            style={{
              color:
                uniqueNow === 0
                  ? "var(--color-success)"
                  : "var(--color-warning)",
            }}
          >
            {uniqueNow} unique match{uniqueNow === 1 ? "" : "es"}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            voter-roll neighbors who still link to exactly one record
          </p>
        </div>

        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] text-[#475569] uppercase tracking-wide">
              Utility left for analysts
            </p>
            <p className="text-[14px] font-black font-mono text-[#f1f5f9]">
              {util.score.toFixed(0)}%
            </p>
          </div>
          <div className="h-2.5 rounded-full bg-[#1e293b] overflow-hidden mb-3">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${util.score}%`,
                background:
                  util.score >= 60
                    ? "var(--color-success)"
                    : util.score >= 30
                      ? "var(--color-warning)"
                      : "#ef4444",
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            {util.parts.map((p) => (
              <div
                key={p.label}
                className="flex items-center justify-between gap-2 text-[11px]"
              >
                <span className="text-[#94a3b8]">{p.label}</span>
                <span className="font-mono text-[#f1f5f9] whitespace-nowrap">
                  {p.unit === "pp"
                    ? `±${(p.error * 100).toFixed(1)} pp`
                    : `±${p.error.toFixed(1)} ${p.unit}`}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[#475569] mt-2 leading-relaxed">
            Each line is the mean absolute error of that query answered from
            the release instead of the raw table. Removed columns fall back to
            the midpoint of the release&apos;s age range, an even split across
            ZIPs, or a 50 percent gender assumption. 100% means every query
            still comes out exact.
          </p>
        </div>
      </div>
    </div>
  );
}
