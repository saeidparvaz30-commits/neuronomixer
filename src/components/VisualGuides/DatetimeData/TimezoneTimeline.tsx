"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  EVENTS,
  ZONES,
  fmtDate,
  fmtFull,
  fmtOffset,
  fmtTime,
  localParts,
  partsFromMs,
  zoneById,
  zoneOffsetMin,
} from "./timeModel";

type Props = {
  zoneId: string;
  onZoneChange: (id: string) => void;
};

export default function TimezoneTimeline({ zoneId, onZoneChange }: Props) {
  const zone = zoneById(zoneId);

  return (
    <div>
      {/* Zone selector */}
      <div
        role="radiogroup"
        aria-label="Display timezone"
        className="inline-flex flex-wrap rounded-xl border border-[#1e293b] bg-[#0f172a] p-1 gap-1 mb-4"
      >
        {ZONES.map((z) => {
          const isActive = z.id === zoneId;
          return (
            <button
              key={z.id}
              role="radio"
              aria-checked={isActive}
              onClick={() => onZoneChange(z.id)}
              className={`relative px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                isActive ? "text-[#0a0e1a]" : "text-[#94a3b8] hover:text-white"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="dt-zone-pill"
                  className="absolute inset-0 rounded-lg bg-[var(--color-accent)]"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative">{z.short}</span>
            </button>
          );
        })}
      </div>

      {/* Event table */}
      <div className="overflow-x-auto rounded-xl border border-[#1e293b]">
        <table className="w-full text-left border-collapse min-w-[560px]">
          <thead>
            <tr className="bg-[#1e293b]">
              <th className="px-3 py-2 text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide">Event</th>
              <th className="px-3 py-2 text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide">Stored (UTC)</th>
              <th className="px-3 py-2 text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide">
                Shown in {zone.short}
              </th>
              <th className="px-3 py-2 text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide">Offset</th>
              <th className="px-3 py-2 text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide">Day shift</th>
            </tr>
          </thead>
          <tbody>
            {EVENTS.map((e, i) => {
              const utc = partsFromMs(e.utc);
              const local = localParts(zone, e.utc);
              const offset = zoneOffsetMin(zone, e.utc);
              const dayShift = local.day - utc.day;
              return (
                <tr key={e.id} className={i % 2 === 0 ? "bg-[#0f172a]" : "bg-[#162032]"}>
                  <td className="px-3 py-2 text-[12px] text-white font-medium whitespace-nowrap">{e.label}</td>
                  <td className="px-3 py-2 text-[12px] font-mono text-[#94a3b8] whitespace-nowrap">{fmtFull(utc)}</td>
                  <td className="px-3 py-2 text-[12px] font-mono text-white whitespace-nowrap">
                    {fmtDate(local)},{" "}
                    <span className="text-[var(--color-accent)]">{fmtTime(local)}</span>
                  </td>
                  <td className="px-3 py-2 text-[12px] font-mono text-[#94a3b8]">{fmtOffset(offset)}</td>
                  <td className="px-3 py-2 text-[12px]">
                    {dayShift === 0 ? (
                      <span className="text-[#475569]">same day</span>
                    ) : (
                      <span
                        className="font-semibold"
                        style={{ color: "var(--color-warning)" }}
                      >
                        {dayShift > 0 ? "+1 day" : "-1 day"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* The rule table: the zone model IS data */}
      <div className="mt-4 rounded-xl border border-[#1e293b] bg-[#0f172a] p-4">
        <p className="text-[12px] font-semibold text-white mb-2">
          The timezone rules used above, spelled out as data
        </p>
        <ul className="space-y-1 mb-3">
          {ZONES.map((z) => (
            <li key={z.id} className="text-[11px] text-[#94a3b8] leading-relaxed">
              <span className="font-mono text-white">{z.short}</span>
              {": "}
              {z.dst
                ? `${z.dst.note} (the real EU rule: clocks change at 01:00 UTC on the last Sunday of March and of October)`
                : `UTC${fmtOffset(z.baseOffsetMin)} at every instant, no DST`}
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-[#475569] leading-relaxed">
          Nothing here asks your browser what time it is or what zone you are in. Each local
          time is computed as UTC + offset(instant), with the offsets defined in this table,
          so the rendering is identical everywhere and every row can be checked by hand.
        </p>
      </div>
    </div>
  );
}
