"use client";

import React, { useMemo } from "react";
import {
  Plane,
  ZoneId,
  ZONES,
  ZONE_META,
  ARMOR_SLOTS,
  ARMOR_EFFECT,
  FLEET_SIZE,
  hitCounts,
  survivorsWithArmor,
  naiveArmor,
  waldArmor,
} from "./types";

interface Props {
  fleet: readonly Plane[];
  armor: ReadonlySet<ZoneId>;
  onToggleZone: (z: ZoneId) => void;
  flown: boolean;
  onFly: () => void;
  onRearm: () => void;
}

// ── Silhouette geometry (SVG viewBox 0 0 300 380) ────────────────────────────

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const ZONE_SHAPES: Record<ZoneId, Rect[]> = {
  cockpit: [{ x: 134, y: 8, w: 32, h: 40 }],
  fuselage: [{ x: 136, y: 48, w: 28, h: 266 }],
  wings: [
    { x: 8, y: 126, w: 128, h: 36 },
    { x: 164, y: 126, w: 128, h: 36 },
  ],
  engines: [
    { x: 58, y: 86, w: 24, h: 40 },
    { x: 218, y: 86, w: 24, h: 40 },
  ],
  tail: [{ x: 96, y: 314, w: 108, h: 26 }],
};

const HIT_PAD = 3;

/** Deterministic hit position from the plane's stored (u, v) fractions. */
function hitPoint(zone: ZoneId, u: number, v: number): { x: number; y: number } {
  const rects = ZONE_SHAPES[zone];
  let rect = rects[0];
  let uu = u;
  if (rects.length === 2) {
    rect = u < 0.5 ? rects[0] : rects[1];
    uu = u < 0.5 ? u * 2 : u * 2 - 1;
  }
  return {
    x: rect.x + HIT_PAD + uu * (rect.w - 2 * HIT_PAD),
    y: rect.y + HIT_PAD + v * (rect.h - 2 * HIT_PAD),
  };
}

const ZONE_LABEL_POS: Record<ZoneId, { x: number; y: number }> = {
  cockpit: { x: 150, y: 30 },
  fuselage: { x: 150, y: 250 },
  wings: { x: 60, y: 146 },
  engines: { x: 230, y: 108 },
  tail: { x: 150, y: 330 },
};

interface BomberMapProps {
  title: string;
  planes: readonly Plane[];
  dotColor: string;
  armor: ReadonlySet<ZoneId>;
  interactive: boolean;
  onToggleZone?: (z: ZoneId) => void;
  ariaSummary: string;
}

