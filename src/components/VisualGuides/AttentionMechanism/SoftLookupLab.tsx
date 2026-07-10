"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Vec2,
  PlaygroundResult,
  PLAY_BOUND,
  PLAY_VALUES,
  PLAY_SHARPNESS_MIN,
  PLAY_SHARPNESS_MAX,
} from "./attentionMath";

const SIZE = 440;
/** Keyboard step in data units per arrow-key press. */
const KEY_STEP = 0.1;
/** Fixed score-bar range; raw dot products stay inside it on this plane. */
const SCORE_RANGE = 3;

/** Key slot display config: color plus shape, never color alone. */
export const KEY_STYLES: readonly {
  color: string;
  shape: "circle" | "square" | "diamond" | "triangle";
  label: string;
}[] = [
  { color: "#1e5d8a", shape: "circle", label: "Key 1" },
  { color: "#3bb4a4", shape: "square", label: "Key 2" },
  { color: "#a855f7", shape: "diamond", label: "Key 3" },
  { color: "#ec4899", shape: "triangle", label: "Key 4" },
];

const toPx = (v: number) => ((v + PLAY_BOUND) / (2 * PLAY_BOUND)) * SIZE;
const toPy = (v: number) => SIZE - ((v + PLAY_BOUND) / (2 * PLAY_BOUND)) * SIZE;

