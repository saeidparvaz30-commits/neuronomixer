"use client";

import type { TrialResult, EventType } from "./types";

// ── Coin visual ───────────────────────────────────────────────────────────────

function CoinSVG({ label, hit }: { label: string; hit: boolean }) {
  const isHeads = label === "Heads";
  return (
    <svg viewBox="0 0 80 80" width={80} height={80} aria-label={`Coin: ${label}`}>
      <circle
        cx={40} cy={40} r={36}
        fill={isHeads ? "var(--color-accent)" : "#475569"}
        stroke={hit ? "var(--color-success)" : "#ef4444"}
        strokeWidth={3}
        filter={hit ? "url(#glow-green)" : "url(#glow-red)"}
      />
      <text x={40} y={46} textAnchor="middle" fontSize={26} fontWeight="bold"
        fill={isHeads ? "#0a0e1a" : "#f1f5f9"}>
        {isHeads ? "H" : "T"}
      </text>
      <defs>
        <filter id="glow-green"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="glow-red"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
    </svg>
  );
}

// ── Die visual ────────────────────────────────────────────────────────────────

const PIP_POSITIONS: Record<number, [number, number][]> = {
  1: [[40, 40]],
  2: [[24, 24], [56, 56]],
  3: [[24, 24], [40, 40], [56, 56]],
  4: [[24, 24], [56, 24], [24, 56], [56, 56]],
  5: [[24, 24], [56, 24], [40, 40], [24, 56], [56, 56]],
  6: [[24, 20], [56, 20], [24, 40], [56, 40], [24, 60], [56, 60]],
};

function DieSVG({ label, hit }: { label: string; hit: boolean }) {
  const n = parseInt(label, 10);
  const pips = PIP_POSITIONS[n] ?? [];
  return (
    <svg viewBox="0 0 80 80" width={80} height={80} aria-label={`Die: ${label}`}>
      <rect x={4} y={4} width={72} height={72} rx={12}
        fill="#1e293b"
        stroke={hit ? "var(--color-success)" : "#ef4444"}
        strokeWidth={3}
      />
      {pips.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={6} fill="#f1f5f9" />
      ))}
    </svg>
  );
}

// ── Card visual ───────────────────────────────────────────────────────────────

function CardSVG({ label, hit }: { label: string; hit: boolean }) {
  const isRed = label.endsWith("♥") || label.endsWith("♦");
  const suitColor = isRed ? "#ef4444" : "#f1f5f9";
  const rankPart = label.slice(0, -1);   // everything before the suit symbol
  const suitPart = label.slice(-1);      // last char = suit symbol

  return (
    <svg viewBox="0 0 60 84" width={60} height={84} aria-label={`Card: ${label}`}>
      <rect x={2} y={2} width={56} height={80} rx={6}
        fill="#f1f5f9"
        stroke={hit ? "var(--color-success)" : "#ef4444"}
        strokeWidth={2.5}
      />
      {/* top-left rank */}
      <text x={7} y={18} fontSize={11} fontWeight="bold" fill={suitColor}>{rankPart}</text>
      <text x={7} y={29} fontSize={10} fill={suitColor}>{suitPart}</text>
      {/* center suit */}
      <text x={30} y={50} textAnchor="middle" fontSize={24} fill={suitColor}>{suitPart}</text>
      {/* bottom-right rank (flipped) */}
      <text x={53} y={72} fontSize={11} fontWeight="bold" fill={suitColor}
        textAnchor="end" transform="rotate(180 53 72)">{rankPart}</text>
    </svg>
  );
}

// ── Per-event cell ────────────────────────────────────────────────────────────

function EventCell({ type, raw, hit }: { type: EventType; raw: string; hit: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {type === "coin_flip" && <CoinSVG label={raw} hit={hit} />}
        {type === "die_roll" && <DieSVG label={raw} hit={hit} />}
        {type === "card_draw" && <CardSVG label={raw} hit={hit} />}
        {/* hit/miss badge */}
        <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
          ${hit ? "bg-[var(--color-success)] text-white" : "bg-[#ef4444] text-white"}`}>
          {hit ? "✓" : "✗"}
        </span>
      </div>
      <span className="text-[11px] font-mono text-[#94a3b8]">{raw}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  result: TrialResult;
}

export default function TrialVisualizer({ result }: Props) {
  const { hit, typeA, rawA, hitA, operator, typeB, rawB, hitB } = result;
  const hasSecond = operator !== "none" && operator !== "NOT" && typeB && rawB != null;

  return (
    <div
      className="rounded-2xl border border-[#1e293b] bg-[#0a0e1a] p-4"
      style={{ animation: "trialFadeIn 0.25s ease" }}
    >
      <style>{`
        @keyframes trialFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-4">
        Trial Snapshot
      </p>

      <div className="flex items-center justify-center gap-5 flex-wrap">
        {/* Event A */}
        <EventCell type={typeA} raw={rawA} hit={operator === "NOT" ? !hitA : hitA} />

        {/* Operator label */}
        {operator !== "none" && (
          <span className="text-[13px] font-bold text-[var(--color-accent)] px-1">{operator}</span>
        )}

        {/* Event B (AND / OR only) */}
        {hasSecond && typeB && rawB != null && (
          <EventCell type={typeB} raw={rawB} hit={hitB ?? false} />
        )}
      </div>

      {/* Overall result */}
      <div className="mt-4 flex justify-center">
        <span className={`px-4 py-1 rounded-full text-[12px] font-semibold
          ${hit
            ? "bg-[var(--color-success)]/15 text-[var(--color-success)] border border-[var(--color-success)]/30"
            : "bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30"
          }`}>
          {hit ? "✓ Event occurred" : "✗ Event did not occur"}
        </span>
      </div>
    </div>
  );
}