function BomberMap({
  title,
  planes,
  dotColor,
  armor,
  interactive,
  onToggleZone,
  ariaSummary,
}: BomberMapProps) {
  const counts = useMemo(() => hitCounts(planes), [planes]);

  return (
    <div className="flex-1 min-w-[220px]">
      <p className="text-[12px] font-semibold text-white mb-2">{title}</p>
      <svg viewBox="0 0 300 380" className="w-full h-auto" role="group" aria-label={ariaSummary}>
        {ZONES.map((z) => {
          const armored = armor.has(z.id);
          const shapes = ZONE_SHAPES[z.id];
          const label = ZONE_LABEL_POS[z.id];
          const handleKey = (e: React.KeyboardEvent) => {
            if (!interactive || !onToggleZone) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggleZone(z.id);
            }
          };
          return (
            <g
              key={z.id}
              role={interactive ? "checkbox" : undefined}
              aria-checked={interactive ? armored : undefined}
              aria-label={
                interactive
                  ? `${z.label}: ${counts[z.id]} hits on returners. ${armored ? "Armored." : "Not armored."} Press Enter to toggle armor.`
                  : `${z.label}: ${counts[z.id]} hits`
              }
              tabIndex={interactive ? 0 : undefined}
              onClick={interactive && onToggleZone ? () => onToggleZone(z.id) : undefined}
              onKeyDown={interactive ? handleKey : undefined}
              className={
                interactive
                  ? "cursor-pointer focus:outline-none focus-visible:[outline:2px_solid_var(--color-accent)]"
                  : undefined
              }
            >
              {shapes.map((r, i) => (
                <rect
                  key={i}
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  rx={6}
                  fill={armored ? "var(--color-accent)" : "#1e293b"}
                  fillOpacity={armored ? 0.28 : 1}
                  stroke={armored ? "var(--color-accent)" : "#334155"}
                  strokeWidth={armored ? 2 : 1}
                />
              ))}
              <text
                x={label.x}
                y={label.y}
                textAnchor="middle"
                fontSize={10}
                fill={armored ? "var(--color-accent)" : "#94a3b8"}
                pointerEvents="none"
              >
                {z.label}
              </text>
            </g>
          );
        })}
        {planes.map((p, i) => {
          const pt = hitPoint(p.zone, p.hitU, p.hitV);
          return <circle key={i} cx={pt.x} cy={pt.y} r={2} fill={dotColor} opacity={0.8} pointerEvents="none" />;
        })}
      </svg>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {ZONES.map((z) => (
          <span key={z.id} className="text-[10px] font-mono text-[#94a3b8]">
            {z.label}: {counts[z.id]}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main scenario ─────────────────────────────────────────────────────────────

export default function WaldScenario({
  fleet,
  armor,
  onToggleZone,
  flown,
  onFly,
  onRearm,
}: Props) {
  const returned = useMemo(() => fleet.filter((p) => p.survived), [fleet]);
  const downed = useMemo(() => fleet.filter((p) => !p.survived), [fleet]);
  const returnedCounts = useMemo(() => hitCounts(returned), [returned]);

  const naiveZones = useMemo(() => naiveArmor(returnedCounts), [returnedCounts]);
  const waldZones = useMemo(() => waldArmor(returnedCounts), [returnedCounts]);

  const baselineSurvivors = returned.length;
  const yourSurvivors = useMemo(() => survivorsWithArmor(fleet, armor), [fleet, armor]);
  const naiveSurvivors = useMemo(
    () => survivorsWithArmor(fleet, new Set(naiveZones)),
    [fleet, naiveZones]
  );
  const waldSurvivors = useMemo(
    () => survivorsWithArmor(fleet, new Set(waldZones)),
    [fleet, waldZones]
  );

  const armorFull = armor.size === ARMOR_SLOTS;
  const pickedWald =
    armorFull && waldZones.every((z) => armor.has(z));

  const strategies = [
    {
      key: "none",
      label: "No armor (baseline)",
      zones: "none",
      survivors: baselineSurvivors,
      color: "#94a3b8",
    },
    {
      key: "naive",
      label: "Naive: armor the most-hit areas on returners",
      zones: naiveZones.map((z) => ZONE_META[z].label).join(" + "),
      survivors: naiveSurvivors,
      color: "var(--color-warning)",
    },
    {
      key: "yours",
      label: "Your armor",
      zones: [...armor].map((z) => ZONE_META[z].label).join(" + ") || "none",
      survivors: yourSurvivors,
      color: "var(--color-accent)",
    },
    {
      key: "wald",
      label: "Wald: armor where returners were never hit",
      zones: waldZones.map((z) => ZONE_META[z].label).join(" + "),
      survivors: waldSurvivors,
      color: "var(--color-success)",
    },
  ];

  const maxSurvivors = Math.max(...strategies.map((s) => s.survivors));

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
        <BomberMap
          title={`Hits on the ${returned.length} planes that RETURNED`}
          planes={returned}
          dotColor="var(--color-warning)"
          armor={armor}
          interactive={!flown}
          onToggleZone={onToggleZone}
          ariaSummary={`Bomber silhouette showing bullet hits on the ${returned.length} returning planes. Wings and fuselage are densely hit; engines and cockpit are almost clean. ${flown ? "Armor is locked in." : `Select ${ARMOR_SLOTS} zones to armor by clicking a zone or pressing Enter on it.`}`}
        />
        {flown ? (
          <BomberMap
            title={`REVEALED: hits on the ${downed.length} planes that never came back`}
            planes={downed}
            dotColor="#ef4444"
            armor={armor}
            interactive={false}
            ariaSummary={`Bomber silhouette showing bullet hits on the ${downed.length} downed planes, previously hidden. The hits cluster on engines and cockpit, the zones that looked clean on returners.`}
          />
        ) : (
          <div className="flex flex-col justify-center rounded-xl border border-dashed border-[#334155] p-5">
            <p className="text-[12px] font-semibold text-white mb-2">Your move</p>
            <ol className="list-decimal list-inside text-[11px] text-[#94a3b8] leading-relaxed space-y-1 mb-4">
              <li>Read the hit map. It shows ONLY the planes that made it home.</li>
              <li>
                Click zones on the silhouette to place armor on {ARMOR_SLOTS} of
                the 5 zones ({armor.size}/{ARMOR_SLOTS} placed).
              </li>
              <li>Send the same {FLEET_SIZE} sorties out again and see who returns.</li>
            </ol>
            <button
              onClick={onFly}
              disabled={!armorFull}
              className={`self-start px-5 py-2 rounded-xl text-sm font-semibold transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                armorFull
                  ? "bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90"
                  : "border border-[#1e293b] text-[#475569] cursor-not-allowed"
              }`}
            >
              Fly the mission →
            </button>
            <p className="text-[10px] text-[#475569] mt-3 leading-relaxed">
              Armor prevents {Math.round(ARMOR_EFFECT * 100)} percent of the
              losses a hit in that zone would otherwise cause. The re-flight
              reuses the exact same {FLEET_SIZE} hits and survival rolls, so
              the only thing that changes is your armor.
            </p>
          </div>
        )}
      </div>

      {flown && (
        <div>
          <p className="text-[12px] font-semibold text-white mb-3">
            Survivors out of {FLEET_SIZE}, same sorties re-flown per strategy
          </p>
          <div className="flex flex-col gap-2 mb-4">
            {strategies.map((s) => (
              <div key={s.key} className="flex items-center gap-2">
                <span className="w-[200px] sm:w-[280px] shrink-0 text-[11px] text-[#94a3b8] leading-tight">
                  {s.label}
                  <span className="block text-[10px] text-[#475569]">{s.zones}</span>
                </span>
                <div className="relative h-4 flex-1 rounded bg-[#1e293b] overflow-hidden">
                  <span
                    className="absolute top-0 bottom-0 left-0 rounded-sm"
                    style={{
                      background: s.color,
                      width: `${(s.survivors / maxSurvivors) * 100}%`,
                      opacity: 0.85,
                    }}
                  />
                </div>
                <span className="w-[52px] shrink-0 text-right text-[11px] font-mono text-white">
                  {s.survivors}
                </span>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-[#1e293b] bg-[#162032] p-4 mb-4">
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              {pickedWald ? (
                <>
                  You armored {waldZones.map((z) => ZONE_META[z].label).join(" and ")},
                  exactly where the returning planes showed the fewest hits, and
                  saved {yourSurvivors - baselineSurvivors} extra planes versus
                  no armor. The clean zones on returners were not safe zones.
                  They were the zones where a hit meant nobody flew home to be
                  counted.
                </>
              ) : (
                <>
                  Your armor saved {yourSurvivors - baselineSurvivors} planes
                  versus no armor; the inverted strategy saves{" "}
                  {waldSurvivors - baselineSurvivors}. The most-hit zones on
                  returners are the zones a bomber can survive. The almost-clean
                  zones (engines, cockpit) look safe only because planes hit
                  there rarely returned to be counted. Re-arm and try armoring
                  where the returners were never hit.
                </>
              )}
            </p>
          </div>
          <button
            onClick={onRearm}
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            Re-arm and fly again
          </button>
        </div>
      )}
    </div>
  );
}