function clampB(v: number): number {
  return Math.max(-PLAY_BOUND, Math.min(PLAY_BOUND, v));
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function shapePath(
  shape: "circle" | "square" | "diamond" | "triangle",
  cx: number,
  cy: number,
  r: number
): React.ReactElement {
  const x = +cx.toFixed(2);
  const y = +cy.toFixed(2);
  const rr = +r.toFixed(2);
  switch (shape) {
    case "circle":
      return <circle cx={x} cy={y} r={rr} />;
    case "square":
      return (
        <rect
          x={(x - rr).toFixed(2)}
          y={(y - rr).toFixed(2)}
          width={(2 * rr).toFixed(2)}
          height={(2 * rr).toFixed(2)}
        />
      );
    case "diamond":
      return (
        <path
          d={`M${x} ${(y - rr).toFixed(2)} L${(x + rr).toFixed(2)} ${y} L${x} ${(y + rr).toFixed(2)} L${(x - rr).toFixed(2)} ${y} Z`}
        />
      );
    case "triangle":
      return (
        <path
          d={`M${x} ${(y - rr).toFixed(2)} L${(x + rr).toFixed(2)} ${(y + rr).toFixed(2)} L${(x - rr).toFixed(2)} ${(y + rr).toFixed(2)} Z`}
        />
      );
  }
}

type DragTarget = { kind: "query" } | { kind: "key"; index: number };

type Props = {
  query: Vec2;
  keys: readonly Vec2[];
  sharpness: number;
  result: PlaygroundResult;
  onMoveQuery: (v: Vec2) => void;
  onMoveKey: (index: number, v: Vec2) => void;
  onSharpness: (v: number) => void;
};

export default function SoftLookupLab({
  query,
  keys,
  sharpness,
  result,
  onMoveQuery,
  onMoveKey,
  onSharpness,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragTarget | null>(null);
  const [focus, setFocus] = useState<string | null>(null);

  // Window-level drag listeners outlive renders; route through refs so the
  // latest handlers (and state) are always the ones that run.
  const moveQueryRef = useRef(onMoveQuery);
  const moveKeyRef = useRef(onMoveKey);
  useEffect(() => {
    moveQueryRef.current = onMoveQuery;
    moveKeyRef.current = onMoveKey;
  }, [onMoveQuery, onMoveKey]);

  const dataCoords = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const fx = (clientX - rect.left) / rect.width;
    const fy = (clientY - rect.top) / rect.height;
    return {
      x: round2(clampB((fx * 2 - 1) * PLAY_BOUND)),
      y: round2(clampB((1 - fy * 2) * PLAY_BOUND)),
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, target: DragTarget) => {
      e.preventDefault();
      e.stopPropagation();
      setDrag(target);
      const onMove = (ev: PointerEvent) => {
        const c = dataCoords(ev.clientX, ev.clientY);
        if (!c) return;
        if (target.kind === "query") moveQueryRef.current(c);
        else moveKeyRef.current(target.index, c);
      };
      const onUp = () => {
        setDrag(null);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [dataCoords]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, target: DragTarget, current: Vec2) => {
      let dx = 0;
      let dy = 0;
      if (e.key === "ArrowLeft") dx = -KEY_STEP;
      else if (e.key === "ArrowRight") dx = KEY_STEP;
      else if (e.key === "ArrowDown") dy = -KEY_STEP;
      else if (e.key === "ArrowUp") dy = KEY_STEP;
      else return;
      e.preventDefault();
      const next = {
        x: round2(clampB(current.x + dx)),
        y: round2(clampB(current.y + dy)),
      };
      if (target.kind === "query") onMoveQuery(next);
      else onMoveKey(target.index, next);
    },
    [onMoveQuery, onMoveKey]
  );

  const qx = +toPx(query.x).toFixed(2);
  const qy = +toPy(query.y).toFixed(2);
  const ox = +toPx(0).toFixed(2);
  const oy = +toPy(0).toFixed(2);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-6">
      {/* Vector plane */}
      <div>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="w-full rounded-xl border border-[#334155] bg-[#0f172a] select-none"
          style={{ touchAction: "none" }}
          role="group"
          aria-label={`Vector plane with one query vector and ${keys.length} key vectors, all drawn as arrows from the origin. Drag any arrow tip with the pointer, or Tab to it and move it with the arrow keys. Coordinates run from minus ${PLAY_BOUND} to plus ${PLAY_BOUND} on both axes.`}
        >
          {/* Grid */}
          {[-1, -0.5, 0.5, 1].map((g) => (
            <g key={g}>
              <line
                x1={toPx(g).toFixed(2)}
                y1="0"
                x2={toPx(g).toFixed(2)}
                y2={SIZE}
                stroke="#1e293b"
                strokeWidth="1"
              />
              <line
                x1="0"
                y1={toPy(g).toFixed(2)}
                x2={SIZE}
                y2={toPy(g).toFixed(2)}
                stroke="#1e293b"
                strokeWidth="1"
              />
            </g>
          ))}
          {/* Axes */}
          <line x1={ox} y1="0" x2={ox} y2={SIZE} stroke="#334155" strokeWidth="1.5" />
          <line x1="0" y1={oy} x2={SIZE} y2={oy} stroke="#334155" strokeWidth="1.5" />
          {/* Unit circle for scale */}
          <circle
            cx={ox}
            cy={oy}
            r={(toPx(1) - toPx(0)).toFixed(2)}
            fill="none"
            stroke="#334155"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.6"
          />

          {/* Key arrows */}
          {keys.map((k, i) => {
            const st = KEY_STYLES[i];
            const kx = +toPx(k.x).toFixed(2);
            const ky = +toPy(k.y).toFixed(2);
            const id = `key-${i}`;
            const active =
              (drag?.kind === "key" && drag.index === i) || focus === id;
            const label = `${st.label} (${st.shape}), stores value ${PLAY_VALUES[i]}, at x ${k.x.toFixed(2)}, y ${k.y.toFixed(2)}. Current weight ${(100 * result.weights[i]).toFixed(1)} percent. Use arrow keys to move it.`;
            return (
              <g
                key={id}
                tabIndex={0}
                role="button"
                aria-label={label}
                className="focus:outline-none"
                style={{ cursor: active && drag ? "grabbing" : "grab" }}
                onPointerDown={(e) => handlePointerDown(e, { kind: "key", index: i })}
                onKeyDown={(e) => handleKeyDown(e, { kind: "key", index: i }, k)}
                onFocus={() => setFocus(id)}
                onBlur={() => setFocus(null)}
              >
                <line
                  x1={ox}
                  y1={oy}
                  x2={kx}
                  y2={ky}
                  stroke={st.color}
                  strokeWidth="2"
                  opacity="0.8"
                />
                {active && (
                  <circle
                    cx={kx}
                    cy={ky}
                    r="14"
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth="2"
                  />
                )}
                <g fill={st.color} stroke="#0a0e1a" strokeWidth="1.5">
                  {shapePath(st.shape, kx, ky, 8)}
                </g>
                <text
                  x={kx}
                  y={(ky - 14).toFixed(2)}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill={st.color}
                >
                  k{i + 1}
                </text>
                <title>{label}</title>
              </g>
            );
          })}

          {/* Query arrow (gold, on top) */}
          {(() => {
            const active = drag?.kind === "query" || focus === "query";
            const label = `Query vector at x ${query.x.toFixed(2)}, y ${query.y.toFixed(2)}. It scores every key by dot product. Use arrow keys to move it.`;
            return (
              <g
                tabIndex={0}
                role="button"
                aria-label={label}
                className="focus:outline-none"
                style={{ cursor: active && drag ? "grabbing" : "grab" }}
                onPointerDown={(e) => handlePointerDown(e, { kind: "query" })}
                onKeyDown={(e) => handleKeyDown(e, { kind: "query" }, query)}
                onFocus={() => setFocus("query")}
                onBlur={() => setFocus(null)}
              >
                <line
                  x1={ox}
                  y1={oy}
                  x2={qx}
                  y2={qy}
                  stroke="var(--color-accent)"
                  strokeWidth="3"
                />
                {active && (
                  <circle
                    cx={qx}
                    cy={qy}
                    r="15"
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}
                <circle
                  cx={qx}
                  cy={qy}
                  r="9"
                  fill="var(--color-accent)"
                  stroke="#0a0e1a"
                  strokeWidth="2"
                />
                <text
                  x={qx}
                  y={(qy + 4).toFixed(2)}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="800"
                  fill="#0a0e1a"
                >
                  q
                </text>
                <title>{label}</title>
              </g>
            );
          })()}
        </svg>

        <p className="text-[11px] text-[#94a3b8] leading-relaxed mt-2">
          Drag the gold query q or any key tip, or Tab to one and steer it with
          the arrow keys. Similar directions score high; opposite directions
          score negative. The dashed circle marks length 1.
        </p>

        <div className="mt-3">
          <label
            htmlFor="attn-sharpness"
            className="text-[11px] font-semibold text-[#94a3b8] flex items-center justify-between"
          >
            <span>Score sharpness before softmax</span>
            <span className="font-mono text-[var(--color-accent)]">
              x{sharpness.toFixed(2)}
            </span>
          </label>
          <input
            id="attn-sharpness"
            type="range"
            min={PLAY_SHARPNESS_MIN}
            max={PLAY_SHARPNESS_MAX}
            step={0.25}
            value={sharpness}
            onChange={(e) => onSharpness(parseFloat(e.target.value))}
            className="w-full accent-[var(--color-accent)] mt-1"
            aria-label="Score sharpness multiplier applied before the softmax"
          />
          <p className="text-[10px] text-[#475569] leading-relaxed mt-1">
            Scores are multiplied by this before the softmax. Crank it up and
            the soft lookup approaches a hard argmax lookup; the weight entropy
            below shows how peaked the blend is.
          </p>
        </div>
      </div>

      {/* Live computation panel */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide">
          Live: score, softmax, blend
        </p>
        {keys.map((_, i) => {
          const st = KEY_STYLES[i];
          const s = result.scores[i];
          const w = result.weights[i];
          const sFrac = Math.max(0, Math.min(1, Math.abs(s) / SCORE_RANGE));
          return (
            <div key={i} className="rounded-xl border border-[#1e293b] p-3">
              <div className="flex items-center gap-2 mb-2">
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <g fill={st.color}>{shapePath(st.shape, 7, 7, 6)}</g>
                </svg>
                <span className="text-[11px] font-semibold text-white">
                  {st.label}
                </span>
                <span className="text-[10px] font-mono text-[#94a3b8]">
                  stores v{i + 1} = {PLAY_VALUES[i]}
                </span>
                <span
                  className="ml-auto text-[10px] font-mono"
                  style={{ color: result.argmax === i ? "#f1f5f9" : "#475569" }}
                >
                  {result.argmax === i ? "top weight" : ""}
                </span>
              </div>
              {/* Score bar: centered at zero */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] text-[#475569] w-[74px] shrink-0">
                  score q&middot;k{i + 1}
                </span>
                <div className="relative h-2 flex-1 rounded-full bg-[#1e293b] overflow-hidden">
                  <div className="absolute left-1/2 top-0 h-full w-px bg-[#334155]" />
                  <div
                    className="absolute top-0 h-full"
                    style={{
                      background: s >= 0 ? st.color : "#475569",
                      left: s >= 0 ? "50%" : `${(50 - sFrac * 50).toFixed(2)}%`,
                      width: `${(sFrac * 50).toFixed(2)}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono text-[#94a3b8] w-[46px] text-right shrink-0">
                  {s.toFixed(2)}
                </span>
              </div>
              {/* Weight bar */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#475569] w-[74px] shrink-0">
                  weight w{i + 1}
                </span>
                <div className="h-2 flex-1 rounded-full bg-[#1e293b] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      background: "var(--color-accent)",
                      width: `${(100 * w).toFixed(2)}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono text-[var(--color-accent)] w-[46px] text-right shrink-0">
                  {(100 * w).toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}

        {/* Output */}
        <div className="rounded-xl border border-[#334155] bg-[#162032] p-4">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide font-semibold mb-1.5">
            Attention output = weighted blend of values
          </p>
          <p className="font-mono text-[11px] text-[#93c5fd] leading-relaxed break-words">
            {result.weights
              .map((w, i) => `${w.toFixed(3)}×${PLAY_VALUES[i]}`)
              .join(" + ")}
          </p>
          <p className="text-[26px] font-black text-[var(--color-accent)] mt-1">
            {result.output.toFixed(2)}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-[#94a3b8]">
            <span>
              hard argmax lookup would return{" "}
              <span className="font-mono text-white">
                {PLAY_VALUES[result.argmax]}
              </span>{" "}
              ({KEY_STYLES[result.argmax].label.toLowerCase()})
            </span>
            <span>
              weight entropy{" "}
              <span className="font-mono text-white">
                {result.entropy.toFixed(2)}
              </span>{" "}
              bits (2.00 = uniform, 0 = one-hot)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
