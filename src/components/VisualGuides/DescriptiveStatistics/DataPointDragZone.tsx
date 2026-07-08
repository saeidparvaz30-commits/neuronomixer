"use client";

import React, {
  useRef,
  useCallback,
  useMemo,
  useEffect,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import DistanceVisualization from "./DistanceVisualization";
import type { DataPoint } from "./types";

// ── Layout constants ──────────────────────────────────────────────────────────
const SVG_WIDTH = 800;
const AXIS_Y = 140;            // y of the number line
const DOT_RADIUS = 9;
const DOT_SPACING = 18;        // vertical gap when dots stack
const PADDING_LEFT = 40;
const PADDING_RIGHT = 40;
const MIN_VAL = 0;
const MAX_VAL = 160;
const SNAP = 5;                // snap to nearest $5k

function toX(value: number): number {
  const usable = SVG_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  return PADDING_LEFT + ((value - MIN_VAL) / (MAX_VAL - MIN_VAL)) * usable;
}

function toValue(x: number): number {
  const usable = SVG_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const raw = ((x - PADDING_LEFT) / usable) * (MAX_VAL - MIN_VAL) + MIN_VAL;
  const snapped = Math.round(raw / SNAP) * SNAP;
  return Math.max(MIN_VAL + SNAP, Math.min(MAX_VAL, snapped));
}

/** Compute stacking: dots sharing the same x-bucket stack upward */
function computeYPositions(dataPoints: DataPoint[]): Map<number, number> {
  const buckets: Map<number, number[]> = new Map();
  for (const dp of dataPoints) {
    const bx = toX(dp.value);
    const rounded = Math.round(bx);
    if (!buckets.has(rounded)) buckets.set(rounded, []);
    buckets.get(rounded)!.push(dp.id);
  }
  const yMap = new Map<number, number>();
  for (const [, ids] of buckets) {
    const count = ids.length;
    ids.forEach((id, i) => {
      // stack upward from axisY
      const offset = (count - 1 - i) * DOT_SPACING;
      yMap.set(id, AXIS_Y - DOT_RADIUS - offset);
    });
  }
  return yMap;
}

// ── Axis ticks ────────────────────────────────────────────────────────────────
const AXIS_TICKS: number[] = [];
for (let v = 0; v <= MAX_VAL; v += 20) AXIS_TICKS.push(v);

// ── Tooltip state ─────────────────────────────────────────────────────────────
interface TooltipState {
  id: number;
  value: number;
  x: number;
  y: number;
}

// ── Props ────────────────────────────────────────────────────────────────────
interface DataPointDragZoneProps {
  dataPoints: DataPoint[];
  mean: number;
  median: number;
  showDistanceViz: boolean;
  onPointDragged: (id: number, newValue: number) => void;
  onDragStart: (id: number) => void;
  onReset: () => void;
}

export default function DataPointDragZone({
  dataPoints,
  mean,
  median,
  showDistanceViz,
  onPointDragged,
  onDragStart,
  onReset,
}: DataPointDragZoneProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Dragging held in refs to avoid re-render during drag
  const draggingIdRef = useRef<number | null>(null);
  const [liveValues, setLiveValues] = useState<Map<number, number>>(
    new Map(dataPoints.map((p) => [p.id, p.value]))
  );
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Sync liveValues when external dataPoints change (e.g., reset)
  useEffect(() => {
    setLiveValues(new Map(dataPoints.map((p) => [p.id, p.value])));
  }, [dataPoints]);

  // Build effective data points merging live drag state
  const effectivePoints: DataPoint[] = useMemo(
    () =>
      dataPoints.map((dp) => ({
        ...dp,
        value: liveValues.get(dp.id) ?? dp.value,
      })),
    [dataPoints, liveValues]
  );

  const yPositions = useMemo(
    () => computeYPositions(effectivePoints),
    [effectivePoints]
  );

  // ── SVG coordinate helper ─────────────────────────────────────────────────
  const getSvgX = useCallback((clientX: number): number => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    const scaleX = SVG_WIDTH / rect.width;
    return (clientX - rect.left) * scaleX;
  }, []);

  // ── Mouse / Touch handlers ────────────────────────────────────────────────
  const handleDotMouseDown = useCallback(
    (e: React.MouseEvent, id: number) => {
      e.preventDefault();
      draggingIdRef.current = id;
      onDragStart(id);
    },
    [onDragStart]
  );

  const handleDotTouchStart = useCallback(
    (e: React.TouchEvent, id: number) => {
      e.preventDefault();
      draggingIdRef.current = id;
      onDragStart(id);
    },
    [onDragStart]
  );

  const handleSvgMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const id = draggingIdRef.current;
      if (id === null) return;
      const svgX = getSvgX(e.clientX);
      const newVal = toValue(svgX);
      setLiveValues((prev) => new Map(prev).set(id, newVal));
      // Update tooltip during drag
      const yPos = yPositions.get(id) ?? AXIS_Y - DOT_RADIUS;
      setTooltip({ id, value: newVal, x: toX(newVal), y: yPos });
    },
    [getSvgX, yPositions]
  );

  const handleSvgTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const id = draggingIdRef.current;
      if (id === null) return;
      const touch = e.touches[0];
      if (!touch) return;
      const svgX = getSvgX(touch.clientX);
      const newVal = toValue(svgX);
      setLiveValues((prev) => new Map(prev).set(id, newVal));
    },
    [getSvgX]
  );

  const commitDrag = useCallback(() => {
    const id = draggingIdRef.current;
    if (id === null) return;
    const finalVal = liveValues.get(id);
    if (finalVal !== undefined) {
      onPointDragged(id, finalVal);
    }
    draggingIdRef.current = null;
  }, [liveValues, onPointDragged]);

  // Global mouse/touch up to catch releases outside SVG
  useEffect(() => {
    const onUp = () => commitDrag();
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [commitDrag]);

  // ── Heights ───────────────────────────────────────────────────────────────
  const maxStack = useMemo(() => {
    const buckets: Map<number, number> = new Map();
    for (const dp of effectivePoints) {
      const key = Math.round(toX(dp.value));
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return Math.max(...buckets.values(), 1);
  }, [effectivePoints]);

  const svgHeight = AXIS_Y + 60 + Math.max(0, (maxStack - 1)) * DOT_SPACING;

  const meanX = toX(mean);
  const medianX = toX(median);

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <div className="min-w-[360px]">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SVG_WIDTH} ${svgHeight}`}
            className="w-full h-auto select-none touch-none"
            onMouseMove={handleSvgMouseMove}
            onTouchMove={handleSvgTouchMove}
            onMouseLeave={() => {
              commitDrag();
              setTooltip(null);
            }}
          >
            {/* ── Gridlines ─────────────────────────────────────────────── */}
            {AXIS_TICKS.map((t) => (
              <line
                key={t}
                x1={toX(t)}
                y1={8}
                x2={toX(t)}
                y2={AXIS_Y}
                stroke="#1e293b"
                strokeWidth={1}
              />
            ))}

            {/* ── Axis line ─────────────────────────────────────────────── */}
            <line
              x1={PADDING_LEFT}
              y1={AXIS_Y}
              x2={SVG_WIDTH - PADDING_RIGHT}
              y2={AXIS_Y}
              stroke="#475569"
              strokeWidth={1.5}
            />

            {/* ── Axis ticks + labels ────────────────────────────────────── */}
            {AXIS_TICKS.map((t) => (
              <g key={t}>
                <line
                  x1={toX(t)}
                  y1={AXIS_Y}
                  x2={toX(t)}
                  y2={AXIS_Y + 5}
                  stroke="#475569"
                  strokeWidth={1}
                />
                <text
                  x={toX(t)}
                  y={AXIS_Y + 17}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#475569"
                  fontFamily="monospace"
                >
                  {t}
                </text>
              </g>
            ))}

            {/* Axis label */}
            <text
              x={SVG_WIDTH / 2}
              y={AXIS_Y + 32}
              textAnchor="middle"
              fontSize={10}
              fill="#475569"
            >
              Salary ($k)
            </text>

            {/* ── Mean line ─────────────────────────────────────────────── */}
            <line
              x1={meanX}
              y1={8}
              x2={meanX}
              y2={AXIS_Y}
              stroke="#3b82f6"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={0.8}
            />
            <text
              x={meanX}
              y={5}
              textAnchor="middle"
              fontSize={9}
              fill="#3b82f6"
              fontFamily="monospace"
            >
              μ
            </text>

            {/* ── Median line ───────────────────────────────────────────── */}
            <line
              x1={medianX}
              y1={8}
              x2={medianX}
              y2={AXIS_Y}
              stroke="#3bb4a4"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={0.8}
            />
            <text
              x={medianX}
              y={5}
              textAnchor="middle"
              fontSize={9}
              fill="#3bb4a4"
              fontFamily="monospace"
            >
              M
            </text>

            {/* ── Distance visualization lines ──────────────────────────── */}
            <AnimatePresence>
              {showDistanceViz && (
                <DistanceVisualization
                  visible={showDistanceViz}
                  dataPoints={effectivePoints}
                  mean={mean}
                  xScale={toX}
                  dotYPositions={yPositions}
                  axisY={AXIS_Y}
                />
              )}
            </AnimatePresence>

            {/* ── Data point dots ───────────────────────────────────────── */}
            {effectivePoints.map((dp) => {
              const cx = toX(dp.value);
              const cy = yPositions.get(dp.id) ?? AXIS_Y - DOT_RADIUS;
              const isDragging = draggingIdRef.current === dp.id;

              return (
                <g
                  key={dp.id}
                  style={{ cursor: isDragging ? "grabbing" : "grab" }}
                  onMouseDown={(e) => handleDotMouseDown(e, dp.id)}
                  onTouchStart={(e) => handleDotTouchStart(e, dp.id)}
                  onMouseEnter={() =>
                    setTooltip({ id: dp.id, value: dp.value, x: cx, y: cy })
                  }
                  onMouseLeave={() =>
                    setTooltip((prev) =>
                      prev?.id === dp.id ? null : prev
                    )
                  }
                >
                  {/* Outer glow ring on hover/drag */}
                  {(tooltip?.id === dp.id || isDragging) && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={DOT_RADIUS + 4}
                      fill="none"
                      stroke="var(--color-accent)"
                      strokeWidth={1.5}
                      opacity={0.4}
                    />
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isDragging ? DOT_RADIUS + 2 : DOT_RADIUS}
                    fill={isDragging ? "var(--color-accent)" : "#3bb4a4"}
                    stroke={isDragging ? "var(--color-warning)" : "#1e293b"}
                    strokeWidth={1.5}
                    style={{ transition: isDragging ? "none" : "r 0.15s" }}
                  />
                  {/* Vertical connector to axis */}
                  <line
                    x1={cx}
                    y1={cy + DOT_RADIUS}
                    x2={cx}
                    y2={AXIS_Y}
                    stroke="#1e293b"
                    strokeWidth={1}
                  />
                </g>
              );
            })}

            {/* ── Tooltip ───────────────────────────────────────────────── */}
            {tooltip && (
              <g>
                <rect
                  x={Math.min(toX(tooltip.value) - 22, SVG_WIDTH - 60)}
                  y={tooltip.y - DOT_RADIUS - 26}
                  width={44}
                  height={20}
                  rx={4}
                  fill="#0f172a"
                  stroke="var(--color-accent)"
                  strokeWidth={1}
                  opacity={0.95}
                />
                <text
                  x={Math.min(toX(tooltip.value), SVG_WIDTH - 38)}
                  y={tooltip.y - DOT_RADIUS - 12}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--color-accent)"
                  fontFamily="monospace"
                >
                  ${tooltip.value}k
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* Legend + reset */}
      <div className="mt-3 flex items-center flex-wrap gap-4 justify-between">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-px bg-[#3b82f6]" style={{ borderTop: "1.5px dashed #3b82f6" }} />
            <span className="text-[10px] text-[#3b82f6]">Mean (μ)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-px" style={{ borderTop: "1.5px dashed #3bb4a4" }} />
            <span className="text-[10px] text-[#3bb4a4]">Median (M)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#3bb4a4]" />
            <span className="text-[10px] text-[#94a3b8]">Drag to move</span>
          </div>
        </div>
        <button
          onClick={onReset}
          className="px-4 py-1.5 rounded-xl text-[12px] font-semibold border border-[#1e293b] text-[#94a3b8] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
        >
          Reset to Original Data
        </button>
      </div>
    </div>
  );
}
