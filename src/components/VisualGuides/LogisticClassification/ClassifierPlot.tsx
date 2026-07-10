"use client";

import React, {
  useMemo,
  useRef,
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  LabeledPoint,
  LogisticParams,
  predictClass,
  boundarySegment,
  probGrid,
  heatColor,
  logit,
  HEAT_RES,
  CLASS0_COLOR,
  CLASS1_COLOR,
  DEFAULT_THRESHOLD,
  REFIT_STEPS,
} from "./logisticMath";

const SIZE = 480;
const CELL = SIZE / HEAT_RES;
/** Keyboard step in data units per arrow-key press. */
const KEY_STEP = 0.05;

const toPx = (x: number) => ((x + 1) / 2) * SIZE;
const toPy = (y: number) => SIZE - ((y + 1) / 2) * SIZE;

function clamp1(v: number): number {
  return Math.max(-1, Math.min(1, v));
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

type Props = {
  points: readonly LabeledPoint[];
  params: LogisticParams;
  threshold: number;
  trained: boolean;
  onMovePoint: (id: number, x1: number, x2: number) => void;
};

export default function ClassifierPlot({
  points,
  params,
  threshold,
  trained,
  onMovePoint,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [focusId, setFocusId] = useState<number | null>(null);

  // The window pointermove listener registered at pointer-down outlives many
  // renders; it must call the LATEST onMovePoint (bound to current weights),
  // not the one captured when the drag started, or refits never accumulate.
  const onMovePointRef = useRef(onMovePoint);
  useEffect(() => {
    onMovePointRef.current = onMovePoint;
  }, [onMovePoint]);

  // Heatmap depends only on the weights, not the threshold.
  const heat = useMemo(() => probGrid(params), [params]);

  const seg = boundarySegment(params, threshold);
  const refSeg =
    threshold !== DEFAULT_THRESHOLD
      ? boundarySegment(params, DEFAULT_THRESHOLD)
      : null;

  const dataCoords = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const fx = (clientX - rect.left) / rect.width;
    const fy = (clientY - rect.top) / rect.height;
    return {
      x1: round2(clamp1(fx * 2 - 1)),
      x2: round2(clamp1(1 - fy * 2)),
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, id: number) => {
      e.preventDefault();
      e.stopPropagation();
      setDragId(id);
      const onMove = (ev: PointerEvent) => {
        const c = dataCoords(ev.clientX, ev.clientY);
        if (c) onMovePointRef.current(id, c.x1, c.x2);
      };
      const onUp = () => {
        setDragId(null);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [dataCoords]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, pt: LabeledPoint) => {
      let dx = 0;
      let dy = 0;
      if (e.key === "ArrowLeft") dx = -KEY_STEP;
      else if (e.key === "ArrowRight") dx = KEY_STEP;
      else if (e.key === "ArrowDown") dy = -KEY_STEP;
      else if (e.key === "ArrowUp") dy = KEY_STEP;
      else return;
      e.preventDefault();
      onMovePoint(
        pt.id,
        round2(clamp1(pt.x1 + dx)),
        round2(clamp1(pt.x2 + dy))
      );
    },
    [onMovePoint]
  );

  const boundaryLabel = trained
    ? `${params.w1.toFixed(2)} x1 + ${params.w2.toFixed(2)} x2 + ${params.b.toFixed(2)} = logit(${threshold.toFixed(2)}) = ${logit(threshold).toFixed(2)}`
    : null;

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full rounded-xl border border-[#334155] select-none"
        style={{ touchAction: "none" }}
        role="group"
        aria-label={`Scatter plot of ${points.length} labeled points over the probability heatmap. Each point can be dragged with the pointer or moved with arrow keys after focusing it with Tab. The gold line is the decision boundary at threshold ${threshold.toFixed(2)}.`}
      >
        {/* Probability heatmap */}
        {heat.map((p, idx) => {
          const r = Math.floor(idx / HEAT_RES);
          const c = idx % HEAT_RES;
          return (
            <rect
              key={idx}
              x={c * CELL}
              y={SIZE - (r + 1) * CELL}
              width={CELL + 0.5}
              height={CELL + 0.5}
              fill={heatColor(p)}
            />
          );
        })}

        {/* Axes through the origin */}
        <line
          x1={toPx(-1)}
          y1={toPy(0)}
          x2={toPx(1)}
          y2={toPy(0)}
          stroke="#334155"
          strokeWidth="1"
          opacity="0.6"
        />
        <line
          x1={toPx(0)}
          y1={toPy(-1)}
          x2={toPx(0)}
          y2={toPy(1)}
          stroke="#334155"
          strokeWidth="1"
          opacity="0.6"
        />

        {/* Reference boundary at p = 0.5 when the threshold has moved off it */}
        {refSeg && (
          <line
            x1={toPx(refSeg[0][0]).toFixed(2)}
            y1={toPy(refSeg[0][1]).toFixed(2)}
            x2={toPx(refSeg[1][0]).toFixed(2)}
            y2={toPy(refSeg[1][1]).toFixed(2)}
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="6 5"
            opacity="0.7"
          />
        )}

        {/* Decision boundary at the current threshold */}
        {seg && (
          <line
            x1={toPx(seg[0][0]).toFixed(2)}
            y1={toPy(seg[0][1]).toFixed(2)}
            x2={toPx(seg[1][0]).toFixed(2)}
            y2={toPy(seg[1][1]).toFixed(2)}
            stroke="var(--color-accent)"
            strokeWidth="2.5"
          />
        )}

        {/* Data points: class 0 circles, class 1 diamonds */}
        {points.map((pt) => {
          const px = +toPx(pt.x1).toFixed(2);
          const py = +toPy(pt.x2).toFixed(2);
          const missed =
            trained && predictClass(params, pt.x1, pt.x2, threshold) !== pt.y;
          const active = dragId === pt.id || focusId === pt.id;
          const r = active ? 9 : 7;
          const label = `Class ${pt.y} point at x1 ${pt.x1.toFixed(2)}, x2 ${pt.x2.toFixed(2)}${missed ? ", currently misclassified" : ""}. Use arrow keys to move it.`;
          return (
            <g
              key={pt.id}
              tabIndex={0}
              role="button"
              aria-label={label}
              className="focus:outline-none"
              style={{ cursor: dragId === pt.id ? "grabbing" : "grab" }}
              onPointerDown={(e) => handlePointerDown(e, pt.id)}
              onKeyDown={(e) => handleKeyDown(e, pt)}
              onFocus={() => setFocusId(pt.id)}
              onBlur={() => setFocusId(null)}
            >
              {missed && (
                <circle
                  cx={px}
                  cy={py}
                  r={r + 5}
                  fill="none"
                  stroke="var(--color-warning)"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              )}
              {active && (
                <circle
                  cx={px}
                  cy={py}
                  r={r + 5}
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth="2"
                />
              )}
              {pt.y === 0 ? (
                <circle
                  cx={px}
                  cy={py}
                  r={r}
                  fill={CLASS0_COLOR}
                  stroke="#0a0e1a"
                  strokeWidth="1.5"
                />
              ) : (
                <path
                  d={`M${px} ${(py - r).toFixed(2)} L${(px + r).toFixed(2)} ${py} L${px} ${(py + r).toFixed(2)} L${(px - r).toFixed(2)} ${py} Z`}
                  fill={CLASS1_COLOR}
                  stroke="#0a0e1a"
                  strokeWidth="1.5"
                />
              )}
              <title>{label}</title>
            </g>
          );
        })}
      </svg>

      <div className="flex justify-between text-[10px] text-[#475569] mt-1">
        <span>x1: -1 (left) to +1 (right)</span>
        <span>x2: -1 (bottom) to +1 (top)</span>
      </div>

      {/* Legend: shape plus text, never color alone */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <circle cx="6" cy="6" r="5" fill={CLASS0_COLOR} />
          </svg>
          Class 0 (circle)
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M6 0 L12 6 L6 12 L0 6 Z" fill={CLASS1_COLOR} />
          </svg>
          Class 1 (diamond)
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true">
            <circle
              cx="8"
              cy="6"
              r="5"
              fill="none"
              stroke="var(--color-warning)"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          </svg>
          Dashed ring: misclassified at t = {threshold.toFixed(2)}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true">
            <line
              x1="0"
              y1="6"
              x2="18"
              y2="6"
              stroke="var(--color-accent)"
              strokeWidth="2.5"
            />
          </svg>
          Boundary (p = t)
        </span>
        {refSeg && (
          <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
            <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true">
              <line
                x1="0"
                y1="6"
                x2="18"
                y2="6"
                stroke="#94a3b8"
                strokeWidth="1.5"
                strokeDasharray="6 5"
              />
            </svg>
            p = 0.5 reference
          </span>
        )}
      </div>

      <p className="text-[11px] text-[#94a3b8] leading-relaxed mt-2">
        Drag any point, or Tab to a point and move it with the arrow keys.
        {trained ? (
          <>
            {" "}
            Every move runs {REFIT_STEPS} more gradient descent steps from the
            current weights, so the boundary chases the data live. Boundary
            equation:{" "}
            <span className="font-mono text-[#93c5fd]">{boundaryLabel}</span>
          </>
        ) : (
          <>
            {" "}
            The model is untrained (w1 = w2 = b = 0), so p = 0.5 everywhere,
            the map is flat, and no boundary exists yet. Train it first.
          </>
        )}
      </p>
    </div>
  );
}
